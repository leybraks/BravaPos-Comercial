from django.db import models
from django.contrib.auth.models import User

class PlanSaaS(models.Model):
    nombre = models.CharField(max_length=50)
    precio_mensual = models.DecimalField(max_digits=8, decimal_places=2)
    modulo_kds = models.BooleanField(default=False, help_text="¿Tiene pantalla de cocina?")
    modulo_inventario = models.BooleanField(default=False)
    modulo_delivery = models.BooleanField(default=False)
    max_sedes = models.IntegerField(default=1)

    def __str__(self):
        return self.nombre

class Negocio(models.Model):
    propietario = models.OneToOneField(User, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fin_prueba = models.DateTimeField() # Para el demo de 15 días
    activo = models.BooleanField(default=True)
    
    # Switches de los módulos (Controlados por el ERP)
    mod_cocina_activo = models.BooleanField(default=False)
    mod_inventario_activo = models.BooleanField(default=False)
    mod_analiticas_activo = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre

# ==========================================
# ¡NUEVO! EL PUENTE PARA ESCALAR A MÚLTIPLES LOCALES
# ==========================================
class Sede(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE, related_name='sedes')
    nombre = models.CharField(max_length=100) # Ej: "Local Ventanilla", "Sede Centro"
    direccion = models.CharField(max_length=200, null=True, blank=True)
    
    def __str__(self):
        return f"{self.nombre} ({self.negocio.nombre})"

class Mesa(models.Model):
    # Cambio clave: La mesa ahora pertenece a la Sede, no al Negocio general
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE) 
    numero_o_nombre = models.CharField(max_length=20)
    capacidad = models.IntegerField(default=2)
    mesa_principal = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='mesas_unidas')
    
    def __str__(self):
        return f"{self.numero_o_nombre} - {self.sede.nombre}"

class Producto(models.Model):
    # El producto sigue siendo del Negocio (Menú global)
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    es_venta_rapida = models.BooleanField(default=False)
    precio_base = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    disponible = models.BooleanField(default=True)
    tiene_variaciones = models.BooleanField(default=False)
    requiere_seleccion = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.nombre} (S/ {self.precio_base})"

class VariacionProducto(models.Model):
    producto = models.ForeignKey(Producto, related_name='variaciones', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: "Personal", "Familiar", "1 Litro"
    precio = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.producto.nombre} - {self.nombre} (S/ {self.precio})"

class Orden(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('preparando', 'En Cocina'),
        ('listo', 'Listo para entregar'),
        ('pagado', 'Pagado y Cerrado'),
        ('cancelado', 'Cancelado')
    ]
    TIPO_CHOICES = [
        ('salon', 'En Salón'),
        ('llevar', 'Para Llevar'),
        ('delivery', 'Delivery')
    ]
    
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE)
    mesa = models.ForeignKey(Mesa, on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='salon')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # --- NUEVOS CAMPOS PARA DELIVERY / LLEVAR ---
    cliente_nombre = models.CharField(max_length=100, null=True, blank=True)
    cliente_telefono = models.CharField(max_length=20, null=True, blank=True)
    pago_confirmado = models.BooleanField(default=False)
    cancelado = models.BooleanField(default=False)
    motivo_cancelacion = models.CharField(max_length=255, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Si tiene mesa, muestra la mesa. Si no, muestra el nombre del cliente o el tipo.
        origen = f"Mesa {self.mesa.numero_o_nombre}" if self.mesa else (self.cliente_nombre or self.get_tipo_display())
        return f"Orden #{self.id} - {origen} - {self.estado}"

class DetalleOrden(models.Model):
    orden = models.ForeignKey(Orden, related_name='detalles', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    # variacion = models.ForeignKey('VariacionProducto', on_delete=models.PROTECT, null=True, blank=True)
    cantidad = models.IntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    notas_y_modificadores = models.JSONField(default=dict, blank=True)
    notas_cocina = models.TextField(blank=True, null=True)
    def __str__(self):
        variacion_texto = f" ({self.variacion.nombre})" if self.variacion else ""
        return f"{self.cantidad}x {self.producto.nombre}{variacion_texto}"

class Pago(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta (Visa/MC)'),
        ('yape_plin', 'Yape / Plin'),
    ]
    
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='pagos')
    metodo = models.CharField(max_length=20, choices=METODOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_pago = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"S/ {self.monto} en {self.get_metodo_display()} (Orden #{self.orden.id})"
    

# Estos son globales para el negocio. Ej: "Sin cebolla", "Poco arroz", "Bien cocido".
class ModificadorRapido(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre


# Agrupa las opciones. Ej: "Tamaño de la Pizza", "Cortes del Mixto", "Cremas extra"
class GrupoVariacion(models.Model):
    producto = models.ForeignKey(Producto, related_name='grupos_variacion', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: "Elige tu Tamaño"
    obligatorio = models.BooleanField(default=True) # Si es True, el mesero DEBE elegir algo
    seleccion_multiple = models.BooleanField(default=False) # False para Tamaño (solo 1), True para Cremas (varias)

    def __str__(self):
        return f"{self.nombre} - {self.producto.nombre}"

# Ej: "Familiar (+ S/35)", "Rachi (+ S/0)", "Extra Tocino (+ S/5)"
class OpcionVariacion(models.Model):
    grupo = models.ForeignKey(GrupoVariacion, related_name='opciones', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    # Cuánto suma al precio_base del producto. Si la Pizza Hawaiana base cuesta 0, la opción Familiar suma 35.
    precio_adicional = models.DecimalField(max_digits=8, decimal_places=2, default=0.00) 

    def __str__(self):
        return f"{self.nombre} (+S/ {self.precio_adicional})"
    
# models.py
from django.db import models

class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    # Aquí podrías agregar booleanos para permisos específicos si quieres algo muy granular
    puede_cobrar = models.BooleanField(default=False)
    puede_configurar = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre

class Empleado(models.Model):
    # Relaciones vitales para el multi-local
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='empleados', null=True)
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, related_name='empleados')
    
    nombre = models.CharField(max_length=100)
    pin = models.CharField(max_length=4) # Le quitamos el unique=True global
    rol = models.ForeignKey('Rol', on_delete=models.SET_NULL, null=True, related_name='empleados')
    activo = models.BooleanField(default=True)
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)

    class Meta:
        # MAGIA: El PIN no puede repetirse, pero SOLO dentro del mismo negocio
        unique_together = ('pin', 'negocio')

    def __str__(self):
        return f"{self.nombre} ({self.rol.nombre if self.rol else 'Sin Rol'})"


class SesionCaja(models.Model):
    # Relacionamos con la sede para que el cierre sea por local
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, null=True) 
    empleado_abre = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, related_name='aperturas')
    empleado_cierra = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, related_name='cierres')
    
    hora_apertura = models.DateTimeField(auto_now_add=True)
    hora_cierre = models.DateTimeField(null=True, blank=True)
    
    fondo_inicial = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Campos de resumen (se calculan al cerrar)
    ventas_efectivo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ventas_digitales = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    
    estado = models.CharField(max_length=20, default='abierta') # 'abierta', 'cerrada'
    # 1. Lo que el sistema calculó que debería haber (se llena al cerrar)
    esperado_efectivo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    esperado_digital = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # 2. Lo que el cajero contó y digitó en el modal (Arqueo Ciego)
    declarado_efectivo = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    declarado_yape = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    declarado_tarjeta = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # 3. La diferencia final (+ es sobrante, - es faltante)
    diferencia = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    def __str__(self):
        return f"Caja {self.estado} - {self.hora_apertura.strftime('%d/%m/%Y')}"








