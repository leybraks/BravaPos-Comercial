from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets
from django.utils import timezone
from django.db import models
from django.contrib.auth import authenticate
from django.db import transaction
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from django.contrib.auth.hashers import check_password
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action , permission_classes,api_view
import time 
from .models import (GrupoVariacion, Negocio, Sede, Mesa, Producto, Orden, DetalleOrden, Pago, ModificadorRapido,DetalleOrdenOpcion, 
GrupoVariacion, OpcionVariacion,MovimientoCaja, Rol, Empleado, SesionCaja, Categoria)
from .serializers import (
    NegocioSerializer, SedeSerializer, MesaSerializer,
    ProductoSerializer, ModificadorRapidoSerializer, GrupoVariacionSerializer, OpcionVariacionSerializer,
    OrdenSerializer, DetalleOrdenSerializer, PagoSerializer, RolSerializer, EmpleadoSerializer, SesionCajaSerializer, CategoriaSerializer
)

class NegocioViewSet(viewsets.ModelViewSet):
    queryset = Negocio.objects.all()
    serializer_class = NegocioSerializer

class SedeViewSet(viewsets.ModelViewSet):
    serializer_class = SedeSerializer

    def get_queryset(self):
        queryset = Sede.objects.all()
        negocio_id = self.request.query_params.get('negocio_id')
        if negocio_id:
            queryset = queryset.filter(negocio_id=negocio_id)
        return queryset

class MesaViewSet(viewsets.ModelViewSet):
    serializer_class = MesaSerializer

    def get_queryset(self):
        queryset = Mesa.objects.filter(activo=True)
        
        # Si React manda "?sede_id=2", solo devolvemos las mesas de ese local
        sede_id = self.request.query_params.get('sede_id')
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)
            
        return queryset

class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer

    def get_queryset(self):
        queryset = Producto.objects.filter(activo=True) 
        
        negocio_id = self.request.query_params.get('negocio_id')
        if negocio_id:
            queryset = queryset.filter(negocio_id=negocio_id)
            
        return queryset

class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer
    def get_queryset(self):
        # 🛡️ Seguridad y Velocidad: Precargamos las relaciones
        queryset = Orden.objects.prefetch_related('detalles__producto', 'detalles__opciones_seleccionadas').all()
        
        # El POS solo debe cargar las órdenes activas de SU sede
        sede_id = self.request.query_params.get('sede_id')
        if sede_id:
            # Traemos las pendientes, cocinando, y las pagadas/completadas DE HOY (para que no colapse la app con historial viejo)
            hoy = timezone.now().date()
            queryset = queryset.filter(
                sede_id=sede_id
            ).exclude(
                estado='cancelado' # Quitamos las canceladas de la vista principal
            ).filter(
                models.Q(estado_pago='pendiente') | models.Q(creado_en__date=hoy)
            ).order_by('-creado_en')
            
        return queryset
    def perform_create(self, serializer):
        # ✨ TRANSACCIÓN ATÓMICA: Si algo falla, nada se guarda
        with transaction.atomic():
            orden = serializer.save()
            
            detalles_data = self.request.data.get('detalles', [])
            nuevo_total = Decimal('0.00')

            for d in detalles_data:
                detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto_id=d['producto'],
                    cantidad=d['cantidad'],
                    precio_unitario=d['precio_unitario'],
                    notas_y_modificadores=d.get('notas_y_modificadores', {}),
                    notas_cocina=d.get('notas_cocina', '')
                )

                opciones_ids = d.get('opciones', [])
                for opc_id in opciones_ids:
                    try:
                        opcion = OpcionVariacion.objects.get(id=opc_id)
                        DetalleOrdenOpcion.objects.create(
                            detalle_orden=detalle,
                            opcion_variacion=opcion,
                            precio_adicional_aplicado=opcion.precio_adicional
                        )
                    except OpcionVariacion.DoesNotExist:
                        pass 

                nuevo_total += Decimal(str(d['precio_unitario'])) * int(d['cantidad'])

            orden.total = nuevo_total
            orden.save()

        # El envío por WS se hace FUERA del atomic block, cuando los datos ya son reales en la BD
        orden_data = self.get_serializer(orden).data 
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"cocina_sede_{orden.sede_id}", 
            {
                "type": "orden_nueva", 
                "orden": orden_data
            }
        )

    @action(detail=True, methods=['post'])
    def agregar_productos(self, request, pk=None):
        orden = self.get_object()
        
        if orden.estado == 'cancelado' or orden.estado_pago == 'pagado':
            return Response({'error': 'No se pueden agregar productos a una orden cerrada o pagada.'}, status=status.HTTP_400_BAD_REQUEST)

        detalles_data = request.data.get('detalles', [])
        detalles_creados = []
        nuevo_total = Decimal('0.00')

        # ✨ TRANSACCIÓN ATÓMICA TAMBIÉN AQUÍ
        with transaction.atomic():
            for d in detalles_data:
                detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto_id=d['producto'],
                    cantidad=d['cantidad'],
                    precio_unitario=d['precio_unitario'],
                    notas_y_modificadores=d.get('notas_y_modificadores', {}),
                    notas_cocina=d.get('notas_cocina', '')
                )
                
                opciones_ids = d.get('opciones', []) 
                for opc_id in opciones_ids:
                    try:
                        opcion = OpcionVariacion.objects.get(id=opc_id)
                        DetalleOrdenOpcion.objects.create(
                            detalle_orden=detalle,
                            opcion_variacion=opcion,
                            precio_adicional_aplicado=opcion.precio_adicional
                        )
                    except OpcionVariacion.DoesNotExist:
                        pass 

                detalles_creados.append(detalle)
                nuevo_total += Decimal(str(d['precio_unitario'])) * int(d['cantidad'])
                
            orden.total += nuevo_total
            orden.save()

        nuevos_detalles_json = DetalleOrdenSerializer(detalles_creados, many=True).data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"cocina_sede_{orden.sede_id}", 
            {
                "type": "orden_nueva", 
                "orden": {
                    "id": orden.id, # 👈 ID real
                    "es_actualizacion": True, # 👈 Le avisamos a React
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
    serializer_class = EmpleadoSerializer
    def get_queryset(self):
        # ✨ EL ARREGLO: Traemos a TODOS por defecto (activos e inactivos)
        queryset = Empleado.objects.all()
        
        # Filtramos los empleados por Sede o por Negocio
        sede_id = self.request.query_params.get('sede_id')
        negocio_id = self.request.query_params.get('negocio_id')
        solo_activos = self.request.query_params.get('solo_activos')
        
        if sede_id:
            queryset = queryset.filter(sede_id=sede_id)
        elif negocio_id:
            queryset = queryset.filter(negocio_id=negocio_id)
            
        # Si desde React mandas ?solo_activos=true, los filtramos
        if solo_activos == 'true':
            queryset = queryset.filter(activo=True)
            
        return queryset
    

    @action(detail=False, methods=['POST'], permission_classes=[AllowAny], url_path='validar_pin')
    def validar_pin(self, request):
        pin_ingresado = request.data.get('pin')
        sede_id = request.data.get('sede_id')
        accion = request.data.get('accion')

        if not pin_ingresado or not sede_id:
            return Response({'error': 'PIN y sede_id son obligatorios'}, status=status.HTTP_400_BAD_REQUEST)

        # Buscamos en la sede específica
        empleados = Empleado.objects.filter(sede_id=sede_id, activo=True)
        empleado_valido = None

        for emp in empleados:
            # 1. Comparamos si está en texto plano (Ej: si lo creaste desde el /admin como '1111')
            if emp.pin == pin_ingresado:
                empleado_valido = emp
                break
            # 2. Comparamos por si acaso está encriptado (Hash)
            elif check_password(pin_ingresado, emp.pin):
                empleado_valido = emp
                break

        if not empleado_valido:
            return Response({'error': 'PIN incorrecto o inactivo'}, status=status.HTTP_404_NOT_FOUND)
            
        if accion == 'asistencia':
            empleado_valido.ultimo_ingreso = timezone.now()
            empleado_valido.save()

        return Response({
            'id': empleado_valido.id,
            'nombre': empleado_valido.nombre,
            'rol_nombre': empleado_valido.rol.nombre if empleado_valido.rol else 'Sin Rol', # 👈 CAMBIADO A 'rol_nombre'
        }, status=status.HTTP_200_OK)
    
class SesionCajaViewSet(viewsets.ModelViewSet):
    queryset = SesionCaja.objects.all()
    serializer_class = SesionCajaSerializer

    # ✨ PERMISO AÑADIDO: AllowAny para que React pueda consultar sin token
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def estado_actual(self, request):
        sede_id = request.query_params.get('sede_id')
        if not sede_id:
            return Response({'error': 'Falta sede_id'}, status=400)
            
        sesion = SesionCaja.objects.filter(sede_id=sede_id, estado='abierta').first()
        if sesion:
            return Response({'estado': 'abierto', 'fondo': sesion.fondo_inicial, 'id': sesion.id})
        return Response({'estado': 'cerrado'})

    # ✨ PERMISO AÑADIDO
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
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
    
    # ✨ CÁLCULO DE DIFERENCIAS DIGITALES
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def cerrar_caja(self, request):
        sede_id = request.data.get('sede_id')
        empleado_id = request.data.get('empleado_id')
        
        if not sede_id:
             return Response({'error': 'Se requiere sede_id'}, status=status.HTTP_400_BAD_REQUEST)

        # ✨ MAGIA NIVEL DIOS: Transacción + Bloqueo de fila. 
        # Si dos cajeros le dan click a "Cerrar" a la vez, Django pone al segundo en fila de espera.
        with transaction.atomic():
            sesion = SesionCaja.objects.select_for_update().filter(sede_id=sede_id, estado='abierta').first()
            if not sesion:
                return Response({'error': 'No hay caja abierta en esta sede o ya fue cerrada.'}, status=status.HTTP_400_BAD_REQUEST)

            pagos_turno = Pago.objects.filter(sesion_caja=sesion)
            movimientos_turno = MovimientoCaja.objects.filter(sesion_caja=sesion) # ✨ Obtenemos la caja chica
            # ✨ MATEMÁTICA PURA: Usamos Decimal estricto para evitar errores de redondeo de Python
            total_efectivo = pagos_turno.filter(metodo='efectivo').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_yape = pagos_turno.filter(metodo='yape_plin').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_tarjeta = pagos_turno.filter(metodo='tarjeta').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            total_digital = total_yape + total_tarjeta

            ingresos_caja_chica = movimientos_turno.filter(tipo='ingreso').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            egresos_caja_chica = movimientos_turno.filter(tipo='egreso').aggregate(Sum('monto'))['monto__sum'] or Decimal('0.00')
            # Convertimos lo que mandó React a Decimal seguro
            conteo_efectivo = Decimal(str(request.data.get('conteo_efectivo', '0.00')))
            conteo_yape = Decimal(str(request.data.get('conteo_yape', '0.00')))
            conteo_tarjeta = Decimal(str(request.data.get('conteo_tarjeta', '0.00')))
            
            esperado_efectivo = Decimal(str(sesion.fondo_inicial)) + total_efectivo + ingresos_caja_chica - egresos_caja_chica
            
            diferencia_efectivo = conteo_efectivo - esperado_efectivo
            diferencia_yape = conteo_yape - total_yape
            diferencia_tarjeta = conteo_tarjeta - total_tarjeta

            sesion.empleado_cierra_id = empleado_id
            sesion.hora_cierre = timezone.now()
            
            sesion.ventas_efectivo = total_efectivo
            sesion.ventas_digitales = total_digital
            sesion.esperado_efectivo = esperado_efectivo
            sesion.esperado_digital = total_digital
            
            sesion.declarado_efectivo = conteo_efectivo
            sesion.declarado_yape = conteo_yape
            sesion.declarado_tarjeta = conteo_tarjeta
            
            sesion.diferencia = diferencia_efectivo 
            sesion.estado = 'cerrada'
            sesion.save()

        return Response({
            'mensaje': 'Caja cerrada correctamente', 
            'diferencia': float(diferencia_efectivo), # Lo mandamos como float solo para que React lo pinte fácil
            'diferencia_yape': float(diferencia_yape),
            'diferencia_tarjeta': float(diferencia_tarjeta),
            'resumen': {
                'esperado_efectivo': float(esperado_efectivo),
                'declarado_efectivo': float(conteo_efectivo)
            }
        })

class CategoriaViewSet(viewsets.ModelViewSet):
    # Traemos todas las categorías activas
    queryset = Categoria.objects.filter(activo=True)
    serializer_class = CategoriaSerializer
# ==========================================
# VISTAS INDEPENDIENTES (ERP Y DASHBOARD)
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny]) 
def metricas_dashboard(request):
    sede_id = request.query_params.get('sede_id')
    
    if not sede_id:
        return Response({'error': 'Falta el parámetro sede_id'}, status=400)

    hoy = timezone.now().date()
    
    # Buscamos ventas de ESA sede, que estén pagadas, y que no estén canceladas
    ordenes_hoy = Orden.objects.filter(
        sede_id=sede_id,
        creado_en__date=hoy, 
        estado_pago='pagado'
    ).exclude(estado='cancelado').order_by('-creado_en')
    
    total_ordenes = ordenes_hoy.count()
    ventas_totales = float(ordenes_hoy.aggregate(Sum('total'))['total__sum'] or 0.00)
    ticket_promedio = (ventas_totales / total_ordenes) if total_ordenes > 0 else 0.00
    
    ultimas_ordenes = ordenes_hoy[:5]
    actividad_reciente = []
    
    for o in ultimas_ordenes:
        origen = f"Mesa {o.mesa.numero_o_nombre}" if o.mesa else (o.cliente_nombre or "Para Llevar")
        actividad_reciente.append({
            'id': o.id,
            'origen': origen,
            'total': float(o.total),
            'hora': o.creado_en.strftime("%H:%M") 
        })
    
    return Response({
        'ventas': ventas_totales,
        'ordenes': total_ordenes,
        'ticketPromedio': ticket_promedio,
        'actividadReciente': actividad_reciente 
    })
@api_view(['GET'])
@permission_classes([AllowAny])
def configuracion_negocio(request):
    negocio_id = request.query_params.get('negocio_id')
    
    if not negocio_id:
        return Response({'error': 'Debe enviar el parametro negocio_id'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        negocio = Negocio.objects.get(id=negocio_id, activo=True)
        # OJO: Cuando uses el modelo Suscripcion, aquí revisarías si su plan está activo
        return Response({
            'nombre': negocio.nombre,
            'modulos': {
                'cocina': negocio.mod_cocina_activo,
                'inventario': negocio.mod_inventario_activo,
                'delivery': negocio.mod_delivery_activo,
            }
        })
    except Negocio.DoesNotExist:
        return Response({'error': 'Negocio no encontrado o inactivo'}, status=status.HTTP_404_NOT_FOUND)



@api_view(['POST'])
@permission_classes([AllowAny]) # Para que el POS funcione sin trabas de tokens por ahora
def registrar_movimiento_caja(request):
    try:
        data = request.data
        sesion_id = data.get('sesion_caja_id')
        empleado_id = data.get('empleado_id')
        
        # Validamos que la sesión exista
        sesion = SesionCaja.objects.get(id=sesion_id)
        
        # Creamos el movimiento (Gasto o Ingreso)
        movimiento = MovimientoCaja.objects.create(
            sede=sesion.sede,
            sesion_caja=sesion,
            empleado_id=empleado_id,
            tipo=data.get('tipo'),
            monto=data.get('monto'),
            concepto=data.get('concepto')
        )
        
        return Response({
            'mensaje': 'Movimiento registrado con éxito', 
            'id': movimiento.id
        }, status=201)
        
    except SesionCaja.DoesNotExist:
        return Response({'error': 'La sesión de caja no existe.'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
    

class LoginAdministradorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Recibimos el usuario y contraseña desde React
        username = request.data.get('username')
        password = request.data.get('password')

        # 2. Le preguntamos a Django si son correctos
        user = authenticate(username=username, password=password)

        if user is not None:
            # 3. Buscamos si este usuario es dueño de algún negocio
            negocio = Negocio.objects.filter(propietario=user).first()
            
            if not negocio:
                return Response(
                    {'error': 'Este usuario no tiene un negocio asociado.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 4. ¡Magia! Generamos el Token de SimpleJWT
            refresh = RefreshToken.for_user(user)

            # 5. Se lo enviamos a React
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'rol': 'Dueño',
                'negocio_id': negocio.id,
                'negocio_nombre': negocio.nombre
            }, status=status.HTTP_200_OK)
            
        else:
            # Si se equivoca de contraseña
            return Response(
                {'error': 'Credenciales incorrectas.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )