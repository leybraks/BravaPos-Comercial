import logging

from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken

from ..models import Sede, Producto, Categoria, Orden
from ..serializers import ProductoSerializer, CategoriaSerializer, OrdenSerializer

logger = logging.getLogger(__name__)


# ============================================================
# 🩺 HEALTHCHECK (público — usado por GitHub Actions)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Backend operando correctamente"})


# ============================================================
# ENDPOINTS PÚBLICOS (sin token — carta QR)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def menu_publico(request, sede_id):
    try:
        sede = Sede.objects.get(id=sede_id)
        productos = Producto.objects.filter(
            negocio=sede.negocio, activo=True, disponible=True
        ).select_related('categoria').prefetch_related('grupos_variacion__opciones')

        categorias_ids = list(productos.values_list('categoria', flat=True).distinct())
        categorias = Categoria.objects.filter(id__in=categorias_ids)

        carta_config = sede.negocio.carta_config or {}

        # ── FIX NOMBRE ──────────────────────────────────────────────────────
        # Si carta_config tiene nombreNegocio vacío o ausente, usamos el nombre
        # real del negocio en la BD. Así el editor puede sobreescribirlo solo
        # cuando tenga un valor real, no un string vacío.
        nombre_bd = sede.negocio.nombre or ''
        nombre_config = (carta_config.get('nombreNegocio') or '').strip()
        nombre_final = nombre_bd

        # ── FIX IMÁGENES ─────────────────────────────────────────────────────
        # Pasamos context={'request': request} para que ImageField construya
        # la URL absoluta: http://localhost:8000/media/productos/fotos/...
        # Sin este context, DRF devuelve solo la ruta relativa.
        serializer_context = {'request': request}

        return Response({
            'negocio_nombre': nombre_final,
            'carta_config': {
                **carta_config,
                'nombreNegocio': nombre_final,   # siempre viene con valor real
            },
            'productos': ProductoSerializer(
                productos, many=True, context=serializer_context
            ).data,
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
        logger.error(
            "Error en orden_publica para sede %s mesa %s", sede_id, mesa_id, exc_info=True
        )
        return Response({"error": "Ocurrió un error interno en el servidor."}, status=500)


# ============================================================
# AUTH
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_sesion(request):
    user = request.user
    ws_token = AccessToken.for_user(user)
    return Response({
        'autenticado': True,
        'ws_token': str(ws_token),
        'user': {
            'username': request.user.username,
            'rol': 'Dueño' if hasattr(request.user, 'negocio') else 'Empleado',
        }
    })