from rest_framework import serializers
from .models import (
    Negocio, Sede, Mesa, Producto, Orden, DetalleOrden, Pago,
    ModificadorRapido, GrupoVariacion, OpcionVariacion, Rol, Empleado, SesionCaja,
    DetalleOrdenOpcion # ✨ IMPORTACIÓN AÑADIDA
)

class NegocioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Negocio
        fields = '__all__'

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = '__all__'

class MesaSerializer(serializers.ModelSerializer):
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')
    
    class Meta:
        model = Mesa
        fields = '__all__'

# ==========================================
# SERIALIZADORES: MODIFICADORES Y VARIACIONES
# ==========================================
class ModificadorRapidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModificadorRapido
        fields = '__all__'

class OpcionVariacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionVariacion
        fields = '__all__'

class GrupoVariacionSerializer(serializers.ModelSerializer):
    opciones = OpcionVariacionSerializer(many=True, read_only=True)

    class Meta:
        model = GrupoVariacion
        fields = '__all__'

# ==========================================
# PRODUCTO
# ==========================================
class ProductoSerializer(serializers.ModelSerializer):
    grupos_variacion = GrupoVariacionSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = '__all__'

# ==========================================
# ORDEN Y DETALLES (Arquitectura 10/10)
# ==========================================

# ✨ NUEVO: Para que la cocina sepa qué opciones eligió el cliente
class DetalleOrdenOpcionSerializer(serializers.ModelSerializer):
    opcion_nombre = serializers.ReadOnlyField(source='opcion_variacion.nombre')

    class Meta:
        model = DetalleOrdenOpcion
        fields = ['id', 'opcion_nombre', 'precio_adicional_aplicado']

class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    # ✨ NUEVO: Anidamos las opciones para que viajen junto con el plato
    opciones_seleccionadas = DetalleOrdenOpcionSerializer(many=True, read_only=True)

    class Meta:
        model = DetalleOrden
        fields = ['id', 'orden', 'producto', 'producto_nombre', 'cantidad', 
                  'precio_unitario', 'notas_y_modificadores', 'notas_cocina', 
                  'opciones_seleccionadas']
        read_only_fields = ['orden']

class OrdenSerializer(serializers.ModelSerializer):
    # ✨ CRUCIAL: Añadimos read_only=True. 
    # Esto le dice a DRF: "Muestra los detalles al leer, pero cuando guardemos, yo lo haré manual en views.py"
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    mesa_nombre = serializers.ReadOnlyField(source='mesa.numero_o_nombre')

    class Meta:
        model = Orden
        fields = ['id', 'sede', 'mesa', 'mesa_nombre', 'tipo', 'estado', 
                  'estado_pago', 'total', 'cliente_nombre', 'cliente_telefono', 
                  'motivo_cancelacion', 'creado_en', 'detalles']
        
    # 🧹 ELIMINADO: Quitamos el def create() con bulk_create. 
    # Ahora la magia segura y atómica ocurre 100% en tu views.py

class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'

class EmpleadoSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

    class Meta:
        model = Empleado
        # Ya no mostramos el PIN (hash) en las respuestas de la API por seguridad pura 🔒
        fields = ['id', 'nombre', 'rol', 'rol_nombre', 'activo', 'ultimo_ingreso']

class SesionCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SesionCaja
        fields = '__all__'