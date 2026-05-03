import json
import logging
import requests

from decimal import Decimal

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .helpers import es_valor_nulo, get_empleado_desde_header, get_empleado_verificado
from ..services import aplicar_reglas_negocio,calcular_preview_happy_hours
from ..models import (
    Orden, DetalleOrden, DetalleOrdenOpcion, Pago,
    Producto, OpcionVariacion, Cliente, SolicitudCambio, SesionCaja, RegistroAuditoria, Sede
)
from ..serializers import OrdenSerializer, DetalleOrdenSerializer, PagoSerializer
from django.db.models import Sum
logger = logging.getLogger(__name__)


def _procesar_opciones(opciones_ids_raw, variaciones_dict):
    """
    Helper interno: dado el dict de variaciones y la lista de ids planos,
    devuelve (lista_de_OpcionVariacion, subtotal_Decimal).
    Soporta tanto IDs numéricos como objetos {'id': N} que manda el bot.
    """
    opciones_ids = list(opciones_ids_raw)

    for grupo_id, ids in variaciones_dict.items():
        if isinstance(ids, list):
            opciones_ids.extend(ids)

    subtotal = Decimal('0.00')
    opciones_a_guardar = []

    for opc_raw in opciones_ids:
        opc_id = opc_raw.get('id') if isinstance(opc_raw, dict) else opc_raw
        if opc_id is not None:
            try:
                opcion = OpcionVariacion.objects.get(id=opc_id)
                subtotal += opcion.precio_adicional
                opciones_a_guardar.append(opcion)
            except OpcionVariacion.DoesNotExist:
                pass

    return opciones_a_guardar, subtotal


# ============================================================
# ORDEN
# ============================================================

class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_queryset(self):
        queryset = Orden.objects.prefetch_related(
            'detalles__producto', 'detalles__opciones_seleccionadas'
        ).all()

        # ============================================================
        # 🛡️ IDOR FIX: Acotar SIEMPRE al negocio del usuario autenticado
        # Esto garantiza que ningún query param ni header pueda cruzar
        # la frontera entre negocios.
        # ============================================================
        if self.request.user.is_superuser:
            pass  # Superusuario ve todo
        elif hasattr(self.request.user, 'negocio'):
            queryset = queryset.filter(sede__negocio=self.request.user.negocio)
        else:
            return queryset.none()

        empleado = get_empleado_desde_header(self.request)
        sede_id_filtrar = None
        modo = self.request.query_params.get('modo')

        if empleado:
            sede_id_filtrar = empleado.sede_id
        else:
            sede_id_raw = self.request.query_params.get('sede_id')
            if not es_valor_nulo(sede_id_raw):
                sede_id_filtrar = sede_id_raw

        # ============================================================
        # 🔧 FIX: modo dashboard tiene su propia rama con filtro de fecha
        # ============================================================
        if modo == 'dashboard':
            # Traemos los últimos 35 días para que el frontend pueda
            # mostrar "Hoy", "Ayer", "Esta Semana" y "Este Mes" completo
            hace_35_dias = timezone.now() - timezone.timedelta(days=35)

            queryset = queryset.filter(
                estado_pago='pagado',
                creado_en__gte=hace_35_dias
            ).exclude(estado='cancelado').order_by('-creado_en')

            if sede_id_filtrar:
                queryset = queryset.filter(sede_id=sede_id_filtrar)

        # ============================================================
        # Modo POS normal
        # ============================================================
        else:
            if sede_id_filtrar:
                hoy = timezone.now().date()
                queryset = queryset.filter(
                    sede_id=sede_id_filtrar
                ).exclude(estado='cancelado').filter(
                    models.Q(estado_pago='pendiente') | models.Q(creado_en__date=hoy)
                ).order_by('-creado_en')
            else:
                queryset = queryset.order_by('-creado_en')

        return queryset

    def perform_create(self, serializer):
        empleado = get_empleado_desde_header(self.request)
        sede_id_solicitada = self.request.data.get('sede')

        # ─────────────────────────────────────────────────────────────────
        # 🛡️ VALIDACIÓN DE SEDE: el localStorage del cliente no es fuente
        # de verdad — el backend debe confirmar que la sede pertenece al
        # negocio del usuario autenticado antes de crear cualquier orden.
        # ─────────────────────────────────────────────────────────────────
        if empleado:
            # Caso empleado: forzar la sede real del empleado sin importar
            # lo que venga en el cuerpo del request.
            sede_id_validada = empleado.sede_id
        elif hasattr(self.request.user, 'negocio'):
            # Caso dueño: verificar que la sede pedida le pertenezca.
            if not sede_id_solicitada:
                from rest_framework.exceptions import ValidationError as DRFValidationError
                raise DRFValidationError({'sede': 'Debes indicar una sede para la orden.'})
            if not Sede.objects.filter(
                id=sede_id_solicitada,
                negocio=self.request.user.negocio
            ).exists():
                from rest_framework.exceptions import ValidationError as DRFValidationError
                raise DRFValidationError({'sede': 'La sede indicada no pertenece a tu negocio.'})
            sede_id_validada = sede_id_solicitada
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No tienes permiso para crear órdenes.')

        with transaction.atomic():
            orden = serializer.save(mesero=empleado, sede_id=sede_id_validada)
            detalles_data = self.request.data.get('detalles', [])
            nuevo_total = Decimal('0.00')

            for d in detalles_data:
                producto = Producto.objects.get(id=d['producto'])
                # ── Validación de disponibilidad ──────────────────────────
                if not producto.disponible:
                    return Response(
                        {'error': f'"{producto.nombre}" está agotado y no puede agregarse.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                precio_seguro = producto.precio_base

                notas = d.get('notas_y_modificadores', {})
                if isinstance(notas, str):
                    try:
                        notas = json.loads(notas) if notas.strip() else {}
                    except Exception:
                        notas = {}

                variaciones_dict = notas.get('variaciones', {})
                opciones_ids_raw = d.get('opciones', [])
                opciones_a_guardar, subtotal_opciones = _procesar_opciones(opciones_ids_raw, variaciones_dict)

                precio_final_unitario = precio_seguro + subtotal_opciones

                detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto=producto,
                    cantidad=d['cantidad'],
                    precio_unitario=precio_final_unitario,
                    notas_y_modificadores=notas,
                    notas_cocina=d.get('notas_cocina', '')
                )

                for opcion in opciones_a_guardar:
                    DetalleOrdenOpcion.objects.create(
                        detalle_orden=detalle,
                        opcion_variacion=opcion,
                        precio_adicional_aplicado=opcion.precio_adicional
                    )

                nuevo_total += precio_final_unitario * int(d['cantidad'])

            aplicar_reglas_negocio(orden)
            orden.save()

        orden_data = self.get_serializer(orden).data
        channel_layer = get_channel_layer()

        async_to_sync(channel_layer.group_send)(
            f"cocina_sede_{orden.sede_id}",
            {"type": "orden_nueva", "orden": orden_data}
        )
        if orden.mesa_id:
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {"type": "mesa_actualizada", "mesa_id": orden.mesa_id, "estado": "ocupada", "total": float(orden.total)}
            )
        if orden.tipo == 'llevar':
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {"type": "orden_llevar_actualizada", "accion": "nueva", "orden": orden_data}
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        channel_layer = get_channel_layer()
        estados_libres = {'completado', 'cancelado'}

        if instance.estado in estados_libres or instance.estado_pago == 'pagado':
            if instance.mesa_id:
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{instance.sede_id}",
                    {"type": "mesa_actualizada", "mesa_id": instance.mesa_id, "estado": "libre", "total": 0}
                )
            if instance.tipo == 'llevar':
                orden_data = self.get_serializer(instance).data
                accion = 'completada' if instance.estado in estados_libres or instance.estado_pago == 'pagado' else 'actualizada'
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{instance.sede_id}",
                    {"type": "orden_llevar_actualizada", "accion": accion, "orden": orden_data}
                )

    @action(detail=True, methods=['post'])
    def agregar_productos(self, request, pk=None):
        orden = self.get_object()

        if orden.estado == 'cancelado' or orden.estado_pago == 'pagado':
            return Response(
                {'error': 'No se pueden agregar productos a una orden cerrada o pagada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalles_data = request.data.get('detalles', [])
        detalles_creados = []

        with transaction.atomic():
            for detalle_data in detalles_data:
                producto = Producto.objects.get(id=detalle_data['producto'])
                precio_seguro = producto.precio_base
                
                notas = detalle_data.get('notas_y_modificadores', {})
                if isinstance(notas, str):
                    try:
                        notas = json.loads(notas) if notas.strip() else {}
                    except Exception:
                        notas = {}

                variaciones_dict = notas.get('variaciones', {})
                opciones_ids_raw = detalle_data.get('opciones_seleccionadas', [])
                opciones_a_guardar, subtotal_opciones = _procesar_opciones(opciones_ids_raw, variaciones_dict)

                precio_final_unitario = precio_seguro + subtotal_opciones

                nuevo_detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto=producto,
                    cantidad=detalle_data['cantidad'],
                    precio_unitario=precio_final_unitario,
                    notas_y_modificadores=notas,
                    notas_cocina=detalle_data.get('notas_cocina', '')
                )
                detalles_creados.append(nuevo_detalle)

                for opcion in opciones_a_guardar:
                    DetalleOrdenOpcion.objects.create(
                        detalle_orden=nuevo_detalle,
                        opcion_variacion=opcion,
                        precio_adicional_aplicado=opcion.precio_adicional
                    )

            aplicar_reglas_negocio(orden)
            orden.save()

        nuevos_detalles_json = DetalleOrdenSerializer(detalles_creados, many=True).data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"cocina_sede_{orden.sede_id}",
            {
                "type": "orden_nueva",
                "orden": {
                    "id": orden.id,
                    "es_actualizacion": True,
                    "mesa": f"{orden.mesa.numero_o_nombre} (AGREGADO)" if orden.mesa else "LLEVAR (AGREGADO)",
                    "detalles": nuevos_detalles_json
                }
            }
        )

        orden_fresca = Orden.objects.prefetch_related(
            'detalles__producto', 'detalles__opciones_seleccionadas'
        ).get(id=orden.id)

        if orden.mesa_id:
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {"type": "mesa_actualizada", "mesa_id": orden.mesa_id, "estado": "ocupada", "total": float(orden_fresca.total)}
            )

        return Response({
            'status': 'Productos agregados correctamente',
            'orden': self.get_serializer(orden_fresca).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def anular_item(self, request, pk=None):
        orden = self.get_object()
        detalle_id = request.data.get('detalle_id')
        motivo = request.data.get('motivo', 'No especificado')

        empleado = get_empleado_desde_header(request)
        empleado_nombre = empleado.nombre if empleado else request.user.username or 'Admin'

        try:
            with transaction.atomic():
                detalle = orden.detalles.get(id=detalle_id)
                nombre_plato = detalle.producto.nombre

                RegistroAuditoria.objects.create(
                    sede=orden.sede,
                    empleado_nombre=empleado_nombre,
                    accion='anular_plato',
                    descripcion=f"Anuló {detalle.cantidad}x {nombre_plato} de Orden #{orden.id}. Motivo: {motivo}"
                )

                detalle.delete()

                aplicar_reglas_negocio(orden)
                orden.save()

            orden_fresca = Orden.objects.prefetch_related(
                'detalles__producto', 'detalles__opciones_seleccionadas'
            ).get(id=orden.id)
            return Response({
                'status': 'Plato anulado y auditado',
                'orden': self.get_serializer(orden_fresca).data
            }, status=status.HTTP_200_OK)

        except DetalleOrden.DoesNotExist:
            return Response({'error': 'El plato no existe'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cobrar_orden(self, request, pk=None):
        """
        EL ENDPOINT DEFINITIVO DE COBRO Y CRM
        Recibe los pagos y el WhatsApp del cliente para fidelización.
        """
        # 🛡️ RBAC: verificar que el empleado tiene permiso para cobrar
        empleado_rbac = get_empleado_verificado(request)
        if empleado_rbac and (not empleado_rbac.rol or not empleado_rbac.rol.puede_cobrar):
            return Response(
                {'error': 'Tu rol no tiene permiso para cobrar órdenes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        orden = self.get_object()

        pagos_data = request.data.get('pagos', [])
        telefono_crm = request.data.get('telefono', '').strip()
        sesion_caja_id = request.data.get('sesion_caja_id')

        if orden.estado_pago == 'pagado':
            return Response({'error': 'Esta orden ya fue pagada anteriormente.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                sesion_caja = SesionCaja.objects.get(id=sesion_caja_id) if sesion_caja_id else None
                total_pagado_ahora = Decimal('0.00')

                # 1. REGISTRAR LOS PAGOS
                for p in pagos_data:
                    monto_pago = Decimal(str(p.get('monto', '0.00')))
                    if monto_pago > 0:
                        Pago.objects.create(
                            orden=orden,
                            metodo=p.get('metodo', 'efectivo'),
                            monto=monto_pago,
                            sesion_caja=sesion_caja
                        )
                        total_pagado_ahora += monto_pago

                # Re-aplicar reglas con el método de pago real (activa descuento_yape_efectivo si aplica)
                metodo_dominante = max(pagos_data, key=lambda p: float(p.get('monto', 0)), default={}).get('metodo', '') if pagos_data else ''
                aplicar_reglas_negocio(orden, metodo_pago=metodo_dominante)
                orden.save()

                # pagos_historicos ya incluye los registros creados en esta misma
                # transacción, así que es suficiente para saber el total cubierto.
                total_cubierto = Pago.objects.filter(orden=orden).aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')

                # 2. ACTUALIZAR ESTADO DE LA ORDEN
                if total_cubierto >= orden.total:
                    orden.estado_pago = 'pagado'
                    if orden.estado != 'cancelado':
                        orden.estado = 'completado'

                # 3. 🧠 CRM
                if orden.sede.negocio.mod_clientes_activo:
                    if telefono_crm and len(telefono_crm) >= 9:
                        orden.cliente_telefono = telefono_crm

                        cliente, creado = Cliente.objects.get_or_create(
                            negocio=orden.sede.negocio,
                            telefono=telefono_crm,
                            defaults={'nombre': orden.cliente_nombre or 'Cliente POS'}
                        )

                        cliente.cantidad_pedidos += 1
                        cliente.total_gastado = Decimal(str(cliente.total_gastado)) + Decimal(str(orden.total))
                        cliente.ultima_compra = timezone.now()

                        puntos_ganados = int(Decimal(str(orden.total)) // 10)
                        cliente.puntos_acumulados += puntos_ganados

                        tags_actuales = cliente.tags if isinstance(cliente.tags, list) else []

                        if cliente.total_gastado >= Decimal('500.00') and "VIP" not in tags_actuales:
                            tags_actuales.append("VIP")

                        if creado and "Nuevo" not in tags_actuales:
                            tags_actuales.append("Nuevo")
                        elif not creado and "Nuevo" in tags_actuales:
                            tags_actuales.remove("Nuevo")

                        cliente.tags = tags_actuales
                        cliente.save()

                orden.save()

            # 4. WEBSOCKETS
            channel_layer = get_channel_layer()
            if orden.mesa_id and orden.estado_pago == 'pagado':
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{orden.sede_id}",
                    {"type": "mesa_actualizada", "mesa_id": orden.mesa_id, "estado": "libre", "total": 0}
                )

            return Response({
                'status': 'Cobro exitoso',
                'total_pagado': float(total_cubierto),
                'crm_actualizado': bool(telefono_crm)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error procesando cobro de orden {orden.id}: {str(e)}", exc_info=True)
            return Response({'error': 'Error interno al procesar el pago.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def preview_cobro(self, request, pk=None):
        orden = self.get_object()
        metodo_pago = request.data.get('metodo', '')
        aplicar_reglas_negocio(orden, metodo_pago=metodo_pago)
        lineas_hh = calcular_preview_happy_hours(orden)
        return Response({
            'subtotal':        float(orden.subtotal),
            'descuento_total': float(orden.descuento_total),
            'recargo_total':   float(orden.recargo_total),
            'total':           float(orden.total),
            'metodo':          metodo_pago,
            'lineas_happy_hour': lineas_hh,  # 👈 nuevo
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def estado_orden_bot(self, request):
        """
        Endpoint consumido por n8n para que el bot consulte el estado 
        del pedido actual de un cliente vía WhatsApp.
        """
        sede_id = request.query_params.get('sede_id')
        telefono = request.query_params.get('telefono')

        if not sede_id or not telefono:
            return Response({"error": "Se requiere sede_id y telefono."}, status=400)

        try:
            orden = Orden.objects.prefetch_related(
                'detalles__producto', 'detalles__opciones_seleccionadas'
            ).filter(
                sede_id=sede_id,
                cliente_telefono=telefono
            ).exclude(
                estado__in=['cancelado', 'completado']
            ).order_by('-creado_en').first()

            if not orden:
                return Response({'orden': None})
                
            return Response({'orden': self.get_serializer(orden).data})
            
        except Exception as e:
            logger.error("Error en estado_orden_bot para sede %s telefono %s", sede_id, telefono, exc_info=True)
            return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def modificar_desde_bot(self, request, pk=None):
        """
        Paso 1: El bot (n8n) llama a este endpoint cuando el cliente pide un cambio.
        """
        try:
            orden = Orden.objects.get(id=pk)
        except Orden.DoesNotExist:
            return Response({"error": f"La orden {pk} no existe."}, status=404)
            
        accion = request.data.get('accion')
        datos = request.data.get('datos', {})

        if orden.estado in ['listo', 'completado']:
            return Response({
                "status": "rechazado",
                "mensaje": "¡Uf! Casi. Pero tu pedido ya salió de la cocina o fue entregado. Ya no puedo modificarlo. 🛵"
            }, status=status.HTTP_400_BAD_REQUEST)

        if orden.estado == 'pendiente':
            with transaction.atomic():
                if accion == 'cancelar':
                    orden.estado = 'cancelado'
                    orden.motivo_cancelacion = "Cancelado por el cliente vía WhatsApp"
                    orden.save()
                    return Response({"status": "aprobado", "mensaje": "Pedido cancelado con éxito. ¡No hay problema! 👍"})

                elif accion == 'nota':
                    nota_nueva = datos.get('nota', '')
                    orden.notas_cocina = f"{orden.notas_cocina or ''} | BOT: {nota_nueva}"
                    orden.save()
                    return Response({"status": "aprobado", "mensaje": "¡Anotado! Ya le pasé el dato a la cocina. 📝"})

        if orden.estado == 'preparando':
            solicitud = SolicitudCambio.objects.create(
                orden=orden,
                tipo_accion=accion,
                detalles_json=datos
            )

            channel_layer = get_channel_layer()
            alerta = {
                "type": "solicitud_cambio_nueva",
                "solicitud_id": solicitud.id,
                "orden_id": orden.id,
                "mesa": orden.mesa.numero_o_nombre if orden.mesa else "Delivery",
                "accion": accion,
                "descripcion": f"El cliente quiere {accion}: {datos.get('nota', 'Sin detalles')}"
            }
            async_to_sync(channel_layer.group_send)(f"cocina_sede_{orden.sede_id}", alerta)
            async_to_sync(channel_layer.group_send)(f"salon_sede_{orden.sede_id}", alerta)

            return Response({
                "status": "en_revision",
                "mensaje": "Tu pedido ya se está preparando. 👨‍🍳 He enviado una alerta a la cocina para ver si aún llegamos a tiempo. ¡Dame un momento!"
            })

        return Response({"status": "error", "mensaje": "Acción no reconocida."}, status=400)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def resolver_solicitud_bot(self, request, pk=None):
        """
        Paso 2: El humano (desde React) aprueba o rechaza, y Django avisa al cliente por WS.
        """
        try:
            orden = Orden.objects.get(id=pk)
            solicitud_id = request.data.get('solicitud_id')
            decision = request.data.get('decision')
            
            solicitud = SolicitudCambio.objects.get(id=solicitud_id, orden=orden, estado='pendiente')
        except (Orden.DoesNotExist, SolicitudCambio.DoesNotExist):
            return Response({"error": "La orden o solicitud no existe."}, status=404)

        mensaje_whatsapp = ""

        with transaction.atomic():
            if decision == 'aprobar':
                solicitud.estado = 'aprobada'

                if solicitud.tipo_accion == 'cancelar':
                    orden.estado = 'cancelado'
                    orden.motivo_cancelacion = "Cancelado por solicitud del bot (Aprobado por staff)"
                    mensaje_whatsapp = "✅ ¡Listo! El encargado aprobó tu solicitud y hemos anulado el pedido. ¿Te puedo ayudar con algo más?"

                elif solicitud.tipo_accion == 'nota':
                    nota_extra = solicitud.detalles_json.get('nota', '')
                    orden.notas_cocina = f"{orden.notas_cocina or ''} | MODIFICACIÓN: {nota_extra}"
                    mensaje_whatsapp = "✅ ¡Anotado! La cocina confirmó que prepararán tu pedido con esa indicación especial."

                orden.save()
            else:
                solicitud.estado = 'rechazada'
                mensaje_whatsapp = "❌ Lo siento mucho, consulté con la cocina pero tu pedido ya está en la parrilla 🥩 y no podemos modificarlo en este punto."

            solicitud.save()

        if orden.sede.whatsapp_instancia and orden.cliente_telefono:
            numero_limpio = str(orden.cliente_telefono).strip()
            if not numero_limpio.startswith('51'):
                numero_limpio = f"51{numero_limpio}"

            url = f"{settings.EVO_API_URL}/message/sendText/{orden.sede.whatsapp_instancia}"
            headers = {"apikey": settings.EVO_GLOBAL_KEY, "Content-Type": "application/json"}
            
            payload = {
                "number": numero_limpio,
                "options": {"delay": 1200, "presence": "composing"},
                "text": mensaje_whatsapp
            }

            try:
                response = requests.post(url, json=payload, headers=headers, timeout=5)                
                if response.status_code != 201 and response.status_code != 200:
                    logger.error(f"Error de Evolution API: {response.text}")
            except Exception as e:
                logger.error(f"Error enviando mensaje Evo: {e}")

        return Response({"status": "resuelto", "decision": decision})


# ============================================================
# DETALLE ORDEN
# ============================================================

class DetalleOrdenViewSet(viewsets.ModelViewSet):
    serializer_class = DetalleOrdenSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return DetalleOrden.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return DetalleOrden.objects.filter(orden__sede__negocio=self.request.user.negocio)
        return DetalleOrden.objects.none()


# ============================================================
# PAGO
# ============================================================

class PagoViewSet(viewsets.ModelViewSet):
    serializer_class = PagoSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Pago.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Pago.objects.filter(orden__sede__negocio=self.request.user.negocio)
        return Pago.objects.none()