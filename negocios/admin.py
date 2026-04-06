from django.contrib import admin
from .models import Negocio, Rol, Empleado, Mesa, Sede, Producto, Orden, DetalleOrden, Pago, ModificadorRapido, GrupoVariacion, OpcionVariacion

admin.site.register(Negocio)
admin.site.register(Rol)
# ¡Ojo! Aquí ya NO ponemos admin.site.register(Empleado)
admin.site.register(Mesa)
admin.site.register(Sede)
admin.site.register(Producto)
admin.site.register(Orden)
admin.site.register(DetalleOrden)
admin.site.register(Pago) # Lo registramos para que puedas ver los cobros en el admin

# 1. Registramos los modificadores rápidos ("Sin cebolla", etc)
admin.site.register(ModificadorRapido)

# 2. Creamos una vista en línea para las opciones
class OpcionVariacionInline(admin.TabularInline):
    model = OpcionVariacion
    extra = 1  # Cuántas filas vacías mostrar por defecto

# 3. Registramos el Grupo con sus opciones adentro
class GrupoVariacionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'producto', 'obligatorio']
    list_filter = ['producto']
    inlines = [OpcionVariacionInline] # Esto mete las opciones dentro del grupo

admin.site.register(GrupoVariacion, GrupoVariacionAdmin)

# 4. Registramos al Empleado con su vista personalizada (Esta es la forma correcta)
@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    # Agregamos negocio y sede a la vista de tabla
    list_display = ('nombre', 'rol', 'negocio', 'sede', 'pin', 'activo', 'ultimo_ingreso')
    search_fields = ('nombre', 'pin')
    # Y aquí agregamos filtros mágicos a la derecha
    list_filter = ('negocio', 'sede', 'rol', 'activo')