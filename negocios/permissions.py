# negocios/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class EsDuenioOsoloLectura(BasePermission):
    """
    🛡️ FIX #4: Versión segura de EsDuenioOsoloLectura.

    ANTES (vulnerable):
        La lógica anterior concedía acceso de escritura a cualquier usuario
        autenticado que simplemente OMITIERA el header X-Empleado-Id.
        Ejemplo: un empleado podía hacer PUT /api/productos/ sin el header
        y tenía permisos de Dueño.

    AHORA (seguro):
        Los permisos de escritura se conceden ÚNICAMENTE si el JWT pertenece
        a un usuario Django que tiene un negocio asociado (es Dueño/Admin real).
        La presencia o ausencia de X-Empleado-Id no afecta los permisos de escritura.

    Regla:
        - GET/HEAD/OPTIONS (SAFE_METHODS): permitido para cualquier usuario autenticado.
        - POST/PUT/PATCH/DELETE: solo si request.user tiene negocio (es Dueño).
    """

    def has_permission(self, request, view):
        # Debe estar autenticado para cualquier operación
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusuario del sistema: acceso total
        if request.user.is_superuser:
            return True

        # Lectura: cualquier usuario autenticado puede leer
        if request.method in SAFE_METHODS:
            return True

        # Escritura: solo usuarios con negocio asociado (Dueños/Admins del sistema)
        return hasattr(request.user, 'negocio')