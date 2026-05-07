from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction
from django.db.models import Q

from ..models import (
    ReglaNegocio, HorarioVisibilidad,
    Producto, ComboPromocional, ItemComboPromocional,
    OpcionVariacion, VariacionProducto, Categoria
)
from ..serializers import (
    ComboPromocionalSerializer,
    HorarioVisibilidadSerializer,
    ReglaNegocioSerializer,
)


# ============================================================
# HAPPY HOURS
# ============================================================

class HappyHourView(APIView):
    """
    GET  → lista todos los happy hours del negocio
    POST → crea uno nuevo
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        negocio = request.user.negocio
        sede_id = request.query_params.get('sede_id')

        horarios = HorarioVisibilidad.objects.filter(negocio=negocio)
        
        if sede_id:
            # Trae las de esta sede específica + las globales (sede=null)
            horarios = horarios.filter(
                Q(sede_id=sede_id) | Q(sede__isnull=True)
            )
        
        return Response(HorarioVisibilidadSerializer(horarios, many=True).data)

    @transaction.atomic
    def post(self, request):
        negocio = request.user.negocio
        data = request.data.copy()

        # Validar compra_x / lleva_y antes de guardar
        tipo = data.get('tipo_promo')
        if tipo == 'nx_y':
            compra_x = int(data.get('compra_x', 2))
            lleva_y = int(data.get('lleva_y', 1))
            if compra_x > 6:
                return Response({'error': 'compra_x no puede ser mayor a 6.'}, status=400)
            if lleva_y >= compra_x:
                return Response({'error': 'lleva_y debe ser menor que compra_x.'}, status=400)

        serializer = HorarioVisibilidadSerializer(data=data)
        if serializer.is_valid():
            serializer.save(negocio=negocio)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HappyHourDetalleView(APIView):
    """
    GET    → detalle de un happy hour
    PUT    → actualiza
    PATCH  → activa/desactiva
    DELETE → elimina
    """
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        try:
            return HorarioVisibilidad.objects.get(pk=pk, negocio=request.user.negocio)
        except HorarioVisibilidad.DoesNotExist:
            return None

    def get(self, request, pk):
        hh = self._get(request, pk)
        if not hh:
            return Response({'error': 'No encontrado.'}, status=404)
        return Response(HorarioVisibilidadSerializer(hh).data)

    @transaction.atomic
    def put(self, request, pk):
        hh = self._get(request, pk)
        if not hh:
            return Response({'error': 'No encontrado.'}, status=404)

        tipo = request.data.get('tipo_promo', hh.tipo_promo)
        if tipo == 'nx_y':
            compra_x = int(request.data.get('compra_x', hh.compra_x))
            lleva_y = int(request.data.get('lleva_y', hh.lleva_y))
            if compra_x > 6:
                return Response({'error': 'compra_x no puede ser mayor a 6.'}, status=400)
            if lleva_y >= compra_x:
                return Response({'error': 'lleva_y debe ser menor que compra_x.'}, status=400)

        serializer = HorarioVisibilidadSerializer(hh, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        """Solo para activar/desactivar"""
        hh = self._get(request, pk)
        if not hh:
            return Response({'error': 'No encontrado.'}, status=404)
        hh.activa = request.data.get('activa', hh.activa)
        hh.save()
        return Response(HorarioVisibilidadSerializer(hh).data)

    def delete(self, request, pk):
        hh = self._get(request, pk)
        if not hh:
            return Response({'error': 'No encontrado.'}, status=404)
        hh.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# REGLAS DE NEGOCIO
# ============================================================

class ReglaNegocioView(APIView):
    """
    GET  → lista todas las reglas del negocio
    POST → crea una nueva
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        negocio = request.user.negocio
        reglas = ReglaNegocio.objects.filter(negocio=negocio)
        return Response(ReglaNegocioSerializer(reglas, many=True).data)

    @transaction.atomic
    def post(self, request):
        negocio = request.user.negocio
        serializer = ReglaNegocioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(negocio=negocio)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)


class ReglaNegocioDetalleView(APIView):
    """
    GET    → detalle
    PUT    → actualiza
    PATCH  → activa/desactiva
    DELETE → elimina
    """
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        try:
            return ReglaNegocio.objects.get(pk=pk, negocio=request.user.negocio)
        except ReglaNegocio.DoesNotExist:
            return None

    def get(self, request, pk):
        regla = self._get(request, pk)
        if not regla:
            return Response({'error': 'No encontrado.'}, status=404)
        return Response(ReglaNegocioSerializer(regla).data)

    @transaction.atomic
    def put(self, request, pk):
        regla = self._get(request, pk)
        if not regla:
            return Response({'error': 'No encontrado.'}, status=404)
        serializer = ReglaNegocioSerializer(regla, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def patch(self, request, pk):
        """Solo para activar/desactivar"""
        regla = self._get(request, pk)
        if not regla:
            return Response({'error': 'No encontrado.'}, status=404)
        regla.activa = request.data.get('activa', regla.activa)
        regla.save()
        return Response(ReglaNegocioSerializer(regla).data)

    def delete(self, request, pk):
        regla = self._get(request, pk)
        if not regla:
            return Response({'error': 'No encontrado.'}, status=404)
        regla.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# COMBOS PROMOCIONALES (sin cambios)
# ============================================================

class ComboPromocionalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        negocio = request.user.negocio
        sede_id = request.query_params.get('sede_id')

        combos = ComboPromocional.objects.filter(
            negocio=negocio, activo=True
        ).prefetch_related(
            'items__producto__grupos_variacion__opciones',
            'items__producto__variaciones',
            'items__opcion_seleccionada',
            'items__variacion_seleccionada',
        )

        if sede_id:
            combos = combos.filter(
                Q(sede_id=sede_id) | Q(sede__isnull=True)
            )

        return Response(ComboPromocionalSerializer(combos, many=True).data)

    @transaction.atomic
    def post(self, request):
        negocio = request.user.negocio
        data = request.data
        items = data.get('items', [])

        combo = ComboPromocional.objects.create(
            negocio=negocio,
            sede_id=data.get('sede') or None,  # 👈
            nombre=data.get('nombre'),
            precio=float(data.get('precio', 0)),
            rangos_fechas=data.get('rangos_fechas', []),
            activo=True,
        )

        for item in items:
            ItemComboPromocional.objects.create(
                combo=combo,
                producto_id=item['productoId'],
                cantidad=item.get('cantidad', 1),
                opcion_seleccionada_id=item.get('opcionSeleccionadaId') or None,
                variacion_seleccionada_id=item.get('variacionSeleccionadaId') or None,
            )

        return Response(ComboPromocionalSerializer(combo).data, status=status.HTTP_201_CREATED)

class ComboPromocionalDetalleView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_combo(self, request, pk):
        try:
            return ComboPromocional.objects.get(pk=pk, negocio=request.user.negocio)
        except ComboPromocional.DoesNotExist:
            return None

    def get(self, request, pk):
        combo = self._get_combo(request, pk)
        if not combo:
            return Response({'error': 'No encontrado'}, status=404)
        return Response(ComboPromocionalSerializer(combo).data)

    @transaction.atomic
    def put(self, request, pk):
        combo = self._get_combo(request, pk)
        if not combo:
            return Response({'error': 'No encontrado'}, status=404)

        data = request.data
        combo.nombre = data.get('nombre', combo.nombre)
        combo.precio = float(data.get('precio', combo.precio))
        combo.rangos_fechas = data.get('rangos_fechas', combo.rangos_fechas)
        combo.activo = data.get('activo', combo.activo)
        combo.sede_id = data.get('sede', combo.sede_id) or None  # 👈
        combo.save()

        items = data.get('items')
        if items is not None:
            ItemComboPromocional.objects.filter(combo=combo).delete()
            for item in items:
                ItemComboPromocional.objects.create(
                    combo=combo,
                    producto_id=item['productoId'],
                    cantidad=item.get('cantidad', 1),
                    opcion_seleccionada_id=item.get('opcionSeleccionadaId') or None,
                    variacion_seleccionada_id=item.get('variacionSeleccionadaId') or None,
                )

        return Response(ComboPromocionalSerializer(combo).data)

    def delete(self, request, pk):
        combo = self._get_combo(request, pk)
        if not combo:
            return Response({'error': 'No encontrado'}, status=404)
        combo.activo = False
        combo.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# MARKETING GLOBAL (legado — mantener por compatibilidad)
# ============================================================

class MarketingGlobalView(APIView):
    """
    Endpoint legado. Solo devuelve un resumen de todo para el frontend viejo.
    Los nuevos endpoints están separados por entidad.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        negocio = request.user.negocio

        reglas = ReglaNegocio.objects.filter(negocio=negocio)
        horarios = HorarioVisibilidad.objects.filter(negocio=negocio)
        combos = ComboPromocional.objects.filter(negocio=negocio, activo=True).prefetch_related(
            'items__producto__grupos_variacion__opciones',
            'items__producto__variaciones',
        )

        return Response({
            "reglas": ReglaNegocioSerializer(reglas, many=True).data,
            "horarios": HorarioVisibilidadSerializer(horarios, many=True).data,
            "combos_campania": ComboPromocionalSerializer(combos, many=True).data,
        })