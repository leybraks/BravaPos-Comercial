from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from decimal import Decimal
from django.db.models import Sum
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action , permission_classes,api_view
import time 
from .models import Negocio, Sede, Mesa, Producto, Orden, DetalleOrden, Pago, ModificadorRapido, GrupoVariacion, OpcionVariacion, Rol, Empleado, SesionCaja
from .serializers import (
    NegocioSerializer, SedeSerializer, MesaSerializer,
    ProductoSerializer, ModificadorRapidoSerializer, GrupoVariacionSerializer, OpcionVariacionSerializer,
    OrdenSerializer, DetalleOrdenSerializer, PagoSerializer, RolSerializer, EmpleadoSerializer, SesionCajaSerializer
)

class NegocioViewSet(viewsets.ModelViewSet):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

class SedeViewSet(viewsets.ModelViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer

class MesaViewSet(viewsets.ModelViewSet):
    queryset = Mesa.objects.all()
    serializer_class = MesaSerializer

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer

    def get_queryset(self):
        # SOLO DEJAMOS EL PRODUCTO. ¡Adiós 'detalles__variacion'! 👋
        return Orden.objects.prefetch_related('detalles__producto').all()

    # ==========================================
    # LA MAGIA: INTERCEPTAR LA CREACIÓN
    # ==========================================
    def create(self, request, *args, **kwargs):
        # 1. Guardamos la orden normal en la Base de Datos
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # 2. Preparamos el megáfono (WebSocket)
        channel_layer = get_channel_layer()
        
        # 3. ¡Gritamos la orden por el túnel de la cocina!
        async_to_sync(channel_layer.group_send)(
            "cocina", 
            {
                "type": "enviar_orden", 
                "orden": serializer.data 
            }
        )

        # 4. Le respondemos a la tablet de la cajera que todo salió bien
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=True, methods=['post'])
    def agregar_productos(self, request, pk=None):
        orden = self.get_object()
        detalles_data = request.data.get('detalles', [])
        
        detalles_creados = []
        nuevo_total = 0

        # 1. Guardamos los nuevos platos en la BD
        for d in detalles_data:
            detalle = DetalleOrden.objects.create(
                orden=orden,
                producto_id=d['producto'],
                cantidad=d['cantidad'],
                precio_unitario=d['precio_unitario'],
                notas_y_modificadores=d.get('notas_y_modificadores', {}),
                notas_cocina=d.get('notas_cocina', '')
            )
            detalles_creados.append(detalle)
            nuevo_total += Decimal(d['precio_unitario']) * Decimal(d['cantidad'])
            
        # 2. Actualizamos la cuenta final de la mesa
        orden.total += nuevo_total
        orden.save()

        # 3. Armamos el ticket para el KDS (Solo enviamos LO NUEVO, no toda la mesa)
        from .serializers import DetalleOrdenSerializer # Asegúrate de tenerlo importado
        nuevos_detalles_json = DetalleOrdenSerializer(detalles_creados, many=True).data
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "cocina", 
            {
                "type": "enviar_orden", 
                "orden": {
                    # ID único para que React no cruce los cables con el ticket original
                    "id": f"{orden.id}-{int(time.time())}", 
                    "real_id": orden.id, # El ID verdadero en la base de datos
                    "mesa": f"{orden.mesa.numero_o_nombre} (AGREGADO)" if orden.mesa else "LLEVAR (AGREGADO)",
                    "detalles": nuevos_detalles_json
                }
            }
        )
        
        return Response({'status': 'Productos agregados correctamente'}, status=status.HTTP_200_OK)
    
class DetalleOrdenViewSet(viewsets.ModelViewSet):
    queryset = DetalleOrden.objects.all()
    serializer_class = DetalleOrdenSerializer

class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

class ModificadorRapidoViewSet(viewsets.ModelViewSet):
    queryset = ModificadorRapido.objects.all()
    serializer_class = ModificadorRapidoSerializer

class GrupoVariacionViewSet(viewsets.ModelViewSet):
    queryset = GrupoVariacion.objects.all()
    serializer_class = GrupoVariacionSerializer

class OpcionVariacionViewSet(viewsets.ModelViewSet):
    queryset = OpcionVariacion.objects.all()
    serializer_class = OpcionVariacionSerializer

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer

    # ✨ LA CORRECCIÓN: permission_classes va ADENTRO del @action
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def validar_pin(self, request):
        pin = request.data.get('pin')
        accion = request.data.get('accion')

        if not pin:
            return Response({'error': 'PIN no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            empleado = Empleado.objects.get(pin=pin, activo=True)
            
            if accion == 'asistencia':
                empleado.ultimo_ingreso = timezone.now()
                empleado.save()

            return Response({
                'id': empleado.id,
                'nombre': empleado.nombre,
                'rol': empleado.rol.nombre if empleado.rol else 'Sin Rol',
                'hora_asistencia': empleado.ultimo_ingreso
            }, status=status.HTTP_200_OK)

        except Empleado.DoesNotExist:
            return Response({'error': 'PIN incorrecto o usuario inactivo'}, status=status.HTTP_404_NOT_FOUND)

class SesionCajaViewSet(viewsets.ModelViewSet):
    queryset = SesionCaja.objects.all()
    serializer_class = SesionCajaSerializer
    # Ruta 1: React pregunta "¿El local está abierto?"
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def estado_actual(self, request):
        # Buscamos si hay alguna caja con estado 'abierta'
        sesion = SesionCaja.objects.filter(estado='abierta').first()
        if sesion:
            return Response({'estado': 'abierto', 'fondo': sesion.fondo_inicial})
        return Response({'estado': 'cerrado'})

    # Ruta 2: El cajero manda el fondo de caja para abrir
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def abrir_caja(self, request):
        empleado_id = request.data.get('empleado_id')
        fondo = request.data.get('fondo_inicial', 0)
        
        sesion = SesionCaja.objects.create(
            empleado_abre_id=empleado_id,
            fondo_inicial=fondo,
            estado='abierta'
        )
        return Response({'mensaje': 'Caja abierta con éxito', 'estado': 'abierto'})
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def cerrar_caja(self, request):
        empleado_id = request.data.get('empleado_id')
        
        # Datos enviados por el modal del Frontend (Arqueo Ciego)
        conteo_efectivo = float(request.data.get('conteo_efectivo', 0))
        conteo_yape = float(request.data.get('conteo_yape', 0))
        conteo_tarjeta = float(request.data.get('conteo_tarjeta', 0))
        
        # 1. Buscamos la sesión abierta
        sesion = SesionCaja.objects.filter(estado='abierta').first()
        if not sesion:
            return Response({'error': 'No hay una caja abierta'}, status=400)

        # 2. Sumamos los pagos realizados durante esta sesión
        pagos_del_turno = Pago.objects.filter(fecha_pago__gte=sesion.hora_apertura)
        
        efectivo = pagos_del_turno.filter(metodo='efectivo').aggregate(Sum('monto'))['monto__sum'] or 0
        digital = pagos_del_turno.exclude(metodo='efectivo').aggregate(Sum('monto'))['monto__sum'] or 0

        # 3. El cálculo maestro (Esperado vs Declarado)
        esperado_efectivo_total = float(sesion.fondo_inicial) + float(efectivo)
        diferencia_final = conteo_efectivo - esperado_efectivo_total

        # 4. Guardamos los datos finales y cerramos la sesión
        sesion.empleado_cierra_id = empleado_id
        sesion.hora_cierre = timezone.now()
        
        sesion.ventas_efectivo = efectivo
        sesion.ventas_digitales = digital
        
        sesion.esperado_efectivo = esperado_efectivo_total
        sesion.esperado_digital = digital
        
        sesion.declarado_efectivo = conteo_efectivo
        sesion.declarado_yape = conteo_yape
        sesion.declarado_tarjeta = conteo_tarjeta
        
        sesion.diferencia = diferencia_final
        sesion.estado = 'cerrada'
        
        sesion.save()

        # 5. Le respondemos a React con la diferencia para que muestre la alerta
        return Response({
            'mensaje': 'Caja cerrada correctamente',
            'diferencia': diferencia_final,
            'resumen': {
                'fondo_inicial': float(sesion.fondo_inicial),
                'ventas_efectivo': float(efectivo),
                'total_esperado_en_efectivo': esperado_efectivo_total,
                'declarado_en_efectivo': conteo_efectivo
            }
        })


# ==========================================
# VISTAS INDEPENDIENTES (ERP Y DASHBOARD)
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny]) 
def metricas_dashboard(request):
    hoy = timezone.now().date()
    
    # Obtenemos las órdenes pagadas de hoy, ordenadas de la más nueva a la más vieja
    ordenes_hoy = Orden.objects.filter(creado_en__date=hoy, estado='pagado').order_by('-creado_en')
    
    total_ordenes = ordenes_hoy.count()
    ventas_totales = float(ordenes_hoy.aggregate(Sum('total'))['total__sum'] or 0.00)
    ticket_promedio = (ventas_totales / total_ordenes) if total_ordenes > 0 else 0.00
    
    # ✨ NUEVO: Sacamos las 5 últimas órdenes para la Actividad Reciente
    ultimas_ordenes = ordenes_hoy[:5]
    actividad_reciente = []
    
    for o in ultimas_ordenes:
        # Averiguamos de dónde vino (Mesa o Llevar)
        origen = f"Mesa {o.mesa.numero_o_nombre}" if o.mesa else (o.cliente_nombre or "Para Llevar")
        
        actividad_reciente.append({
            'id': o.id,
            'origen': origen,
            'total': float(o.total),
            'hora': o.creado_en.strftime("%H:%M") # Formato 14:30
        })
    
    return Response({
        'ventas': ventas_totales,
        'ordenes': total_ordenes,
        'ticketPromedio': ticket_promedio,
        'actividadReciente': actividad_reciente # Lo mandamos a React
    })

@api_view(['GET', 'PUT'])
@permission_classes([AllowAny]) 
def configuracion_negocio(request):
    # Por ahora asumimos que es el negocio 1 (el único en el sistema)
    negocio = Negocio.objects.first()
    
    if not negocio:
        return Response({'error': 'No hay negocio creado'}, status=404)

    if request.method == 'GET':
        return Response({
            'nombre': negocio.nombre,
            'mod_cocina_activo': negocio.mod_cocina_activo,
            'mod_delivery_activo': negocio.mod_delivery_activo,
            # Aquí podrías agregar campos extra a tu modelo luego, como 'numero_yape'
        })
        
    elif request.method == 'PUT':
        negocio.mod_cocina_activo = request.data.get('modCocina', negocio.mod_cocina_activo)
        negocio.mod_delivery_activo = request.data.get('modDelivery', negocio.mod_delivery_activo)
        # Igual, aquí actualizarías 'numero_yape' si lo agregas al modelo
        negocio.save()
        
        return Response({'mensaje': 'Configuración actualizada'})
