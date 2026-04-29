import logging

from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import Sede, Producto, Categoria, Orden
from ..serializers import ProductoSerializer, CategoriaSerializer, OrdenSerializer

logger = logging.getLogger(__name__)


# ============================================================
# 🩺 HEALTHCHECK (público — usado por GitHub Actions)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint público para verificar que el backend está operativo."""
    return JsonResponse({"status": "ok", "message": "Backend operando correctamente"})


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
        ).order_by('-creado_en').first()

        if not orden:
            return Response({'orden': None})

        return Response({'orden': OrdenSerializer(orden).data})

    except Exception as e:
        logger.error("Error en estado_orden_bot para sede %s telefono %s", sede_id, telefono, exc_info=True)
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)


# ============================================================
# AUTH
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_sesion(request):
    """
    Si el usuario llega aquí, su cookie JWT es válida.
    Devolvemos info básica para reconstruir el estado en React.
    """
    return Response({
        "autenticado": True,
        "user": {
            "username": request.user.username,
            "rol": "Dueño" if hasattr(request.user, 'negocio') else "Empleado",
        }
    })
