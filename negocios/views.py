from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from django.db import transaction
from decimal import Decimal
from django.db.models import F
import logging
from django.db.models import Sum
from django.contrib.auth.hashers import check_password, make_password, identify_hasher
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action, permission_classes, api_view, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from .permissions import EsDuenioOsoloLectura
from .models import (
    GrupoVariacion, InsumoBase, InsumoSede, Negocio, Sede, Mesa, Producto,
    Orden, DetalleOrden, Pago, ModificadorRapido, DetalleOrdenOpcion,
    OpcionVariacion, MovimientoCaja, RecetaDetalle, Rol, Empleado,
    SesionCaja, Categoria, RecetaOpcion, RegistroAuditoria
)
from .serializers import (
    InsumoBaseSerializer, InsumoSedeSerializer, NegocioSerializer, SedeSerializer,
    MesaSerializer, ProductoSerializer, ModificadorRapidoSerializer,
    GrupoVariacionSerializer, OpcionVariacionSerializer, OrdenSerializer,
    DetalleOrdenSerializer, PagoSerializer, RolSerializer, EmpleadoSerializer,
    SesionCajaSerializer, CategoriaSerializer, RecetaOpcionSerializer
)

logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def es_valor_nulo(valor):
    """Devuelve True si el valor es None, vacío, 'null' o 'undefined'."""
    return not valor or str(valor).lower() in ['null', 'undefined', '']


def get_empleado_desde_header(request):
    """Retorna el Empleado desde el header X-Empleado-Id, o None si no existe."""
    empleado_id = request.headers.get('X-Empleado-Id')
    if empleado_id:
        try:
            return Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return None
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
        # ✅ FIX: Ya no devuelve todas las sedes — filtra por negocio del usuario
        if self.request.user.is_superuser:
            return Sede.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Sede.objects.filter(negocio=self.request.user.negocio)
        return Sede.objects.none()


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
        except Exception:
            logger.exception("Error en configurar_receta")
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
        )

        # Restringir al negocio del usuario autenticado (a menos que sea superuser)
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'negocio'):
                queryset = queryset.filter(sede__negocio=self.request.user.negocio)
            else:
                # Usuario sin negocio y sin ser superuser: sin acceso
                return queryset.none()

        empleado = get_empleado_desde_header(self.request)
        sede_id_filtrar = None

        if empleado:
            sede_id_filtrar = empleado.sede_id
        else:
            sede_id_raw = self.request.query_params.get('sede_id')
            if not es_valor_nulo(sede_id_raw):
                sede_id_filtrar = sede_id_raw

        if sede_id_filtrar:
            hoy = timezone.now().date()
            queryset = queryset.filter(
                sede_id=sede_id_filtrar
            ).exclude(
                estado='cancelado'
            ).filter(
                models.Q(estado_pago='pendiente') | models.Q(creado_en__date=hoy)
            ).order_by('-creado_en')

        return queryset

    def perform_create(self, serializer):
        empleado = get_empleado_desde_header(self.request)

        with transaction.atomic():
            orden = serializer.save(mesero=empleado)
            detalles_data = self.request.data.get('detalles', [])
            nuevo_total = Decimal('0.00')

            for d in detalles_data:
                # Precio tomado de la BD — nunca del cliente (evita price injection)
                try:
                    producto = Producto.objects.get(id=d['producto'])
                except Producto.DoesNotExist:
                    raise ValueError("Uno de los productos de la orden no existe.")
                precio_real = producto.precio_base

                detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto_id=d['producto'],
                    cantidad=d['cantidad'],
                    precio_unitario=precio_real,
                    notas_y_modificadores=d.get('notas_y_modificadores', {}),
                    notas_cocina=d.get('notas_cocina', '')
                )
                subtotal_opciones = Decimal('0.00')
                for opc_id in d.get('opciones', []):
                    try:
                        opcion = OpcionVariacion.objects.get(id=opc_id)
                        DetalleOrdenOpcion.objects.create(
                            detalle_orden=detalle,
                            opcion_variacion=opcion,
                            precio_adicional_aplicado=opcion.precio_adicional
                        )
                        subtotal_opciones += opcion.precio_adicional
                    except OpcionVariacion.DoesNotExist:
                        pass
                nuevo_total += (precio_real + subtotal_opciones) * int(d['cantidad'])

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
                opciones_data = detalle_data.pop('opciones_seleccionadas', [])
                # Precio tomado de la BD — nunca del cliente (evita price injection)
                try:
                    producto = Producto.objects.get(id=detalle_data['producto'])
                except Producto.DoesNotExist:
                    return Response(
                        {'error': f"Producto {detalle_data['producto']} no encontrado."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                precio_real = producto.precio_base

                nuevo_detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto_id=detalle_data['producto'],
                    cantidad=detalle_data['cantidad'],
                    precio_unitario=precio_real,
                    notas_y_modificadores=detalle_data.get('notas_y_modificadores', ''),
                    notas_cocina=detalle_data.get('notas_cocina', '')
                )
                detalles_creados.append(nuevo_detalle)
                for opcion in opciones_data:
                    try:
                        opcion_obj = OpcionVariacion.objects.get(id=opcion)
                        DetalleOrdenOpcion.objects.create(
                            detalle_orden=nuevo_detalle,
                            opcion_variacion=opcion_obj,
                            precio_adicional_aplicado=opcion_obj.precio_adicional
                        )
                    except OpcionVariacion.DoesNotExist:
                        pass

            detalles_db = DetalleOrden.objects.filter(orden=orden)
            nuevo_total = sum(d.cantidad * d.precio_unitario for d in detalles_db)
            for d in detalles_db:
                variaciones = DetalleOrdenOpcion.objects.filter(detalle_orden=d)
                nuevo_total += sum(v.precio_adicional_aplicado for v in variaciones) * d.cantidad
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

        # ✅ FIX #6: empleado_nombre viene del header verificado, no del body del cliente
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
        empleado_solicitante_id = self.request.headers.get('X-Empleado-Id')
        es_admin_o_dueno = False

        if empleado_solicitante_id:
            try:
                empleado_actual = Empleado.objects.select_related('rol', 'negocio').get(
                    id=empleado_solicitante_id
                )
                # Verificar que el empleado pertenezca al negocio del usuario JWT
                if not self.request.user.is_superuser and hasattr(self.request.user, 'negocio'):
                    if empleado_actual.negocio_id != self.request.user.negocio.id:
                        return queryset.none()
                nombre_rol = empleado_actual.rol.nombre if empleado_actual.rol else ''
                if 'Dueño' in nombre_rol or 'Admin' in nombre_rol:
                    es_admin_o_dueno = True
                else:
                    queryset = queryset.filter(sede=empleado_actual.sede)
            except Empleado.DoesNotExist:
                return queryset.none()
        else:
            es_admin_o_dueno = True

        # Restringir al negocio del usuario autenticado
        if not self.request.user.is_superuser:
            if hasattr(self.request.user, 'negocio'):
                queryset = queryset.filter(negocio=self.request.user.negocio)
            elif not empleado_solicitante_id:
                return queryset.none()

        if es_admin_o_dueno:
            sede_id = self.request.query_params.get('sede_id')
            negocio_id = self.request.query_params.get('negocio_id')
            if not es_valor_nulo(sede_id):
                queryset = queryset.filter(sede_id=sede_id)
            elif not es_valor_nulo(negocio_id):
                queryset = queryset.filter(negocio_id=negocio_id)

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
            # check_password usa comparación en tiempo constante (seguro contra timing attacks).
            # Si algún PIN quedó en texto plano (previo al fix en Empleado.save), lo
            # detectamos con identify_hasher y lo migramos al vuelo.
            try:
                identify_hasher(emp.pin)
                es_hash = True
            except ValueError:
                es_hash = False

            if es_hash:
                if check_password(pin_ingresado, emp.pin):
                    empleado_valido = emp
                    break
            else:
                # PIN legado en texto plano: migrar al hasheado en esta validación
                if emp.pin == pin_ingresado:
                    emp.pin = make_password(pin_ingresado)
                    emp.save(update_fields=['pin'])
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

    # ✅ FIX #3: Antes devolvía InsumoBase.objects.all() sin filtro de negocio
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

            stock_actual_matriz   = float(insumo_base.stock_general)
            nuevo_ingreso         = float(request.data.get('ingreso_global', 0) or 0)
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
            # ValueError viene de validaciones propias (mensajes seguros, sin datos internos)
            return Response({"error": str(e)}, status=400)
        except Exception:
            logger.exception("Error en ingreso_masivo")
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

    total_ordenes  = ordenes_hoy.count()
    ventas_totales = float(ordenes_hoy.aggregate(Sum('total'))['total__sum'] or 0.00)
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


# ✅ FIX #2: configuracion_negocio ahora requiere autenticación
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
    try:
        data = request.data
        sesion_id = data.get('sesion_caja_id')
        empleado_id_solicitante = request.headers.get('X-Empleado-Id')

        sesion = SesionCaja.objects.select_related('sede__negocio').get(id=sesion_id)

        if empleado_id_solicitante:
            try:
                empleado = Empleado.objects.select_related('sede').get(id=empleado_id_solicitante)
            except Empleado.DoesNotExist:
                return Response({'error': 'Empleado no encontrado.'}, status=403)
            # Verificar que el empleado pertenezca al mismo negocio que la sesión de caja
            if empleado.sede.negocio_id != sesion.sede.negocio_id:
                return Response(
                    {'error': 'No tienes permiso para registrar movimientos en esta sede.'},
                    status=403
                )
            if sesion.sede_id != empleado.sede_id:
                return Response(
                    {'error': 'No tienes permiso para registrar movimientos en esta sede.'},
                    status=403
                )
        else:
            # Sin header de empleado: el solicitante debe ser el dueño del negocio
            if not request.user.is_superuser:
                if not hasattr(request.user, 'negocio') or \
                        sesion.sede.negocio.propietario_id != request.user.id:
                    return Response(
                        {'error': 'No tienes permiso para registrar movimientos en esta sede.'},
                        status=403
                    )

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
    except Exception:
        logger.exception("Error en menu_publico")
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
    except Exception:
        logger.exception("Error en orden_publica")
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)


# ============================================================
# ✅ FIX #1: LoginAdministradorView eliminada.
# El login ahora lo maneja CustomTokenObtainPairView en serializers_jwt.py
# que está registrado en urls.py como:
#   path('login-admin/', CustomTokenObtainPairView.as_view())
# ============================================================