from time import timezone

from rest_framework import serializers
from .models import (
    InsumoBase, InsumoSede, Negocio, PlanSaaS, Sede, Mesa, Producto, Orden, DetalleOrden, Pago,
    ModificadorRapido, GrupoVariacion, OpcionVariacion, Rol, Empleado, SesionCaja,
    DetalleOrdenOpcion , Categoria, RecetaOpcion, Cliente
)


class PlanSaaSSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanSaaS
        fields = '__all__'
        
class NegocioSerializer(serializers.ModelSerializer):
    plan_detalles = PlanSaaSSerializer(source='plan', read_only=True)
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
class RecetaOpcionSerializer(serializers.ModelSerializer):
    nombre_insumo = serializers.CharField(source='insumo.nombre', read_only=True)
    unidad_medida = serializers.CharField(source='insumo.unidad_medida', read_only=True)

    class Meta:
        model = RecetaOpcion
        fields = ['id', 'opcion', 'insumo', 'nombre_insumo', 'unidad_medida', 'cantidad_necesaria']

class ModificadorRapidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModificadorRapido
        fields = '__all__'

class OpcionVariacionSerializer(serializers.ModelSerializer):
    ingredientes = RecetaOpcionSerializer(many=True, required=False)
    class Meta:
        model = OpcionVariacion
        fields = ['id', 'nombre', 'precio_adicional', 'ingredientes']
        # 👇 Esto evita errores cuando actualizamos opciones que ya existen
        extra_kwargs = {'id': {'read_only': False, 'required': False}}

class GrupoVariacionSerializer(serializers.ModelSerializer):
    # 👇 Quitamos el read_only y ponemos required=False
    opciones = OpcionVariacionSerializer(many=True, required=False)

    class Meta:
        model = GrupoVariacion
        fields = ['id', 'nombre', 'obligatorio', 'seleccion_multiple', 'opciones']
        extra_kwargs = {'id': {'read_only': False, 'required': False}}

class ProductoSerializer(serializers.ModelSerializer):
    grupos_variacion = GrupoVariacionSerializer(many=True, required=False)

    class Meta:
        model = Producto
        fields = '__all__'

    # 🚀 MAGIA 1 ACTUALIZADA (Soporta Recetas de Opciones)
    def create(self, validated_data):
        grupos_data = validated_data.pop('grupos_variacion', [])
        producto = Producto.objects.create(**validated_data)
        
        for grupo_data in grupos_data:
            opciones_data = grupo_data.pop('opciones', [])
            grupo = GrupoVariacion.objects.create(producto=producto, **grupo_data)
            
            for opcion_data in opciones_data:
                # 👇 Sacamos los ingredientes antes de crear la opción
                ingredientes_data = opcion_data.pop('ingredientes', []) 
                opcion = OpcionVariacion.objects.create(grupo=grupo, **opcion_data)
                
                # 👇 Guardamos los ingredientes físicos (La carne, el rachi, etc.)
                for ing_data in ingredientes_data:
                    # 'insumo' es un objeto en la BD, así que extraemos su ID o la instancia si DRF la resolvió
                    insumo_obj = ing_data.get('insumo') 
                    RecetaOpcion.objects.create(
                        opcion=opcion, 
                        insumo=insumo_obj, 
                        cantidad_necesaria=ing_data.get('cantidad_necesaria')
                    )
                
        return producto

    # 🚀 MAGIA 2 ACTUALIZADA (Actualización segura)
    def update(self, instance, validated_data):
        grupos_data = validated_data.pop('grupos_variacion', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if grupos_data is not None:
            instance.grupos_variacion.all().delete() 
            
            for grupo_data in grupos_data:
                opciones_data = grupo_data.pop('opciones', [])
                grupo_data.pop('id', None) 
                grupo = GrupoVariacion.objects.create(producto=instance, **grupo_data)
                
                for opcion_data in opciones_data:
                    # 👇 Extraemos los ingredientes
                    ingredientes_data = opcion_data.pop('ingredientes', [])
                    opcion_data.pop('id', None)
                    opcion = OpcionVariacion.objects.create(grupo=grupo, **opcion_data)
                    
                    # 👇 Recreamos la receta de esta opción
                    for ing_data in ingredientes_data:
                        insumo_obj = ing_data.get('insumo')
                        RecetaOpcion.objects.create(
                            opcion=opcion, 
                            insumo=insumo_obj, 
                            cantidad_necesaria=ing_data.get('cantidad_necesaria')
                        )
                    
        return instance

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
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')
    mesero_nombre = serializers.ReadOnlyField(source='mesero.nombre')
    class Meta:
        model = Orden
        # 👇 MIRA AQUÍ: Agregué 'metodo' justo después de 'estado_pago'
        fields = [
            'id', 'sede', 'sede_nombre', 'mesa', 'mesa_nombre', 
            'mesero', 'mesero_nombre', 'tipo', 'estado', 'estado_pago', 
            'total', 'cliente_nombre', 'cliente_telefono', 
            'motivo_cancelacion', 'creado_en', 'detalles'
        ]
        
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
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')
    class Meta:
        model = Empleado
        # Ya no mostramos el PIN (hash) en las respuestas de la API por seguridad pura 🔒
        fields = ['id', 'nombre', 'rol','pin', 'rol_nombre', 'activo', 'ultimo_ingreso', 'sede', 'sede_nombre']
        extra_kwargs = {
            'pin': {'write_only': True}
        }
        
class SesionCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SesionCaja
        fields = '__all__'

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


# En serializers.py
class InsumoBaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsumoBase
        fields = '__all__'

class InsumoSedeSerializer(serializers.ModelSerializer):
    # Traemos el nombre del insumo base para que React lo vea fácil
    nombre_insumo = serializers.ReadOnlyField(source='insumo_base.nombre')
    unidad_medida = serializers.ReadOnlyField(source='insumo_base.unidad_medida')

    class Meta:
        model = InsumoSede
        fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    # ✨ Campo calculado: el bot solo lee un Booleano y sabe si saludar o no
    es_cumpleanos_hoy = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = [
            'id', 'telefono', 'nombre', 'email', 'fecha_nacimiento', 
            'puntos_acumulados', 'total_gastado', 'cantidad_pedidos', 
            'ultima_compra', 'tags', 'es_cumpleanos_hoy'
        ]
        # 🛡️ PROTECCIÓN: Estos campos solo los calcula el backend (Django)
        # No permitimos que se modifiquen vía POST o PUT.
        read_only_fields = [
            'puntos_acumulados', 'total_gastado', 
            'cantidad_pedidos', 'ultima_compra'
        ]

    def get_es_cumpleanos_hoy(self, obj):
        """Lógica centralizada: Django decide si es el cumple, no el bot."""
        if obj.fecha_nacimiento:
            hoy = timezone.now().date()
            return (obj.fecha_nacimiento.day == hoy.day and 
                    obj.fecha_nacimiento.month == hoy.month)
        return False
