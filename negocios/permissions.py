from rest_framework import permissions

class EsDuenioOsoloLectura(permissions.BasePermission):
    """
    Permiso personalizado: 
    - Lectura (GET): Permitido para todos los autenticados.
    - Escritura (POST, PUT, PATCH, DELETE): Solo para el Dueño Supremo.
    """
    def has_permission(self, request, view):
        # Si la petición es de lectura (GET, HEAD, OPTIONS), dejamos pasar
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Si intenta escribir, revisamos que NO sea un empleado (Tablet)
        # El Dueño no envía la cabecera X-Empleado-Id desde su laptop
        es_empleado = request.headers.get('X-Empleado-Id')
        
        if es_empleado:
            return False # Un mortal intentó cambiar un precio, ¡Denegado!
            
        return True # Es el Dueño, puede hacer lo que quiera