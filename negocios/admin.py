from django.contrib import admin
# ✨ Agregamos PlanSaaS a la lista de importaciones
from .models import InsumoSede, InsumoBase,Negocio, RecetaDetalle, Rol, MovimientoCaja, Empleado, Mesa, Sede, Producto, Orden, DetalleOrden, Pago, ModificadorRapido, GrupoVariacion, OpcionVariacion, PlanSaaS

# Quitamos el admin.site.register(Negocio) que estaba aquí para hacerlo más pro abajo
admin.site.register(Rol)
admin.site.register(Mesa)
admin.site.register(Sede)
admin.site.register(Producto)
admin.site.register(Orden)
admin.site.register(DetalleOrden)
admin.site.register(Pago) 
admin.site.register(InsumoBase)
admin.site.register(InsumoSede)
admin.site.register(RecetaDetalle)
# 1. Registramos los modificadores rápidos ("Sin cebolla", etc)
admin.site.register(ModificadorRapido)

# 2. Creamos una vista en línea para las opciones
class OpcionVariacionInline(admin.TabularInline):
    model = OpcionVariacion
    extra = 1  

# 3. Registramos el Grupo con sus opciones adentro
class GrupoVariacionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'producto', 'obligatorio']
    list_filter = ['producto']
    inlines = [OpcionVariacionInline] 

admin.site.register(GrupoVariacion, GrupoVariacionAdmin)

# 4. Registramos al Empleado con su vista personalizada
@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'rol', 'negocio', 'sede', 'pin', 'activo', 'ultimo_ingreso')
    search_fields = ('nombre', 'pin')
    list_filter = ('negocio', 'sede', 'rol', 'activo')

@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ('id', 'sede', 'sesion_caja', 'get_tipo_display', 'monto', 'concepto', 'empleado', 'fecha')
    list_filter = ('tipo', 'fecha', 'sede', 'empleado')
    search_fields = ('concepto', 'empleado__nombre')
    readonly_fields = ('fecha',)
    ordering = ('-fecha',)

# ==========================================
# 🚀 5. CONFIGURACIÓN DEL SAAS MULTI-TENANT
# ==========================================

@admin.register(PlanSaaS)
class PlanSaaSAdmin(admin.ModelAdmin):
    # Columnas que verás en la lista de planes
    list_display = ('nombre', 'precio_mensual', 'max_sedes', 'modulo_kds', 'modulo_inventario', 'modulo_delivery')
    # Permitir activar/desactivar módulos directamente desde la tabla general
    list_editable = ('modulo_kds', 'modulo_inventario', 'modulo_delivery')

@admin.register(Negocio)
class NegocioAdmin(admin.ModelAdmin):
    # Vista mejorada para ver qué plan tiene cada negocio
    list_display = ('nombre', 'propietario', 'plan', 'activo')
    list_filter = ('plan', 'activo')
    search_fields = ('nombre', 'propietario__username')