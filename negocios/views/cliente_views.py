import math
import logging

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import Cliente, ZonaDelivery, ReglaNegocio, Sede
from ..serializers import ClienteSerializer, ZonaDeliverySerializer, ReglaNegocioSerializer

logger = logging.getLogger(__name__)


# ============================================================
# CLIENTE
# ============================================================

class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'negocio') or user.negocio is None:
            negocio_id = self.request.query_params.get('negocio_id')
            if negocio_id:
                return Cliente.objects.filter(negocio_id=negocio_id)
            return Cliente.objects.none()
        return Cliente.objects.filter(negocio=user.negocio)

    @action(detail=False, methods=['get'], url_path='buscar_por_telefono', permission_classes=[IsAuthenticated])
    def buscar_por_telefono(self, request):
        """
        Endpoint que usará n8n para reconocer al cliente de WhatsApp.
        """
        telefono = request.query_params.get('telefono')
        negocio_id = request.query_params.get('negocio_id')

        if not telefono:
            return Response({'error': 'Falta el parámetro telefono'}, status=400)

        query = Cliente.objects.filter(telefono__icontains=telefono[-9:])

        if negocio_id:
            query = query.filter(negocio_id=negocio_id)

        cliente = query.first()

        if cliente:
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


# ============================================================
# ZONA DELIVERY
# ============================================================

def calcular_distancia_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class ZonaDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ZonaDeliverySerializer

    def get_queryset(self):
        sede_id = self.request.query_params.get('sede_id')
        if sede_id:
            return ZonaDelivery.objects.filter(sede_id=sede_id, activa=True)
        return ZonaDelivery.objects.filter(activa=True)

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

        # Subtotal opcional — permite aplicar regla delivery_gratis en la cotización
        try:
            subtotal = float(request.query_params.get('subtotal', 0))
        except ValueError:
            subtotal = 0.0

        try:
            sede = Sede.objects.get(id=sede_id)
            if not sede.latitud or not sede.longitud:
                return Response({"error": "El local no tiene coordenadas configuradas"}, status=400)

            distancia_recta = calcular_distancia_km(sede.latitud, sede.longitud, lat_cliente, lon_cliente)

            FACTOR_RUTEO = 1.5
            distancia_estimada_ruta = distancia_recta * FACTOR_RUTEO

            zona = ZonaDelivery.objects.filter(
                sede_id=sede_id,
                activa=True,
                radio_max_km__gte=distancia_estimada_ruta
            ).order_by('radio_max_km').first()

            if zona:
                costo_envio = float(zona.costo_envio)
                delivery_gratis = False

                # Aplicar regla delivery_gratis si el subtotal la activa
                if subtotal > 0:
                    regla_gratis = ReglaNegocio.objects.filter(
                        negocio=sede.negocio,
                        tipo='delivery_gratis',
                        activa=True,
                        monto_minimo_orden__lte=subtotal
                    ).first()
                    if regla_gratis:
                        costo_envio = 0.0
                        delivery_gratis = True

                respuesta = {
                    "zona": zona.nombre,
                    "costo": costo_envio,
                    "minimo": zona.pedido_minimo,
                    "distancia_km": round(distancia_estimada_ruta, 2),
                }
                if delivery_gratis:
                    respuesta["delivery_gratis"] = True
                    respuesta["mensaje_promo"] = "🎉 ¡Delivery gratis por tu pedido!"
                return Response(respuesta)
            else:
                return Response({
                    "error": f"Estás a {round(distancia_estimada_ruta, 2)}km de ruta. Por ahora nuestra cobertura máxima no llega hasta tu ubicación.",
                    "fuera_de_rango": True
                }, status=404)

        except Sede.DoesNotExist:
            return Response({"error": "Sede no encontrada"}, status=404)


# ============================================================
# REGLA NEGOCIO
# ============================================================

class ReglaNegocioViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReglaNegocioSerializer

    def get_queryset(self):
        negocio_id = self.request.query_params.get('negocio_id')
        return ReglaNegocio.objects.filter(negocio_id=negocio_id, activa=True)
