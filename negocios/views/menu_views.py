import logging
import os
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .helpers import es_valor_nulo, get_empleado_desde_header
from ..models import (
    ComponenteCombo, Mesa, Producto, Categoria, GrupoVariacion, OpcionVariacion,
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

        # Empleado autenticado por PIN → solo ve las mesas de su sede
        if empleado:
            return queryset.filter(sede=empleado.sede)

        # Dueño/admin autenticado por JWT → filtra por sede_id si se indica
        sede_id = self.request.query_params.get('sede_id')
        if not es_valor_nulo(sede_id):
            queryset = queryset.filter(sede_id=sede_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Si existe una mesa inactiva (activo=False) con el mismo sede+nombre,
        la reactivamos en lugar de intentar insertar una nueva fila que violaría
        el unique_together a nivel de base de datos.
        Esto le da al dueño una experiencia limpia: "crear mesa" = activarla si ya existió.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sede  = serializer.validated_data.get('sede')
        nombre = serializer.validated_data.get('numero_o_nombre')

        # ¿Hay una mesa inactiva con ese mismo sede+nombre?
        mesa_inactiva = Mesa.all_objects.filter(
            sede=sede, numero_o_nombre=nombre, activo=False
        ).first()

        if mesa_inactiva:
            # Actualizar campos editables y reactivar
            for campo in ('capacidad', 'posicion_x', 'posicion_y', 'forma'):
                val = serializer.validated_data.get(campo)
                if val is not None:
                    setattr(mesa_inactiva, campo, val)
            mesa_inactiva.activo = True
            mesa_inactiva.save()
            return Response(
                self.get_serializer(mesa_inactiva).data,
                status=status.HTTP_201_CREATED,
            )

        # Camino normal: no existe ninguna mesa inactiva con ese nombre
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


# ============================================================
# PRODUCTO
# ============================================================

class ProductoViewSet(viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    permission_classes = [EsDuenioOsoloLectura]

    def get_queryset(self):
    # Excluimos los combos que pertenecen al modelo ComboPromocional
    # es_combo=True aquí solo aplica a combos NORMALES del módulo de platos
        queryset = Producto.objects.filter(
            activo=True
        ).prefetch_related('grupos_variacion__opciones')

        if self.request.user.is_superuser:
            negocio_id = self.request.query_params.get('negocio_id')
            if not es_valor_nulo(negocio_id):
                queryset = queryset.filter(negocio_id=negocio_id)
            return queryset

        if hasattr(self.request.user, 'negocio'):
            return queryset.filter(negocio=self.request.user.negocio)

        return queryset.none()

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
    
    @action(detail=True, methods=['post'], url_path='actualizar_items_combo')
    @transaction.atomic
    def actualizar_items_combo(self, request, pk=None):
        producto = self.get_object()
        if not producto.es_combo:
            return Response({"error": "Este producto no es un combo."}, status=400)
        
        items = request.data.get('items', [])
        ComponenteCombo.objects.filter(combo=producto).delete()
        for item in items:
            ComponenteCombo.objects.create(
                combo=producto,
                producto_hijo_id=item['producto_hijo_id'],
                cantidad=item.get('cantidad', 1),
                opcion_seleccionada_id=item.get('opcion_seleccionada_id') or None,
                variacion_seleccionada_id=item.get('variacion_seleccionada_id') or None,
            )
        return Response({"mensaje": "Items del combo actualizados."})


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
