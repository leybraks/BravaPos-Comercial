from rest_framework import serializers
from .models import (
    Negocio, Sede, Mesa, Producto, Orden, DetalleOrden, Pago,
    ModificadorRapido, GrupoVariacion, OpcionVariacion, Rol, Empleado, SesionCaja
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
    # Traemos el nombre de la sede como lectura para que el Frontend lo muestre fácil
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')
    
    class Meta:
        model = Mesa
        fields = '__all__'

# ==========================================
# NUEVOS SERIALIZADORES: MODIFICADORES Y VARIACIONES
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
    # Anidamos las opciones para que vengan dentro del grupo automáticamente
    opciones = OpcionVariacionSerializer(many=True, read_only=True)

    class Meta:
        model = GrupoVariacion
        fields = '__all__'

# ==========================================
# PRODUCTO (Ahora con los grupos incluidos)
# ==========================================
class ProductoSerializer(serializers.ModelSerializer):
    # React recibirá el producto y la lista completa de sus variantes en 1 solo viaje
    grupos_variacion = GrupoVariacionSerializer(many=True, read_only=True)

    class Meta:
        model = Producto
        fields = '__all__'

# ==========================================
# ORDEN Y DETALLE (Con la magia del JSON)
# ==========================================
class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    # Eliminamos 'variacion_nombre' porque ahora todo vive en el campo JSON 'notas_y_modificadores'

    class Meta:
        model = DetalleOrden
        fields = '__all__'
        read_only_fields = ['orden']

class OrdenSerializer(serializers.ModelSerializer):
    detalles = DetalleOrdenSerializer(many=True)
    mesa_nombre = serializers.ReadOnlyField(source='mesa.numero_o_nombre')

    class Meta:
        model = Orden
        fields = '__all__'

    # ==========================================
    # LA MAGIA DE LA VELOCIDAD: BULK CREATE[cite: 1]
    # (¡Funciona perfecto con el nuevo JSONField!)
    # ==========================================
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        
        # 1. Creamos la Orden (1 solo viaje a la BD)[cite: 1]
        orden = Orden.objects.create(**validated_data)
        
        # 2. Preparamos todos los platillos en la memoria RAM[cite: 1]
        detalles_a_crear = [
            DetalleOrden(orden=orden, **detalle_data) 
            for detalle_data in detalles_data
        ]
        
        # 3. Guardamos los platillos de golpe (1 solo viaje a la BD)[cite: 1]
        DetalleOrden.objects.bulk_create(detalles_a_crear)
            
        return orden

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
        fields = ['id', 'nombre', 'pin', 'rol', 'rol_nombre', 'activo', 'ultimo_ingreso']


class SesionCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SesionCaja
        fields = '__all__'




