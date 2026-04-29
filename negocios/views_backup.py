import math

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from django.db import transaction
import json
import time
from rest_framework_simplejwt.authentication import JWTAuthentication
import requests
from django.conf import settings
from decimal import Decimal
from django.db.models import F
import logging
import uuid
from rest_framework.exceptions import ValidationError
from django.db.models import Sum
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action, permission_classes, api_view, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from .permissions import EsDuenioOsoloLectura
from .models import (
    GrupoVariacion, InsumoBase, InsumoSede, Negocio, ReglaNegocio, Sede, Mesa, Producto,
    Orden, DetalleOrden, Pago, ModificadorRapido, DetalleOrdenOpcion,
    OpcionVariacion, MovimientoCaja, RecetaDetalle, Rol, Empleado,
    SesionCaja, Categoria, RecetaOpcion, RegistroAuditoria,Cliente, SolicitudCambio, ZonaDelivery
)
from .serializers import (
    InsumoBaseSerializer, InsumoSedeSerializer, NegocioSerializer, ReglaNegocioSerializer, SedeSerializer,
    MesaSerializer, ProductoSerializer, ModificadorRapidoSerializer,
    GrupoVariacionSerializer, OpcionVariacionSerializer, OrdenSerializer,
    DetalleOrdenSerializer, PagoSerializer, RolSerializer, EmpleadoSerializer,
    SesionCajaSerializer, CategoriaSerializer, RecetaOpcionSerializer, ClienteSerializer, ZonaDeliverySerializer
)

logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def es_valor_nulo(valor):
    """Devuelve True si el valor es None, vacío, 'null' o 'undefined'."""
    return not valor or str(valor).lower() in ['null', 'undefined', '']


def get_empleado_desde_header(request):
    """
    Retorna el Empleado desde el header X-Empleado-Id, o None si no existe.

    🛡️ FIX #5: Este helper solo se usa para CONTEXTO (ej: filtrar por sede).
    NUNCA debe usarse para conceder permisos de escritura elevados.
    Los permisos de escritura se validan contra request.user (el JWT).
    """
    empleado_id = request.headers.get('X-Empleado-Id')
    if empleado_id:
        try:
            return Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return None
    return None


def get_empleado_verificado(request):
    """
    🛡️ FIX #5: Versión segura para operaciones sensibles.
    Retorna el Empleado SOLO si el empleado_id del header pertenece
    al mismo negocio que el usuario autenticado en el JWT.
    Evita que un empleado forje el header con el ID de otro negocio.
    """
    empleado_id = request.headers.get('X-Empleado-Id')
    if not empleado_id:
        return None
    try:
        empleado = Empleado.objects.select_related('sede__negocio', 'rol').get(id=empleado_id)
        # Verificamos que el empleado pertenece al negocio del JWT
        if hasattr(request.user, 'negocio') and empleado.negocio != request.user.negocio:
            return None
        return empleado
    except Empleado.DoesNotExist:
        return None


# ============================================================
# NEGOCIO
# ============================================================

class NegocioViewSet(viewsets.ModelViewSet):
    serializer_class = NegocioSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Negocio.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Negocio.objects.filter(propietario=self.request.user)
        return Negocio.objects.none()


# ============================================================
# SEDE
# ============================================================

class SedeViewSet(viewsets.ModelViewSet):
    serializer_class = SedeSerializer
 
    def get_queryset(self):
        if self.request.user.is_superuser:
            return Sede.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Sede.objects.filter(negocio=self.request.user.negocio)
        return Sede.objects.none()
 
    def perform_create(self, serializer):
        negocio = self.request.user.negocio
 
        # 1. Contamos las sedes activas
        cantidad_actual = Sede.objects.filter(negocio=negocio, activo=True).count()
 
        # 2. Verificamos el plan (Si por error no tiene plan, el límite es 1)
        limite = negocio.plan.max_sedes if negocio.plan else 1
 
        # 3. La regla matemática inquebrantable
        if cantidad_actual >= limite:
            raise ValidationError({
                "detail": f"¡Límite alcanzado! Tu plan actual permite un máximo de {limite} sedes. Contáctanos para subir de plan."
            })
 
        # 4. Si pasa, la guardamos forzando a que pertenezca al negocio del usuario
        serializer.save(negocio=negocio)
 
    # ==========================================
    # ✨ ENDPOINT PARA N8N (público, sin auth)
    # ==========================================
    @action(detail=False, methods=['get'], url_path='info_bot', permission_classes=[AllowAny])
    def info_bot(self, request):
        instancia = request.query_params.get('instancia')
 
        if not instancia:
            return Response({'error': 'Falta el parámetro instancia'}, status=400)
 
        sede = Sede.objects.filter(whatsapp_instancia=instancia).first()
 
        if not sede:
            return Response({'error': 'Instancia no registrada en ninguna Sede'}, status=404)
 
        return Response({
            'sede_id': sede.id,
            'negocio_id': sede.negocio.id,
            'nombre_sede': sede.nombre,
            'nombre_negocio': sede.negocio.nombre
        })
 
    # ==========================================
    # 🤖 CONTROLES DE EVOLUTION API
    # ==========================================
 
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def crear_instancia_whatsapp(self, request, pk=None):
        sede = self.get_object()
        nombre_instancia = f"brava_{sede.negocio.id}_sede_{sede.id}"

        headers = {
            "apikey": settings.EVO_GLOBAL_KEY,
            "Content-Type": "application/json"
        }

        # 💀 PASO 0: MATAR AL ZOMBIE 
        url_logout = f"{settings.EVO_API_URL}/instance/logout/{nombre_instancia}"
        url_borrar = f"{settings.EVO_API_URL}/instance/delete/{nombre_instancia}"
        try:
            requests.delete(url_logout, headers=headers, timeout=5)
            time.sleep(1)
            requests.delete(url_borrar, headers=headers, timeout=5)
            time.sleep(1)
        except Exception:
            pass

        # --- PASO 1: CREAR LA INSTANCIA LIMPIA ---
        url_crear = f"{settings.EVO_API_URL}/instance/create"
        payload_crear = {
            "instanceName": nombre_instancia,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
            "syncFullHistory": False,    # 👈 NO descargar todo el pasado
            "readMessages": True
        }

        try:
            res_crear = requests.post(url_crear, json=payload_crear, headers=headers)

            if res_crear.status_code in [200, 201]:
                data = res_crear.json()
                qr_base64 = data.get('qrcode', {}).get('base64')

                # --- PASO 2: CONFIGURAR EL WEBHOOK INMEDIATAMENTE ---
                # Lo hacemos ANTES de que el usuario escanee el QR
                url_webhook_n8n = f"https://silvadata.me/n8n/webhook/9b66058c-df85-41ce-aeac-1e6a15414914?instancia={nombre_instancia}"
                
                url_set_webhook = f"{settings.EVO_API_URL}/webhook/set/{nombre_instancia}"
                payload_webhook = {
                    "webhook": {
                        "enabled": True,
                        "url": url_webhook_n8n,
                        "webhookByEvents": False,
                        "webhookBase64": False,
                        "events": ["MESSAGES_UPSERT"]
                    }
                }
                
                # Le damos un segundito a Evolution para que asimile la creación
                time.sleep(1) 
                requests.post(url_set_webhook, json=payload_webhook, headers=headers)

                # --- PASO 3: ASEGURAR EL QR ---
                if not qr_base64:
                    time.sleep(2)
                    url_qr = f"{settings.EVO_API_URL}/instance/connect/{nombre_instancia}"
                    res_qr = requests.get(url_qr, headers=headers)
                    if res_qr.status_code == 200:
                        qr_base64 = res_qr.json().get('base64')

                # Guardamos en la BD de Brava POS
                sede.whatsapp_instancia = nombre_instancia
                sede.save()

                # Le devolvemos el QR a React para que el usuario lo escanee tranquilamente
                return Response({
                    "mensaje": "Instancia creada y Webhook armado",
                    "instancia": nombre_instancia,
                    "qr_base64": qr_base64
                })

            return Response({"error": res_crear.json()}, status=res_crear.status_code)

        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def obtener_qr(self, request, pk=None):
        sede = self.get_object()
        if not sede.whatsapp_instancia:
            return Response({"error": "La sede no tiene instancia vinculada"}, status=400)

        url = f"{settings.EVO_API_URL}/instance/connect/{sede.whatsapp_instancia}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return Response(response.json())
            return Response({"error": "No se pudo obtener el QR"}, status=response.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def eliminar_instancia(self, request, pk=None):
        sede = self.get_object()
        instancia_nombre = sede.whatsapp_instancia

        if not instancia_nombre:
            return Response({"mensaje": "No hay instancia activa en la base de datos"}, status=200)

        url = f"{settings.EVO_API_URL}/instance/delete/{instancia_nombre}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.delete(url, headers=headers)
            print(f"DEBUG Evolution Delete: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error de conexión con Evolution API: {e}")

        sede.whatsapp_instancia = None
        sede.whatsapp_numero = None
        sede.save()

        return Response({
            "mensaje": "Conexión desconectada localmente",
            "info_api": "Instancia removida del servidor o ya no existía"
        })

    @action(detail=True, methods=['get'], url_path='estado_conexion', permission_classes=[IsAuthenticated])
    def estado_conexion(self, request, pk=None):
        sede = self.get_object()
        if not sede.whatsapp_instancia:
            return Response({"estado": "desconectado"})

        url = f"{settings.EVO_API_URL}/instance/connectionState/{sede.whatsapp_instancia}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                estado_evo = data.get("instance", {}).get("state", "")

                if estado_evo == "open":
                    return Response({"estado": "conectado"})
                return Response({"estado": "esperando"})

            return Response({"estado": "desconectado"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
# ============================================================
# MESA
# ============================================================

class MesaViewSet(viewsets.ModelViewSet):
    serializer_class = MesaSerializer

    def get_queryset(self):
        queryset = Mesa.objects.filter(activo=True).order_by('posicion_x')
        empleado = get_empleado_desde_header(self.request)

        if empleado:
            return queryset.filter(sede=empleado.sede)

        sede_id = self.request.query_params.get('sede_id')
        if not es_valor_nulo(sede_id):
            queryset = queryset.filter(sede_id=sede_id)
        return queryset


# ============================================================
# PRODUCTO
# ============================================================

class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    permission_classes = [EsDuenioOsoloLectura]

    def get_queryset(self):
        queryset = Producto.objects.filter(activo=True)
        negocio_id = self.request.query_params.get('negocio_id')
        if not es_valor_nulo(negocio_id):
            queryset = queryset.filter(negocio_id=negocio_id)
        return queryset

    @action(detail=True, methods=['post'])
    def configurar_receta(self, request, pk=None):
        producto = self.get_object()
        ingredientes_data = request.data.get('ingredientes', [])
        try:
            with transaction.atomic():
                RecetaDetalle.objects.filter(producto=producto).delete()
                for ing in ingredientes_data:
                    insumo_id = ing.get('insumo_id')
                    cantidad = ing.get('cantidad_necesaria')
                    if insumo_id and float(cantidad) > 0:
                        RecetaDetalle.objects.create(
                            producto=producto,
                            insumo_id=insumo_id,
                            cantidad_necesaria=cantidad
                        )
            return Response({"mensaje": f"Receta de {producto.nombre} guardada con éxito."})
        except Exception as e:
            # 🛡️ FIX #14: No logueamos str(e) directamente (puede contener datos sensibles)
            logger.error("Error en configurar_receta para producto %s", producto.pk, exc_info=True)
            return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)

    @action(detail=True, methods=['get'])
    def obtener_receta(self, request, pk=None):
        producto = self.get_object()
        ingredientes = RecetaDetalle.objects.filter(producto=producto)
        data = [{
            "insumo_id": ing.insumo.id,
            "nombre": ing.insumo.nombre,
            "unidad": ing.insumo.unidad_medida,
            "cantidad_necesaria": float(ing.cantidad_necesaria)
        } for ing in ingredientes]
        return Response(data)


# ============================================================
# ORDEN
# ============================================================

class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_queryset(self):
        queryset = Orden.objects.prefetch_related(
            'detalles__producto', 'detalles__opciones_seleccionadas'
        ).all()

        empleado = get_empleado_desde_header(self.request)
        sede_id_filtrar = None

        if empleado:
            sede_id_filtrar = empleado.sede_id
        else:
            sede_id_raw = self.request.query_params.get('sede_id')
            if not es_valor_nulo(sede_id_raw):
                sede_id_filtrar = sede_id_raw

        # 🛡️ FIX #9: Si no hay sede determinada, solo devolvemos órdenes del negocio del JWT.
        #    Antes: sin sede_id se devolvían TODAS las órdenes de todos los negocios.
        if sede_id_filtrar:
            hoy = timezone.now().date()
            modo = self.request.query_params.get('modo')

            if modo == 'dashboard':
                # Modo dashboard: todas las órdenes pagadas sin límite de fecha
                # para que el frontend pueda filtrar por rango (hoy, semana, mes, etc.)
                queryset = queryset.filter(
                    sede_id=sede_id_filtrar,
                    estado_pago='pagado'
                ).exclude(
                    estado='cancelado'
                ).order_by('-creado_en')
            else:
                # Modo operativo (cocina/salón): solo pendientes + las de hoy
                queryset = queryset.filter(
                    sede_id=sede_id_filtrar
                ).exclude(
                    estado='cancelado'
                ).filter(
                    models.Q(estado_pago='pendiente') | models.Q(creado_en__date=hoy)
                ).order_by('-creado_en')
        elif hasattr(self.request.user, 'negocio'):
            # Sin sede específica → limitamos al negocio del JWT
            queryset = queryset.filter(
                sede__negocio=self.request.user.negocio
            ).order_by('-creado_en')
        else:
            queryset = queryset.none()

        return queryset

    def perform_create(self, serializer):
        empleado = get_empleado_desde_header(self.request)

        with transaction.atomic():
            orden = serializer.save(mesero=empleado)
            detalles_data = self.request.data.get('detalles', [])
            nuevo_total = Decimal('0.00')

            for d in detalles_data:
                producto = Producto.objects.get(id=d['producto'])
                precio_seguro = producto.precio_base
                notas = d.get('notas_y_modificadores', {})
                if isinstance(notas, str):
                    try:
                        notas = json.loads(notas) if notas.strip() else {}
                    except Exception:
                        notas = {}
                # 1. Preparar las opciones seleccionadas
                subtotal_opciones = Decimal('0.00')
                opciones_a_guardar = []
                
                # 2. Extraer IDs de opciones (soportamos tanto array plano como el dict de la imagen)
                variaciones_dict = notas.get('variaciones', {})
                opciones_ids = d.get('opciones', []) # Por si aca
                
                for grupo_id, ids in variaciones_dict.items():
                    if isinstance(ids, list):
                        opciones_ids.extend(ids)
                        
                # 3. Sumar precios reales de la BD
                for opc_raw in opciones_ids:
                    # Detectamos si el bot mandó un diccionario o el número directo
                    if isinstance(opc_raw, dict):
                        opc_id = opc_raw.get('id')
                    else:
                        opc_id = opc_raw

                    # Solo buscamos si logramos extraer un número válido
                    if opc_id is not None:
                        try:
                            opcion = OpcionVariacion.objects.get(id=opc_id)
                            subtotal_opciones += opcion.precio_adicional
                            opciones_a_guardar.append(opcion)
                        except OpcionVariacion.DoesNotExist:
                            pass
                
                # 4. 🌟 EL PRECIO REAL (Base + Opciones)
                precio_final_unitario = precio_seguro + subtotal_opciones
                
                # 5. Guardar detalle con el precio correcto
                detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto=producto,
                    cantidad=d['cantidad'],
                    precio_unitario=precio_final_unitario, # 👈 MAGIA AQUÍ
                    notas_y_modificadores=notas,
                    notas_cocina=d.get('notas_cocina', '')
                )
                
                # 6. Guardar relación para la cocina/ticket
                for opcion in opciones_a_guardar:
                    DetalleOrdenOpcion.objects.create(
                        detalle_orden=detalle,
                        opcion_variacion=opcion,
                        precio_adicional_aplicado=opcion.precio_adicional
                    )
                
                nuevo_total += precio_final_unitario * int(d['cantidad'])

            orden.total = nuevo_total
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

                # 1. Preparar las opciones seleccionadas
                subtotal_opciones = Decimal('0.00')
                opciones_a_guardar = []
                
                variaciones_dict = notas.get('variaciones', {})
                opciones_ids = detalle_data.pop('opciones_seleccionadas', [])
                
                for grupo_id, ids in variaciones_dict.items():
                    if isinstance(ids, list):
                        opciones_ids.extend(ids)
                        
                for opc_raw in opciones_ids:
                    # 🛡️ BLINDAJE ANTI-BOT: Detectamos si mandó un objeto {'id': 7} o el número 7
                    if isinstance(opc_raw, dict):
                        opc_id = opc_raw.get('id')
                    else:
                        opc_id = opc_raw

                    # Solo buscamos si logramos extraer un número válido
                    if opc_id is not None:
                        try:
                            opcion = OpcionVariacion.objects.get(id=opc_id)
                            subtotal_opciones += opcion.precio_adicional
                            opciones_a_guardar.append(opcion)
                        except OpcionVariacion.DoesNotExist:
                            pass

                # 🌟 EL PRECIO REAL
                precio_final_unitario = precio_seguro + subtotal_opciones

                nuevo_detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto=producto,
                    cantidad=detalle_data['cantidad'],
                    precio_unitario=precio_final_unitario, # 👈 CORREGIDO
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

            detalles_db = DetalleOrden.objects.filter(orden=orden)
            nuevo_total = Decimal('0.00')
            for d in detalles_db:
                total_item = d.precio_unitario
                variaciones = DetalleOrdenOpcion.objects.filter(detalle_orden=d)
                total_item += sum(v.precio_adicional_aplicado for v in variaciones)
                nuevo_total += d.cantidad * total_item

            orden.total = nuevo_total
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

                detalles_vivos = orden.detalles.all()
                nuevo_total = sum(d.cantidad * d.precio_unitario for d in detalles_vivos)
                for d in detalles_vivos:
                    nuevo_total += sum(
                        v.precio_adicional_aplicado for v in d.opciones_seleccionadas.all()
                    ) * d.cantidad
                orden.total = nuevo_total
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
        orden = self.get_object()
        
        # Datos enviados desde ModalCobro.jsx en React
        pagos_data = request.data.get('pagos', []) # Ej: [{'metodo': 'yape', 'monto': 50}]
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

                # Calcular si ya se pagó todo
                pagos_historicos = Pago.objects.filter(orden=orden).aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
                total_cubierto = pagos_historicos + total_pagado_ahora

                # 2. ACTUALIZAR ESTADO DE LA ORDEN
                if total_cubierto >= orden.total:
                    orden.estado_pago = 'pagado'
                    # Si ya se pagó, asumimos que se libera la mesa/entrega
                    if orden.estado != 'cancelado':
                        orden.estado = 'completado' 
                
                # 3. 🧠 MAGIA DEL CRM (Si dejaron su WhatsApp)
                if orden.sede.negocio.mod_clientes_activo:
                    if telefono_crm and len(telefono_crm) >= 9:
                        orden.cliente_telefono = telefono_crm
                        
                        cliente, creado = Cliente.objects.get_or_create(
                            negocio=orden.sede.negocio,
                            telefono=telefono_crm,
                            defaults={'nombre': orden.cliente_nombre or 'Cliente POS'}
                        )
                        
                        # Actualizamos sus estadísticas
                        cliente.cantidad_pedidos += 1
                        
                        # ✨ LA SOLUCIÓN: Convertimos a Decimal antes de sumar
                        cliente.total_gastado = Decimal(str(cliente.total_gastado)) + Decimal(str(orden.total))
                        
                        cliente.ultima_compra = timezone.now()
                        
                        # 🎁 SISTEMA DE PUNTOS
                        puntos_ganados = int(Decimal(str(orden.total)) // 10)
                        cliente.puntos_acumulados += puntos_ganados
                        
                        # 🏷️ ETIQUETADO AUTOMÁTICO (Segmentación)
                        tags_actuales = cliente.tags if isinstance(cliente.tags, list) else []
                        
                        # Como ahora es Decimal, lo comparamos tranquilamente
                        if cliente.total_gastado >= Decimal('500.00') and "VIP" not in tags_actuales:
                            tags_actuales.append("VIP")
                            
                        if creado and "Nuevo" not in tags_actuales:
                            tags_actuales.append("Nuevo")
                        elif not creado and "Nuevo" in tags_actuales:
                            tags_actuales.remove("Nuevo")
                            
                        cliente.tags = tags_actuales
                        cliente.save()

                orden.save()

            # 4. WEBSOCKETS: Avisar al frontend que la mesa se liberó
            channel_layer = get_channel_layer()
            if orden.mesa_id and orden.estado_pago == 'pagado':
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{orden.sede_id}",
                    {
                        "type": "mesa_actualizada", 
                        "mesa_id": orden.mesa_id, 
                        "estado": "libre", 
                        "total": 0
                    }
                )

            return Response({
                'status': 'Cobro exitoso', 
                'total_pagado': float(total_cubierto),
                'crm_actualizado': bool(telefono_crm)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error procesando cobro de orden {orden.id}: {str(e)}", exc_info=True)
            return Response({'error': 'Error interno al procesar el pago.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
   
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def modificar_desde_bot(self, request, pk=None):
        """
        Paso 1: El bot (n8n) llama a este endpoint cuando el cliente pide un cambio.
        """
        orden = self.get_object()
        accion = request.data.get('accion')  # 'cancelar', 'agregar', 'nota'
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
            # Avisamos tanto al Salón/Caja como a la Cocina
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
        orden = self.get_object()
        solicitud_id = request.data.get('solicitud_id')
        decision = request.data.get('decision') # 'aprobar' o 'rechazar'

        try:
            solicitud = SolicitudCambio.objects.get(id=solicitud_id, orden=orden, estado='pendiente')
        except SolicitudCambio.DoesNotExist:
            return Response({"error": "La solicitud ya fue resuelta o no existe."}, status=400)

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

        # Disparo a Evolution API
        if orden.sede.whatsapp_instancia and orden.cliente_telefono:
            url = f"{settings.EVO_API_URL}/message/sendText/{orden.sede.whatsapp_instancia}"
            headers = {"apikey": settings.EVO_GLOBAL_KEY, "Content-Type": "application/json"}
            payload = {
                "number": orden.cliente_telefono,
                "options": {"delay": 1200, "presence": "composing"},
                "text": mensaje_whatsapp
            }
            try:
                requests.post(url, json=payload, headers=headers, timeout=3)
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


# ============================================================
# MODIFICADOR RAPIDO
# ============================================================

class ModificadorRapidoViewSet(viewsets.ModelViewSet):
    serializer_class = ModificadorRapidoSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return ModificadorRapido.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return ModificadorRapido.objects.filter(negocio=self.request.user.negocio)
        return ModificadorRapido.objects.none()


# ============================================================
# VARIACIONES
# ============================================================

class GrupoVariacionViewSet(viewsets.ModelViewSet):
    serializer_class = GrupoVariacionSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return GrupoVariacion.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return GrupoVariacion.objects.filter(producto__negocio=self.request.user.negocio)
        return GrupoVariacion.objects.none()


class OpcionVariacionViewSet(viewsets.ModelViewSet):
    serializer_class = OpcionVariacionSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return OpcionVariacion.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return OpcionVariacion.objects.filter(grupo__producto__negocio=self.request.user.negocio)
        return OpcionVariacion.objects.none()


class RecetaOpcionViewSet(viewsets.ModelViewSet):
    serializer_class = RecetaOpcionSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return RecetaOpcion.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return RecetaOpcion.objects.filter(opcion__grupo__producto__negocio=self.request.user.negocio)
        return RecetaOpcion.objects.none()


# ============================================================
# ROL
# ============================================================

class RolViewSet(viewsets.ModelViewSet):
    serializer_class = RolSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Rol.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Rol.objects.filter(negocio=self.request.user.negocio)
        return Rol.objects.none()


# ============================================================
# EMPLEADO
# ============================================================

class PinRateThrottle(ScopedRateThrottle):
    scope = 'intentos_pin'


class EmpleadoViewSet(viewsets.ModelViewSet):
    serializer_class = EmpleadoSerializer

    def get_queryset(self):
        queryset = Empleado.objects.all()

        # 🛡️ FIX #5 + #4: Los permisos de listado ahora se basan en el JWT (request.user),
        #    NO en la ausencia/presencia del header X-Empleado-Id.
        #
        #    Regla: un Dueño (usuario Django con negocio) puede ver todos los empleados
        #    de su negocio. Un empleado autenticado solo ve los de su sede.
        #
        #    El header X-Empleado-Id ya no escala privilegios — solo filtra contexto.

        empleado_solicitante_id = self.request.headers.get('X-Empleado-Id')

        # Caso 1: Superusuario Django (admin del sistema)
        if self.request.user.is_superuser:
            pass  # sin filtro adicional

        # Caso 2: Dueño autenticado via JWT (tiene negocio asociado)
        elif hasattr(self.request.user, 'negocio'):
            queryset = queryset.filter(negocio=self.request.user.negocio)

            # Sub-filtros opcionales por sede/negocio para la UI
            sede_id = self.request.query_params.get('sede_id')
            negocio_id = self.request.query_params.get('negocio_id')
            if not es_valor_nulo(sede_id):
                queryset = queryset.filter(sede_id=sede_id)
            elif not es_valor_nulo(negocio_id):
                queryset = queryset.filter(negocio_id=negocio_id)

        # Caso 3: No hay negocio en el JWT → usamos el header para contexto de sede
        elif empleado_solicitante_id:
            try:
                empleado_actual = Empleado.objects.select_related('rol').get(id=empleado_solicitante_id)
                # Un empleado de cualquier rol solo puede ver su propia sede
                queryset = queryset.filter(sede=empleado_actual.sede)
            except Empleado.DoesNotExist:
                return queryset.none()

        else:
            # Sin JWT de negocio y sin header → sin acceso
            return queryset.none()

        if self.request.query_params.get('solo_activos') == 'true':
            queryset = queryset.filter(activo=True)

        return queryset

    @action(detail=False, methods=['POST'], permission_classes=[AllowAny], url_path='validar_pin')
    @throttle_classes([PinRateThrottle])
    def validar_pin(self, request):
        pin_ingresado = request.data.get('pin')
        sede_id = request.data.get('sede_id')
        accion = request.data.get('accion')

        if not pin_ingresado or not sede_id:
            return Response({'error': 'PIN y sede_id son obligatorios'}, status=status.HTTP_400_BAD_REQUEST)

        empleados = Empleado.objects.filter(sede_id=sede_id, activo=True)
        empleado_valido = None

        for emp in empleados:
            # 🛡️ FIX #13: Eliminamos la rama emp.pin == pin_ingresado (texto plano).
            #    check_password() de Django usa comparación de tiempo constante,
            #    previniendo timing attacks.
            #    Si el PIN aún está en texto plano (migración pendiente), lo hasheamos
            #    primero y guardamos, luego validamos con check_password.
            pin_stored = emp.pin

            # Detecta si el pin NO está hasheado (legado): los hashes de Django
            # empiezan con el identificador del algoritmo, ej. "pbkdf2_sha256$..."
            es_plano = not pin_stored.startswith(('pbkdf2_', 'argon2', 'bcrypt', '!'))

            if es_plano:
                # Migración en caliente: hashear y guardar antes de comparar
                if pin_stored == pin_ingresado:
                    emp.pin = make_password(pin_ingresado)
                    emp.save(update_fields=['pin'])
                    empleado_valido = emp
                    break
                # Si no coincide en texto plano, continuar al siguiente empleado
                continue

            # PIN ya hasheado: usar check_password (tiempo constante)
            if check_password(pin_ingresado, pin_stored):
                empleado_valido = emp
                break

        if not empleado_valido:
            return Response({'error': 'PIN incorrecto o inactivo'}, status=status.HTTP_401_UNAUTHORIZED)

        if accion == 'asistencia':
            empleado_valido.ultimo_ingreso = timezone.now()
            empleado_valido.save(update_fields=['ultimo_ingreso'])

        return Response({
            'id': empleado_valido.id,
            'nombre': empleado_valido.nombre,
            'rol_nombre': empleado_valido.rol.nombre if empleado_valido.rol else 'Sin Rol',
        }, status=status.HTTP_200_OK)


# ============================================================
# SESION CAJA
# ============================================================

class SesionCajaViewSet(viewsets.ModelViewSet):
    queryset = SesionCaja.objects.none()
    serializer_class = SesionCajaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = SesionCaja.objects.all().order_by('-fecha_apertura')
        empleado = get_empleado_desde_header(self.request)

        if empleado:
            return queryset.filter(sede=empleado.sede)

        sede_id_raw = self.request.query_params.get('sede_id')
        if not es_valor_nulo(sede_id_raw):
            queryset = queryset.filter(sede_id=sede_id_raw)
        return queryset

    @action(detail=False, methods=['get'])
    def estado_actual(self, request):
        empleado = get_empleado_desde_header(request)

        if empleado:
            sede_id = empleado.sede_id
        else:
            sede_id_raw = request.query_params.get('sede_id')
            sede_id = None if es_valor_nulo(sede_id_raw) else sede_id_raw

        if not sede_id:
            return Response({'error': 'Se requiere sede_id válida'}, status=400)

        sesion = SesionCaja.objects.filter(sede_id=sede_id, estado='abierta').first()
        if sesion:
            return Response({'estado': 'abierto', 'fondo': sesion.fondo_inicial, 'id': sesion.id})
        return Response({'estado': 'cerrado'})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def abrir_caja(self, request):
        empleado_id = request.data.get('empleado_id')
        sede_id = request.data.get('sede_id')
        fondo = request.data.get('fondo_inicial', 0)

        if not sede_id:
            return Response({'error': 'Falta sede_id'}, status=400)

        sesion = SesionCaja.objects.create(
            empleado_abre_id=empleado_id,
            sede_id=sede_id,
            fondo_inicial=fondo,
            estado='abierta'
        )
        return Response({'mensaje': 'Caja abierta con éxito', 'id': sesion.id})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def cerrar_caja(self, request):
        sede_id = request.data.get('sede_id')
        empleado_id = request.data.get('empleado_id')

        if not sede_id:
            return Response({'error': 'Se requiere sede_id'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            sesion = SesionCaja.objects.select_for_update().filter(sede_id=sede_id, estado='abierta').first()
            if not sesion:
                return Response(
                    {'error': 'No hay caja abierta en esta sede o ya fue cerrada.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            pagos_turno = Pago.objects.filter(sesion_caja=sesion)
            movimientos_turno = MovimientoCaja.objects.filter(sesion_caja=sesion)

            total_efectivo = pagos_turno.filter(metodo='efectivo').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_yape     = pagos_turno.filter(metodo='yape_plin').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_tarjeta  = pagos_turno.filter(metodo='tarjeta').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_digital  = total_yape + total_tarjeta

            ingresos_caja_chica = movimientos_turno.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            egresos_caja_chica  = movimientos_turno.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')

            conteo_efectivo = Decimal(str(request.data.get('conteo_efectivo', '0.00')))
            conteo_yape     = Decimal(str(request.data.get('conteo_yape', '0.00')))
            conteo_tarjeta  = Decimal(str(request.data.get('conteo_tarjeta', '0.00')))

            esperado_efectivo   = Decimal(str(sesion.fondo_inicial)) + total_efectivo + ingresos_caja_chica - egresos_caja_chica
            diferencia_efectivo = conteo_efectivo - esperado_efectivo
            diferencia_yape     = conteo_yape - total_yape
            diferencia_tarjeta  = conteo_tarjeta - total_tarjeta

            sesion.empleado_cierra_id  = empleado_id
            sesion.hora_cierre         = timezone.now()
            sesion.ventas_efectivo     = total_efectivo
            sesion.ventas_digitales    = total_digital
            sesion.esperado_efectivo   = esperado_efectivo
            sesion.esperado_digital    = total_digital
            sesion.declarado_efectivo  = conteo_efectivo
            sesion.declarado_yape      = conteo_yape
            sesion.declarado_tarjeta   = conteo_tarjeta
            sesion.diferencia          = diferencia_efectivo
            sesion.estado              = 'cerrada'
            sesion.save()

        return Response({
            'mensaje': 'Caja cerrada correctamente',
            'diferencia': float(diferencia_efectivo),
            'diferencia_yape': float(diferencia_yape),
            'diferencia_tarjeta': float(diferencia_tarjeta),
            'resumen': {
                'esperado_efectivo': float(esperado_efectivo),
                'declarado_efectivo': float(conteo_efectivo)
            }
        })


# ============================================================
# CATEGORIA
# ============================================================

class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Categoria.objects.filter(activo=True)
        if hasattr(self.request.user, 'negocio'):
            return Categoria.objects.filter(negocio=self.request.user.negocio, activo=True)
        return Categoria.objects.none()


# ============================================================
# INSUMOS
# ============================================================

class InsumoBaseViewSet(viewsets.ModelViewSet):
    serializer_class = InsumoBaseSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return InsumoBase.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return InsumoBase.objects.filter(negocio=self.request.user.negocio)
        return InsumoBase.objects.none()


class InsumoSedeViewSet(viewsets.ModelViewSet):
    serializer_class = InsumoSedeSerializer

    def get_queryset(self):
        sede_id = self.request.query_params.get('sede_id')
        if sede_id:
            return InsumoSede.objects.filter(sede_id=sede_id)
        return InsumoSede.objects.none()

    @action(detail=False, methods=['post'])
    def ingreso_masivo(self, request):
        try:
            insumo_base_id = request.data.get('insumo_base_id')
            if not insumo_base_id:
                return Response({"error": "Falta el ID del insumo."}, status=400)

            insumo_base = InsumoBase.objects.get(id=insumo_base_id)

            stock_actual_matriz     = float(insumo_base.stock_general)
            nuevo_ingreso           = float(request.data.get('ingreso_global', 0) or 0)
            stock_proyectado_matriz = stock_actual_matriz + nuevo_ingreso

            distribucion       = request.data.get('distribucion', {})
            total_a_repartir   = sum(float(v) for v in distribucion.values() if v and float(v) > 0)

            if total_a_repartir > stock_proyectado_matriz:
                raise ValueError(
                    f"No hay suficiente stock. Quieres repartir {total_a_repartir}, "
                    f"pero solo tendrás {stock_proyectado_matriz} en Matriz."
                )

            with transaction.atomic():
                insumo_base.stock_general = stock_proyectado_matriz - total_a_repartir
                insumo_base.save()

                for sede_id_str, cantidad in distribucion.items():
                    cant_float = float(cantidad) if cantidad else 0.0
                    if cant_float > 0:
                        obj, _ = InsumoSede.objects.get_or_create(
                            insumo_base=insumo_base,
                            sede_id=int(sede_id_str),
                            defaults={'stock_actual': 0, 'stock_minimo': 5, 'costo_unitario': 0}
                        )
                        InsumoSede.objects.filter(id=obj.id).update(
                            stock_actual=F('stock_actual') + cant_float
                        )

            return Response({"mensaje": "Operación logística completada."})

        except InsumoBase.DoesNotExist:
            return Response({"error": "El insumo maestro no existe."}, status=400)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            # 🛡️ FIX #14: exc_info=True envía el stack trace al sistema de logs
            #    sin exponer datos sensibles en la respuesta al cliente.
            logger.error("Error en ingreso_masivo para insumo %s", insumo_base_id, exc_info=True)
            return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)


# ============================================================
# FUNCIÓN AUXILIAR DE INVENTARIO
# ============================================================

def registrar_ingreso_maestro(insumo_base_id, reparticion):
    """
    reparticion = { sede_id: cantidad, ... }
    """
    insumo_base = InsumoBase.objects.get(id=insumo_base_id)
    for sede_id, cantidad in reparticion.items():
        obj, _ = InsumoSede.objects.get_or_create(
            insumo_base=insumo_base,
            sede_id=sede_id,
            defaults={'stock_actual': 0, 'stock_minimo': 5}
        )
        InsumoSede.objects.filter(id=obj.id).update(
            stock_actual=F('stock_actual') + cantidad
        )


# ============================================================
# VISTAS INDEPENDIENTES
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metricas_dashboard(request):
    sede_id_raw = request.query_params.get('sede_id')
    sede_id = None if es_valor_nulo(sede_id_raw) else sede_id_raw

    hoy = timezone.now().date()
    ordenes_base = Orden.objects.filter(
        creado_en__date=hoy,
        estado_pago='pagado'
    ).exclude(estado='cancelado').order_by('-creado_en')

    ordenes_hoy = ordenes_base.filter(sede_id=sede_id) if sede_id else ordenes_base

    total_ordenes   = ordenes_hoy.count()
    ventas_totales  = float(ordenes_hoy.aggregate(Sum('total'))['total__sum'] or 0.00)
    ticket_promedio = (ventas_totales / total_ordenes) if total_ordenes > 0 else 0.00

    actividad_reciente = [
        {
            'id': o.id,
            'origen': f"Mesa {o.mesa.numero_o_nombre}" if o.mesa else (o.cliente_nombre or "Para Llevar"),
            'total': float(o.total),
            'hora': o.creado_en.strftime("%H:%M")
        }
        for o in ordenes_hoy[:5]
    ]

    return Response({
        'ventas': ventas_totales,
        'ordenes': total_ordenes,
        'ticketPromedio': ticket_promedio,
        'actividadReciente': actividad_reciente
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def configuracion_negocio(request):
    negocio_id = request.query_params.get('negocio_id')

    if not negocio_id:
        return Response({'error': 'Debe enviar el parámetro negocio_id'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        negocio = Negocio.objects.get(id=negocio_id, activo=True)
        return Response({
            'nombre': negocio.nombre,
            'modulos': {
                'cocina':      negocio.mod_cocina_activo,
                'inventario':  negocio.mod_inventario_activo,
                'delivery':    negocio.mod_delivery_activo,
            }
        })
    except Negocio.DoesNotExist:
        return Response({'error': 'Negocio no encontrado o inactivo'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_movimiento_caja(request):
    """
    🛡️ FIX #10: Ahora SIEMPRE se verifica que el JWT del solicitante
    tenga relación con la sede de la sesión de caja.
    Ya no es posible registrar movimientos en sedes ajenas
    simplemente omitiendo el header X-Empleado-Id.
    """
    try:
        data = request.data
        sesion_id = data.get('sesion_caja_id')

        sesion = SesionCaja.objects.get(id=sesion_id)

        # Verificación obligatoria: el usuario del JWT debe pertenecer
        # al negocio de esta sede, o bien ser el empleado del header verificado.
        empleado = get_empleado_verificado(request)

        if empleado:
            # Empleado autenticado: verificar que su sede coincide
            if sesion.sede_id != empleado.sede_id:
                return Response(
                    {'error': 'No tienes permiso para registrar movimientos en esta sede.'},
                    status=403
                )
        elif hasattr(request.user, 'negocio'):
            # Dueño autenticado: verificar que la sede pertenece a su negocio
            if sesion.sede.negocio != request.user.negocio:
                return Response(
                    {'error': 'No tienes permiso para registrar movimientos en esta sede.'},
                    status=403
                )
        else:
            # Sin contexto válido → denegar
            return Response({'error': 'No autorizado.'}, status=403)

        movimiento = MovimientoCaja.objects.create(
            sede=sesion.sede,
            sesion_caja=sesion,
            empleado_id=data.get('empleado_id'),
            tipo=data.get('tipo'),
            monto=data.get('monto'),
            concepto=data.get('concepto')
        )

        return Response({'mensaje': 'Movimiento registrado con éxito', 'id': movimiento.id}, status=201)

    except SesionCaja.DoesNotExist:
        return Response({'error': 'La sesión de caja no existe.'}, status=404)


# ============================================================
# ENDPOINTS PÚBLICOS (sin token — carta QR)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def menu_publico(request, sede_id):
    try:
        sede = Sede.objects.get(id=sede_id)
        productos = Producto.objects.filter(negocio=sede.negocio, activo=True, disponible=True)
        categorias_ids = list(productos.values_list('categoria', flat=True).distinct())
        categorias = Categoria.objects.filter(id__in=categorias_ids)
        return Response({
            'negocio_nombre': sede.negocio.nombre,
            'productos': ProductoSerializer(productos, many=True).data,
            'categorias': CategoriaSerializer(categorias, many=True).data,
        })
    except Sede.DoesNotExist:
        return Response({'error': 'Sede no encontrada'}, status=404)
    except Exception as e:
        logger.error("Error en menu_publico para sede %s", sede_id, exc_info=True)
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def orden_publica(request, sede_id, mesa_id):
    try:
        orden = Orden.objects.prefetch_related(
            'detalles__producto', 'detalles__opciones_seleccionadas'
        ).filter(
            sede_id=sede_id,
            mesa_id=mesa_id,
            estado_pago='pendiente'
        ).exclude(estado__in=['cancelado', 'completado']).first()

        if not orden:
            return Response({'orden': None})
        return Response({'orden': OrdenSerializer(orden).data})
    except Exception as e:
        logger.error("Error en orden_publica para sede %s mesa %s", sede_id, mesa_id, exc_info=True)
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_sesion(request):
    """
    Si el usuario llega aquí, significa que su cookie JWT es válida.
    Devolvemos su info básica para reconstruir el estado en React.
    """
    return Response({
        "autenticado": True,
        "user": {
            "username": request.user.username,
            "rol": "Dueño" if hasattr(request.user, 'negocio') else "Empleado",
            # Agrega aquí lo que necesites para tu store
        }
    })

class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer # Asegúrate de tener el serializer creado
    
    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'negocio') or user.negocio is None:
            negocio_id = self.request.query_params.get('negocio_id')
            if negocio_id:
                return Cliente.objects.filter(negocio_id=negocio_id)
            else:
                return Cliente.objects.none()
        return Cliente.objects.filter(negocio=user.negocio)

    @action(detail=False, methods=['get'], url_path='buscar_por_telefono', permission_classes=[AllowAny])
    def buscar_por_telefono(self, request):
        """
        Endpoint que usará n8n para reconocer al cliente de WhatsApp.
        """
        telefono = request.query_params.get('telefono')
        negocio_id = request.query_params.get('negocio_id') # 👈 n8n nos enviará esto

        if not telefono:
            return Response({'error': 'Falta el parámetro telefono'}, status=400)

        # Buscamos al cliente globalmente por su teléfono (los últimos 9 dígitos)
        query = Cliente.objects.filter(telefono__icontains=telefono[-9:])
        
        # Si tienes varios restaurantes, filtramos por el negocio correcto
        if negocio_id:
            query = query.filter(negocio_id=negocio_id)
            
        cliente = query.first()

        if cliente:
            # Verificamos si hoy es su cumpleaños para avisarle al bot
            es_cumple = False
            if cliente.fecha_nacimiento:
                hoy = timezone.now().date()
                es_cumple = (cliente.fecha_nacimiento.day == hoy.day and 
                             cliente.fecha_nacimiento.month == hoy.month)

            return Response({
                'encontrado': True,
                'id': cliente.id,
                'nombre': cliente.nombre or "Cliente POS",
                'telefono': cliente.telefono,
                'puntos': cliente.puntos_acumulados,
                'tags': cliente.tags if isinstance(cliente.tags, list) else [],
                'es_cumpleanos_hoy': es_cumple
            })
        
        return Response({'encontrado': False, 'mensaje': 'Cliente nuevo'})

def calcular_distancia_km(lat1, lon1, lat2, lon2):
    R = 6371.0 # Radio de la Tierra en km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ZonaDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ZonaDeliverySerializer

    def get_queryset(self):
        # Este método ahora solo se usa para que el frontend liste las zonas
        sede_id = self.request.query_params.get('sede_id')
        if sede_id:
            return ZonaDelivery.objects.filter(sede_id=sede_id, activa=True)
        return ZonaDelivery.objects.filter(activa=True)

    # ✨ NUEVO ENDPOINT: /api/zonas-delivery/cotizar/
    @action(detail=False, methods=['get'])
    def cotizar(self, request):
        sede_id = request.query_params.get('sede_id')
        try:
            lat_cliente = float(request.query_params.get('lat', 0))
            lon_cliente = float(request.query_params.get('lon', 0))
        except ValueError:
            return Response({"error": "Las coordenadas deben ser números válidos"}, status=400)

        if not sede_id or lat_cliente == 0 or lon_cliente == 0:
            return Response({"error": "Faltan parámetros (sede_id, lat, lon)"}, status=400)

        try:
            sede = Sede.objects.get(id=sede_id)
            if not sede.latitud or not sede.longitud:
                return Response({"error": "El local no tiene coordenadas configuradas"}, status=400)

            # 1. Calculamos la distancia real en línea recta (Modo Helicóptero)
            distancia_recta = calcular_distancia_km(sede.latitud, sede.longitud, lat_cliente, lon_cliente)

            # ✨ EL HACK: Convertimos a "Modo Moto" multiplicando por 1.35
            FACTOR_RUTEO = 1.5
            distancia_estimada_ruta = distancia_recta * FACTOR_RUTEO

            # 2. Buscamos la zona aplicable usando la nueva distancia estimada
            zona = ZonaDelivery.objects.filter(
                sede_id=sede_id,
                activa=True,
                radio_max_km__gte=distancia_estimada_ruta
            ).order_by('radio_max_km').first()

            if zona:
                return Response({
                    "zona": zona.nombre,
                    "costo": zona.costo_envio,
                    "minimo": zona.pedido_minimo,
                    "distancia_km": round(distancia_estimada_ruta, 2)
                })
            else:
                # El cliente vive más lejos del radio máximo configurado
                return Response({
                    "error": f"Estás a {round(distancia_estimada_ruta, 2)}km de ruta. Por ahora nuestra cobertura máxima no llega hasta tu ubicación.",
                    "fuera_de_rango": True
                }, status=404)

        except Sede.DoesNotExist:
            return Response({"error": "Sede no encontrada"}, status=404)

class ReglaNegocioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReglaNegocioSerializer
    def get_queryset(self):
        negocio_id = self.request.query_params.get('negocio_id')
        return ReglaNegocio.objects.filter(negocio_id=negocio_id, activa=True)
    

# ============================================================
# ✅ FIX #1: LoginAdministradorView eliminada.
# El login ahora lo maneja CustomTokenObtainPairView en serializers_jwt.py
# que está registrado en urls.py como:
#   path('login-admin/', CustomTokenObtainPairView.as_view())
# ============================================================


# ============================================================
# 🩺 HEALTHCHECK (público — usado por GitHub Actions)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint público para verificar que el backend está operativo.
    Lo llama el script de deploy (curl) sin necesidad de token ni cookies.
    """
    from django.http import JsonResponse
    return JsonResponse({"status": "ok", "message": "Backend operando correctamente"})

@api_view(['GET'])
@permission_classes([AllowAny])
def estado_orden_bot(request):
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
        ).order_by('-creado_en').first() # 👈 Clave: Traer la más reciente

        if not orden:
            return Response({'orden': None})
            
        # Reutilizamos tu serializer existente para mantener el estándar
        return Response({'orden': OrdenSerializer(orden).data})
        
    except Exception as e:
        logger.error("Error en estado_orden_bot para sede %s telefono %s", sede_id, telefono, exc_info=True)
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)

