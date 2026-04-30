import logging
import os
from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .helpers import es_valor_nulo, get_empleado_desde_header
from ..models import (
    Mesa, Producto, Categoria, GrupoVariacion, OpcionVariacion,
    RecetaDetalle, RecetaOpcion, ModificadorRapido
)
from ..serializers import (
    MesaSerializer, ProductoSerializer, CategoriaSerializer,
    GrupoVariacionSerializer, OpcionVariacionSerializer,
    RecetaOpcionSerializer, ModificadorRapidoSerializer
)
from ..permissions import EsDuenioOsoloLectura

logger = logging.getLogger(__name__)


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
    
    @action(
        detail=True, 
        methods=['post'], 
        url_path='subir_imagen', 
        parser_classes=[MultiPartParser, FormParser]
    )
    def subir_imagen(self, request, pk=None):
        producto = self.get_object()
        archivo = request.FILES.get('imagen')

        if not archivo:
            return Response({'error': 'No se recibió ninguna imagen'}, status=400)

        # Validamos que sea una imagen web friendly
        ext = os.path.splitext(archivo.name)[1].lower()
        if ext not in ('.png', '.jpg', '.jpeg', '.webp'):
            return Response({'error': 'Formato no permitido. Usa PNG, JPG o WEBP'}, status=400)

        # Si el producto ya tenía una foto, la borramos para no llenar el disco de basura
        if producto.imagen:
            producto.imagen.delete(save=False)

        producto.imagen = archivo
        producto.save()

        # Devolvemos la URL absoluta para que React la pinte al instante
        url = request.build_absolute_uri(producto.imagen.url)
        return Response({'ok': True, 'url': url})


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
