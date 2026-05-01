import logging

from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import viewsets, status
from rest_framework.decorators import action, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .helpers import es_valor_nulo
from ..models import Rol, Empleado
from ..serializers import RolSerializer, EmpleadoSerializer

logger = logging.getLogger(__name__)


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

        if self.request.user.is_superuser:
            pass

        elif hasattr(self.request.user, 'negocio'):
            queryset = queryset.filter(negocio=self.request.user.negocio)

            sede_id = self.request.query_params.get('sede_id')
            negocio_id = self.request.query_params.get('negocio_id')
            if not es_valor_nulo(sede_id):
                queryset = queryset.filter(sede_id=sede_id)
            elif not es_valor_nulo(negocio_id):
                queryset = queryset.filter(negocio_id=negocio_id)

        elif empleado_solicitante_id:
            try:
                empleado_actual = Empleado.objects.select_related('rol').get(id=empleado_solicitante_id)
                queryset = queryset.filter(sede=empleado_actual.sede)
            except Empleado.DoesNotExist:
                return queryset.none()

        else:
            return queryset.none()

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
            pin_stored = emp.pin
            es_plano = not pin_stored.startswith(('pbkdf2_', 'argon2', 'bcrypt', '!'))

            if es_plano:
                if pin_stored == pin_ingresado:
                    emp.pin = make_password(pin_ingresado)
                    emp.save(update_fields=['pin'])
                    empleado_valido = emp
                    break
                continue

            if check_password(pin_ingresado, pin_stored):
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
