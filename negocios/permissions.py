from rest_framework import permissions

class EsDuenioOsoloLectura(permissions.BasePermission):
    """
    Permiso personalizado:
    - Lectura (GET, HEAD, OPTIONS): Permitido para todos los autenticados.
    - Escritura (POST, PUT, PATCH, DELETE): Solo para el propietario de un
      negocio (user con relación OneToOne negocio) o para un superusuario.

    NO se basa en la presencia o ausencia del header X-Empleado-Id, que es
    un dato controlado por el cliente y por tanto falsificable.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Solo el dueño (user con negocio asociado) o el superadmin pueden escribir
        return request.user.is_superuser or hasattr(request.user, 'negocio')