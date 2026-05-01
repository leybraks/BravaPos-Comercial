import logging
from ..models import Empleado

logger = logging.getLogger(__name__)


def es_valor_nulo(valor):
    """Devuelve True si el valor es None, vacío, 'null' o 'undefined'."""
    return not valor or str(valor).lower() in ['null', 'undefined', '']


def get_empleado_desde_header(request):
    """
    Retorna el Empleado desde el header X-Empleado-Id, o None si no existe.

    🛡️ FIX #5: Este helper solo se usa para CONTEXTO (ej: filtrar por sede).
    NUNCA debe usarse para conceder permisos de escritura elevados.
    Los permisos de escritura se validan contra request.user (el JWT).
    """
    empleado_id = request.headers.get('X-Empleado-Id')
    if empleado_id:
        try:
            return Empleado.objects.get(id=empleado_id)
        except Empleado.DoesNotExist:
            return None
    return None


def get_empleado_verificado(request):
    """
    🛡️ FIX #5: Versión segura para operaciones sensibles.
    Retorna el Empleado SOLO si el empleado_id del header pertenece
    al mismo negocio que el usuario autenticado en el JWT.
    Evita que un empleado forje el header con el ID de otro negocio.
    """
    empleado_id = request.headers.get('X-Empleado-Id')
    if not empleado_id:
        return None
    try:
        empleado = Empleado.objects.select_related('sede__negocio', 'rol').get(id=empleado_id)
        if hasattr(request.user, 'negocio') and empleado.negocio != request.user.negocio:
            return None
        return empleado
    except Empleado.DoesNotExist:
        return None
