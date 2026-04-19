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
from django.db.models import F
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from django.contrib.auth.hashers import check_password
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action , permission_classes,api_view
import time 
from rest_framework.permissions import IsAuthenticated
from .permissions import EsDuenioOsoloLectura
from .models import (GrupoVariacion, InsumoBase, InsumoSede, Negocio, Sede, Mesa, Producto, Orden, DetalleOrden, Pago, ModificadorRapido,DetalleOrdenOpcion, 
GrupoVariacion, OpcionVariacion,MovimientoCaja,RecetaDetalle, Rol, Empleado, SesionCaja, Categoria, RecetaOpcion,RegistroAuditoria)
from .serializers import (
    InsumoBaseSerializer, InsumoSedeSerializer, NegocioSerializer, SedeSerializer, MesaSerializer,
    ProductoSerializer, ModificadorRapidoSerializer, GrupoVariacionSerializer, OpcionVariacionSerializer,
    OrdenSerializer, DetalleOrdenSerializer, PagoSerializer, RolSerializer, EmpleadoSerializer, SesionCajaSerializer, CategoriaSerializer, RecetaOpcionSerializer
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
        # ✨ AQUÍ ESTÁ EL CAMBIO: Le decimos que las ordene por el mapa
        queryset = Mesa.objects.filter(activo=True).order_by('posicion_x')
        
        empleado_id = self.request.headers.get('X-Empleado-Id')
        
        if empleado_id:
            try:
                empleado = Empleado.objects.get(id=empleado_id)
                return queryset.filter(sede=empleado.sede)
            except Empleado.DoesNotExist:
                return queryset.none()
        
        else:
            sede_id = self.request.query_params.get('sede_id')
            
            # ✨ AQUÍ ESTÁ LA MAGIA ANTI-NULL ✨
            if sede_id and str(sede_id).lower() not in ['null', 'undefined', '']:
                queryset = queryset.filter(sede_id=sede_id)
                
            return queryset
        

class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    
    # 🛡️ ¡LA MAGIA OCURRE AQUÍ! Le ponemos el escudo al ViewSet entero
    permission_classes = [EsDuenioOsoloLectura]

    def get_queryset(self):
        queryset = Producto.objects.filter(activo=True) 
        
        negocio_id = self.request.query_params.get('negocio_id')
        
        # 💉 Vacuna anti-null aplicada para el ERP del Dueño
        if negocio_id and str(negocio_id).lower() not in ['null', 'undefined', '']:
            queryset = queryset.filter(negocio_id=negocio_id)
            
        return queryset
    @action(detail=True, methods=['post'])
    def configurar_receta(self, request, pk=None):
        producto = self.get_object() # 1. Atrapamos el plato (Ej: Lomo Saltado)
        ingredientes_data = request.data.get('ingredientes', []) # 2. Recibimos la lista de ingredientes de React

        try:
            with transaction.atomic():
                # 3. Limpiamos la "olla" (borramos la receta vieja si existía para no duplicar)
                RecetaDetalle.objects.filter(producto=producto).delete()

                # 4. Metemos los ingredientes nuevos uno por uno
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
            return Response({"error": str(e)}, status=400)
    
    @action(detail=True, methods=['get'])
    def obtener_receta(self, request, pk=None):
        producto = self.get_object()
        # Buscamos los ingredientes y los empaquetamos igual a como los lee React
        ingredientes = RecetaDetalle.objects.filter(producto=producto)
        data = [{
            "insumo_id": ing.insumo.id,
            "nombre": ing.insumo.nombre,
            "unidad": ing.insumo.unidad_medida,
            "cantidad_necesaria": float(ing.cantidad_necesaria)
        } for ing in ingredientes]
        
        return Response(data)

class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_queryset(self):
        # Precargamos las relaciones para que sea rapidísimo
        queryset = Orden.objects.prefetch_related('detalles__producto', 'detalles__opciones_seleccionadas').all()
        
        # 🛡️ EL DETECTOR DE MORTALES
        empleado_id = self.request.headers.get('X-Empleado-Id')
        sede_id_filtrar = None

        if empleado_id:
            # 🛑 ES UN EMPLEADO: Le imponemos SU sede, sin importar qué pida React
            try:
                empleado = Empleado.objects.get(id=empleado_id)
                sede_id_filtrar = empleado.sede_id
            except Empleado.DoesNotExist:
                return queryset.none() # Hacker bloqueado
        else:
            # 👑 ES EL DUEÑO: Confiamos en el menú desplegable del ERP
            sede_id_filtrar = self.request.query_params.get('sede_id')

            if not sede_id_filtrar or str(sede_id_filtrar).lower() in ['null', 'undefined', '']:
                sede_id_filtrar = None

        # Aplicamos los filtros de fecha y estado SOLO a la sede permitida
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
        empleado_id = self.request.headers.get('X-Empleado-Id')
        empleado_instancia = None
        
        if empleado_id:
            try:
                empleado_instancia = Empleado.objects.get(id=empleado_id)
            except Empleado.DoesNotExist:
                pass
        with transaction.atomic():
            orden = serializer.save(mesero=empleado_instancia)
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
        # Notificamos a todos los meseros del salón que esta mesa cambió de estado
        if orden.mesa_id:
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {
                    "type": "mesa_actualizada",
                    "mesa_id": orden.mesa_id,
                    "estado": "ocupada",
                    "total": float(orden.total),
                }
            )
        # Si es para llevar, notificamos la lista de delivery
        if orden.tipo == 'llevar':
            orden_data = self.get_serializer(orden).data
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {
                    "type": "orden_llevar_actualizada",
                    "accion": "nueva",
                    "orden": orden_data,
                }
            )
    def perform_update(self, serializer):
        instance = serializer.save()
        channel_layer = get_channel_layer()
        estados_libres = {'completado', 'cancelado'}
        # Si la orden se completa, cancela o se paga → la mesa vuelve a libre
        if instance.estado in estados_libres or instance.estado_pago == 'pagado':
            if instance.mesa_id:
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{instance.sede_id}",
                    {
                        "type": "mesa_actualizada",
                        "mesa_id": instance.mesa_id,
                        "estado": "libre",
                        "total": 0,
                    }
                )
            # Si es para llevar, notificamos que se completó/canceló
            if instance.tipo == 'llevar':
                orden_data = self.get_serializer(instance).data
                accion = 'completada' if instance.estado in estados_libres or instance.estado_pago == 'pagado' else 'actualizada'
                async_to_sync(channel_layer.group_send)(
                    f"salon_sede_{instance.sede_id}",
                    {
                        "type": "orden_llevar_actualizada",
                        "accion": accion,
                        "orden": orden_data,
                    }
                )

    @action(detail=True, methods=['post'])
    def agregar_productos(self, request, pk=None):
        orden = self.get_object()
        
        if orden.estado == 'cancelado' or orden.estado_pago == 'pagado':
            return Response({'error': 'No se pueden agregar productos a una orden cerrada o pagada.'}, status=status.HTTP_400_BAD_REQUEST)

        detalles_data = request.data.get('detalles', [])
        detalles_creados = []

        with transaction.atomic():
            for detalle_data in detalles_data:
                opciones_data = detalle_data.pop('opciones_seleccionadas', [])
                
                nuevo_detalle = DetalleOrden.objects.create(
                    orden=orden,
                    producto_id=detalle_data['producto'],
                    cantidad=detalle_data['cantidad'],
                    precio_unitario=detalle_data['precio_unitario'],
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

            # ✨ 3. MAGIA 1: Sumamos directamente desde la base de datos (ignorando el caché)
            detalles_db = DetalleOrden.objects.filter(orden=orden)
            nuevo_total = sum(d.cantidad * d.precio_unitario for d in detalles_db)
            
            for d in detalles_db:
                variaciones = DetalleOrdenOpcion.objects.filter(detalle_orden=d)
                nuevo_total += sum(v.precio_adicional_aplicado for v in variaciones) * d.cantidad

            orden.total = nuevo_total
            orden.save()

        # ✨ AVISO A LA COCINA (WebSockets)
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
        
        # ✨ 4. MAGIA 2: Volvemos a pedirle la orden a la BD para borrar la memoria vieja
        # Así aseguramos que a React le llegue la lista completa y el precio final real
        orden_fresca = Orden.objects.prefetch_related(
            'detalles__producto', 
            'detalles__opciones_seleccionadas'
        ).get(id=orden.id)

        # Notificamos al salón que el total de esta mesa se actualizó
        if orden.mesa_id:
            async_to_sync(channel_layer.group_send)(
                f"salon_sede_{orden.sede_id}",
                {
                    "type": "mesa_actualizada",
                    "mesa_id": orden.mesa_id,
                    "estado": "ocupada",
                    "total": float(orden_fresca.total),
                }
            )
        
        serializer = self.get_serializer(orden_fresca)
        return Response({
            'status': 'Productos agregados correctamente',
            'orden': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def anular_item(self, request, pk=None):
        orden = self.get_object()
        detalle_id = request.data.get('detalle_id')
        motivo = request.data.get('motivo', 'No especificado')
        empleado_nombre = request.data.get('empleado_nombre', 'Admin')

        try:
            with transaction.atomic():
                detalle = orden.detalles.get(id=detalle_id)
                nombre_plato = detalle.producto.nombre
                
                # 1. Registrar en Auditoría (La prueba del delito)
                RegistroAuditoria.objects.create(
                    sede=orden.sede,
                    empleado_nombre=empleado_nombre,
                    accion='anular_plato',
                    descripcion=f"Anuló {detalle.cantidad}x {nombre_plato} de Orden #{orden.id}. Motivo: {motivo}"
                )

                # 2. Borrar el plato y recalcular total
                detalle.delete()
                
                # Recalculamos el total real desde la base de datos
                detalles_vivos = orden.detalles.all()
                nuevo_total = sum(d.cantidad * d.precio_unitario for d in detalles_vivos)
                
                # Sumar variaciones si existen
                for d in detalles_vivos:
                    nuevo_total += sum(v.precio_adicional_aplicado for v in d.opciones_seleccionadas.all()) * d.cantidad

                orden.total = nuevo_total
                orden.save()

            # 3. Respuesta fresca para React
            # IMPORTANTE: Re-fetch desde BD para limpiar el caché en memoria de Django
            # sin esto, orden.detalles.all() puede devolver el detalle borrado
            orden_fresca = Orden.objects.prefetch_related(
                'detalles__producto',
                'detalles__opciones_seleccionadas'
            ).get(id=orden.id)
            serializer = self.get_serializer(orden_fresca)
            return Response({
                'status': 'Plato anulado y auditado',
                'orden': serializer.data
            }, status=status.HTTP_200_OK)

        except DetalleOrden.DoesNotExist:
            return Response({'error': 'El plato no existe'}, status=status.HTTP_400_BAD_REQUEST)

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

class RecetaOpcionViewSet(viewsets.ModelViewSet):
    queryset = RecetaOpcion.objects.all()
    serializer_class = RecetaOpcionSerializer

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer

class EmpleadoViewSet(viewsets.ModelViewSet):
    serializer_class = EmpleadoSerializer

    def get_queryset(self):
        queryset = Empleado.objects.all()
        
        # 🛡️ EL DETECTOR DE MORTALES
        empleado_solicitante_id = self.request.headers.get('X-Empleado-Id')

        if empleado_solicitante_id:
            # 🛑 ES UN EMPLEADO: Solo ve a sus compañeros de la misma sede
            try:
                empleado_actual = Empleado.objects.get(id=empleado_solicitante_id)
                queryset = queryset.filter(sede=empleado_actual.sede)
            except Empleado.DoesNotExist:
                return queryset.none()
        else:
            # 👑 ES EL DUEÑO: Puede filtrar por la Sede que elija o ver todo el Negocio
            sede_id = self.request.query_params.get('sede_id')
            negocio_id = self.request.query_params.get('negocio_id')
            
            if sede_id and str(sede_id).lower() not in ['null', 'undefined', '']:
                queryset = queryset.filter(sede_id=sede_id)
            elif negocio_id and str(negocio_id).lower() not in ['null', 'undefined', '']:
                queryset = queryset.filter(negocio_id=negocio_id)

        # Filtro opcional de activos (lo mantienes igual)
        solo_activos = self.request.query_params.get('solo_activos')
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
    queryset = SesionCaja.objects.none()
    serializer_class = SesionCajaSerializer
    permission_classes = [IsAuthenticated] # 🔒 Adiós AllowAny

    def get_queryset(self):
        queryset = SesionCaja.objects.all().order_by('-fecha_apertura')
        empleado_id = self.request.headers.get('X-Empleado-Id')

        if empleado_id:
            # 🛑 MODO MORTAL: Solo ve las cajas de su propia sede
            try:
                empleado = Empleado.objects.get(id=empleado_id)
                return queryset.filter(sede=empleado.sede)
            except Empleado.DoesNotExist:
                return queryset.none()
        else:
            # 👑 MODO DUEÑO: Panel ERP
            sede_id_raw = self.request.query_params.get('sede_id')
            if sede_id_raw and str(sede_id_raw).lower() not in ['null', 'undefined', '']:
                queryset = queryset.filter(sede_id=sede_id_raw)
            return queryset

    @action(detail=False, methods=['get'])
    def estado_actual(self, request):
        # 💉 Vacuna Anti-Null para la sede
        sede_id_raw = request.query_params.get('sede_id')
        
        # Si es empleado, forzamos su sede real desde la cabecera
        empleado_id = request.headers.get('X-Empleado-Id')
        if empleado_id:
            try:
                sede_id = Empleado.objects.get(id=empleado_id).sede_id
            except Empleado.DoesNotExist:
                return Response({'error': 'Empleado inválido'}, status=403)
        else:
            sede_id = sede_id_raw if str(sede_id_raw).lower() not in ['null', 'undefined', ''] else None

        if not sede_id:
            return Response({'error': 'Se requiere sede_id válida'}, status=400)
            
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
@permission_classes([IsAuthenticated]) # 🔒 1. LA BOVEDA CERRADA: Solo usuarios logueados
def metricas_dashboard(request):
    # 2. Atrapamos lo que manda React
    sede_id_raw = request.query_params.get('sede_id')
    sede_id = None
    
    # 💉 3. LA VACUNA: Solo asignamos la sede si NO es la palabra basura "null"
    if sede_id_raw and str(sede_id_raw).lower() not in ['null', 'undefined', '']:
        sede_id = sede_id_raw

    hoy = timezone.now().date()
    
    # 4. Buscamos todas las ventas exitosas de hoy (Base)
    ordenes_base = Orden.objects.filter(
        creado_en__date=hoy, 
        estado_pago='pagado'
    ).exclude(estado='cancelado').order_by('-creado_en')
    
    # 5. EL ESCUDO DUEÑO/ADMINISTRADOR
    if sede_id:
        # Si eligió una sede (o es un Administrador de local), filtramos por esa
        ordenes_hoy = ordenes_base.filter(sede_id=sede_id)
    else:
        # Si NO hay sede (El Dueño recién entra al ERP), sumamos TODO el negocio 💰
        ordenes_hoy = ordenes_base
    
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
@permission_classes([IsAuthenticated]) # 🔒 Seguridad activada
def registrar_movimiento_caja(request):
    try:
        data = request.data
        sesion_id = data.get('sesion_caja_id')
        empleado_id_solicitante = request.headers.get('X-Empleado-Id')
        
        # 1. Obtenemos la sesión
        sesion = SesionCaja.objects.get(id=sesion_id)
        
        # 🛡️ 2. EL ESCUDO MULTI-TENANT
        if empleado_id_solicitante:
            empleado = Empleado.objects.get(id=empleado_id_solicitante)
            # Verificamos que la caja que quiere tocar sea de SU sede
            if sesion.sede_id != empleado.sede_id:
                return Response({'error': 'No tienes permiso para registrar movimientos en esta sede.'}, status=403)

        # 3. Si pasó el escudo, creamos el movimiento
        movimiento = MovimientoCaja.objects.create(
            sede=sesion.sede,
            sesion_caja=sesion,
            empleado_id=data.get('empleado_id'), # El ID del que pone el PIN en el modal
            tipo=data.get('tipo'),
            monto=data.get('monto'),
            concepto=data.get('concepto')
        )
        
        return Response({'mensaje': 'Movimiento registrado con éxito', 'id': movimiento.id}, status=201)
        
    except SesionCaja.DoesNotExist:
        return Response({'error': 'La sesión de caja no existe.'}, status=404)

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
        

class InsumoBaseViewSet(viewsets.ModelViewSet):
    queryset = InsumoBase.objects.all()
    serializer_class = InsumoBaseSerializer


# negocios/views.py o un archivo de servicios

def registrar_ingreso_maestro(insumo_base_id, reparticion):
    """
    'reparticion' es un objeto como: { 1: 50, 2: 50 } 
    donde la clave es la sede_id y el valor es la cantidad.
    """
    insumo_base = InsumoBase.objects.get(id=insumo_base_id)
    
    for sede_id, cantidad in reparticion.items():
        # ✨ get_or_create: Si no existe en la sede, lo crea. Si existe, lo trae.
        obj, created = InsumoSede.objects.get_or_create(
            insumo_base=insumo_base,
            sede_id=sede_id,
            defaults={'stock_actual': 0, 'stock_minimo': 5}
        )
        
        # Actualizamos el stock (usando F para evitar errores de concurrencia)
        from django.db.models import F
        InsumoSede.objects.filter(id=obj.id).update(
            stock_actual=F('stock_actual') + cantidad
        )

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

            # 1. Obtenemos el insumo
            insumo_base = InsumoBase.objects.get(id=insumo_base_id)
            
            # 2. Hacemos la matemática en Python (números reales, nada de fórmulas aún)
            stock_actual_matriz = float(insumo_base.stock_general)
            nuevo_ingreso = float(request.data.get('ingreso_global', 0) or 0)
            
            # Proyectamos cuánto habría en la Matriz antes de repartir
            stock_proyectado_matriz = stock_actual_matriz + nuevo_ingreso
            
            # Calculamos cuánto queremos repartir a los locales
            distribucion = request.data.get('distribucion', {})
            total_a_repartir = sum(float(v) for v in distribucion.values() if v and float(v) > 0)

            # 3. Seguro de Vida: ¿Nos alcanza? (Aquí comparamos Float vs Float, 100% seguro)
            if total_a_repartir > stock_proyectado_matriz:
                raise ValueError(f"No hay suficiente stock. Quieres repartir {total_a_repartir}, pero solo tendrás {stock_proyectado_matriz} en Matriz.")

            # 4. Transacción atómica (Guardamos todo a la vez)
            with transaction.atomic():
                
                # Actualizamos la Matriz (Lo que había + lo nuevo - lo repartido)
                insumo_base.stock_general = stock_proyectado_matriz - total_a_repartir
                insumo_base.save()

                # Repartimos a las sedes (Aquí sí usamos F() porque no necesitamos leer el valor inmediatamente)
                for sede_id_str, cantidad in distribucion.items():
                    cant_float = float(cantidad) if cantidad else 0.0
                    if cant_float > 0:
                        obj, created = InsumoSede.objects.get_or_create(
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
            return Response({"error": str(e)}, status=400)