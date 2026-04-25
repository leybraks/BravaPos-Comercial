from django.contrib import admin
from .models import (
    InsumoSede, InsumoBase, Negocio, RecetaDetalle, Rol, MovimientoCaja, 
    Empleado, Mesa, Sede, Producto, Orden, DetalleOrden, Pago, 
    ModificadorRapido, GrupoVariacion, OpcionVariacion, PlanSaaS,
    # ✨ IMPORTAMOS TUS NUEVOS MODELOS DE CRM Y MARKETING ✨
    Cliente, ZonaDelivery, ReglaNegocio, CuponPromocional, 
    HorarioVisibilidad, ComponenteCombo
)

admin.site.register(Rol)
admin.site.register(Mesa)
admin.site.register(Sede)
admin.site.register(Orden)
admin.site.register(DetalleOrden)
admin.site.register(Pago) 
admin.site.register(InsumoBase)
admin.site.register(InsumoSede)
admin.site.register(RecetaDetalle)
admin.site.register(ModificadorRapido)

# ==========================================
# 1. VARIACIONES DE PRODUCTO
# ==========================================
class OpcionVariacionInline(admin.TabularInline):
    model = OpcionVariacion
    extra = 1  

@admin.register(GrupoVariacion)
class GrupoVariacionAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'producto', 'obligatorio']
    list_filter = ['producto']
    inlines = [OpcionVariacionInline] 

# ==========================================
# 2. GESTIÓN DE EMPLEADOS Y CAJA
# ==========================================
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
# 🚀 3. CONFIGURACIÓN DEL SAAS MULTI-TENANT
# ==========================================
@admin.register(PlanSaaS)
class PlanSaaSAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio_mensual', 'max_sedes', 'modulo_kds', 'modulo_inventario', 'modulo_delivery')
    list_editable = ('modulo_kds', 'modulo_inventario', 'modulo_delivery')

@admin.register(Negocio)
class NegocioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'propietario', 'plan', 'activo')
    list_filter = ('plan', 'activo')
    search_fields = ('nombre', 'propietario__username')

# ==========================================
# 📊 4. CRM Y MARKETING (¡LO NUEVO!)
# ==========================================
@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'telefono', 'negocio', 'puntos_acumulados', 'total_gastado', 'cantidad_pedidos')
    search_fields = ('nombre', 'telefono')
    list_filter = ('negocio', 'tags') # Permite filtrar para ver quiénes son "VIP"
    readonly_fields = ('ultima_compra',)

@admin.register(ReglaNegocio)
class ReglaNegocioAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'valor', 'es_porcentaje', 'negocio', 'activa')
    list_filter = ('tipo', 'activa', 'negocio')

@admin.register(CuponPromocional)
class CuponPromocionalAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'monto_descuento', 'es_porcentaje', 'fecha_expiracion', 'activo')
    list_filter = ('activo', 'negocio')
    search_fields = ('codigo',)

@admin.register(ZonaDelivery)
class ZonaDeliveryAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'sede', 'costo_envio', 'pedido_minimo', 'activa')
    list_filter = ('sede', 'activa')
    search_fields = ('nombre', 'distritos_cobertura')

# ==========================================
# 🍔 5. PRODUCTOS AVANZADOS (COMBOS Y HORARIOS)
# ==========================================
class ComponenteComboInline(admin.TabularInline):
    model = ComponenteCombo
    fk_name = 'combo' # Especificamos cuál llave foránea usar (porque hay 2 hacia Producto)
    extra = 1

class HorarioVisibilidadInline(admin.StackedInline):
    model = HorarioVisibilidad
    extra = 0

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio_base', 'categoria', 'negocio', 'es_combo', 'destacar_como_promocion', 'disponible')
    list_filter = ('negocio', 'categoria', 'es_combo', 'destacar_como_promocion', 'disponible')
    search_fields = ('nombre',)
    # Permitir editar cosas rápidas sin entrar al detalle
    list_editable = ('precio_base', 'disponible', 'es_combo', 'destacar_como_promocion')
    
    # ¡Magia! Mostrar los componentes y horarios dentro del mismo producto
    inlines = [HorarioVisibilidadInline, ComponenteComboInline]