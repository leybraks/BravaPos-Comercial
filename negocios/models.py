from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, is_password_usable
from django.core.exceptions import ValidationError
class ActivoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
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
    numero_yape = models.CharField(max_length=15, blank=True, null=True)
    mod_delivery_activo = models.BooleanField(default=False)
    
    def __str__(self):
        return self.nombre

class Sede(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE, related_name='sedes')
    nombre = models.CharField(max_length=100) # Ej: "Local Ventanilla", "Sede Centro"
    direccion = models.CharField(max_length=200, null=True, blank=True)
    activo = models.BooleanField(default=True)
    objects = ActivoManager()      
    all_objects = models.Manager()
    class Meta:
        unique_together = ('negocio', 'nombre')
    def __str__(self):
        return f"{self.nombre} ({self.negocio.nombre})"

class Mesa(models.Model):
    # Cambio clave: La mesa ahora pertenece a la Sede, no al Negocio general
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE) 
    numero_o_nombre = models.CharField(max_length=20)
    capacidad = models.IntegerField(default=2)
    mesa_principal = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='mesas_unidas')
    activo = models.BooleanField(default=True)
    objects = ActivoManager()
    all_objects = models.Manager()
    class Meta:
        unique_together = ('sede', 'numero_o_nombre')
    def __str__(self):
        return f"{self.numero_o_nombre} - {self.sede.nombre}"

class Producto(models.Model):
    # El producto sigue siendo del Negocio (Menú global)
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    es_venta_rapida = models.BooleanField(default=False)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    disponible = models.BooleanField(default=True)
    tiene_variaciones = models.BooleanField(default=False)
    requiere_seleccion = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    objects = ActivoManager()
    all_objects = models.Manager()
    class Meta:
        unique_together = ('negocio', 'nombre')
        indexes = [
            models.Index(fields=['negocio', 'disponible']), # Acelera la carga del menú en React
        ]
    def __str__(self):
        return f"{self.nombre} (S/ {self.precio_base})"

class VariacionProducto(models.Model):
    producto = models.ForeignKey(Producto, related_name='variaciones', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: "Personal", "Familiar", "1 Litro"
    precio = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.producto.nombre} - {self.nombre} (S/ {self.precio})"

class Orden(models.Model):
    # 🍳 DIMENSIÓN 1: ¿En qué parte del restaurante está el plato?
    ESTADOS_COCINA = [
        ('pendiente', 'Pendiente'),
        ('preparando', 'En Cocina'),
        ('listo', 'Listo para entregar'),
        ('completado', 'Entregado / Mesa Cerrada'), # 👈 Renombrado (antes 'pagado')
        ('cancelado', 'Cancelado')
    ]
    
    # 💰 DIMENSIÓN 2: ¿Qué pasó con la plata?
    ESTADOS_PAGO = [
        ('pendiente', 'Por Cobrar'),
        ('pagado', 'Pagado Completamente'),
        ('reembolsado', 'Reembolsado')
    ]
    
    TIPO_CHOICES = [
        ('salon', 'En Salón'),
        ('llevar', 'Para Llevar'),
        ('delivery', 'Delivery')
    ]
    
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE)
    mesa = models.ForeignKey(Mesa, on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='salon')
    
    estado = models.CharField(max_length=20, choices=ESTADOS_COCINA, default='pendiente')
    estado_pago = models.CharField(max_length=20, choices=ESTADOS_PAGO, default='pendiente') # 👈 NUEVO
    
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    cliente_nombre = models.CharField(max_length=100, null=True, blank=True)
    cliente_telefono = models.CharField(max_length=20, null=True, blank=True)
    motivo_cancelacion = models.CharField(max_length=255, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['sede', 'estado']),
            models.Index(fields=['creado_en']),
            models.Index(fields=['sede', 'estado_pago']), # 👈 Índice para el dashboard de finanzas
        ]
    def clean(self):
        super().clean() # Llama a las validaciones normales de Django
        if self.estado_pago == 'pagado' and self.estado == 'cancelado':
            raise ValidationError('Error lógico: Una orden cancelada no puede aparecer como pagada. Debe estar reembolsada o pendiente.')

    def save(self, *args, **kwargs):
        self.full_clean() # Fuerza a que se ejecute "clean()" antes de guardar
        super().save(*args, **kwargs)
    def __str__(self):
        origen = f"Mesa {self.mesa.numero_o_nombre}" if self.mesa else (self.cliente_nombre or self.get_tipo_display())
        return f"Orden #{self.id} - {origen} - Cocina: {self.estado} - Caja: {self.estado_pago}"

class DetalleOrden(models.Model):
    orden = models.ForeignKey(Orden, related_name='detalles', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.IntegerField(default=1)
    
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    notas_y_modificadores = models.JSONField(default=dict, blank=True)
    notas_cocina = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True) 
    
    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre}"

class Empleado(models.Model):
    # Relaciones vitales para el multi-local
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='empleados', null=True)
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, related_name='empleados')
    
    nombre = models.CharField(max_length=100)
    pin = models.CharField(max_length=128)
    rol = models.ForeignKey('Rol', on_delete=models.SET_NULL, null=True, related_name='empleados')
    activo = models.BooleanField(default=True)
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)
    objects = ActivoManager()
    all_objects = models.Manager()

    class Meta:
        pass
    
    def save(self, *args, **kwargs):
        # Si el PIN no empieza con la firma del hasher de Django, significa que es un PIN nuevo en texto plano. Lo encriptamos.
        if not is_password_usable(self.pin):
            self.pin = make_password(self.pin)
        super().save(*args, **kwargs)

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
    class Meta:
        
        constraints = [
            models.UniqueConstraint(
                fields=['sede'], 
                condition=models.Q(estado='abierta'), 
                name='unica_caja_abierta_por_sede'
            )
        ]
    def __str__(self):
        return f"Caja {self.estado} - {self.hora_apertura.strftime('%d/%m/%Y')}"

class Pago(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta (Visa/MC)'),
        ('yape_plin', 'Yape / Plin'),
    ]
    
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='pagos')
    metodo = models.CharField(max_length=20, choices=METODOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.PROTECT, null=True, related_name='pagos')
    fecha_pago = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=['sesion_caja', 'fecha_pago']),
            models.Index(fields=['orden']),
        ]
    def __str__(self):
        return f"S/ {self.monto} en {self.get_metodo_display()} (Orden #{self.orden.id})"
    
class ModificadorRapido(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

class GrupoVariacion(models.Model):
    producto = models.ForeignKey(Producto, related_name='grupos_variacion', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50) # Ej: "Elige tu Tamaño"
    obligatorio = models.BooleanField(default=True) # Si es True, el mesero DEBE elegir algo
    seleccion_multiple = models.BooleanField(default=False) # False para Tamaño (solo 1), True para Cremas (varias)

    def __str__(self):
        return f"{self.nombre} - {self.producto.nombre}"

class OpcionVariacion(models.Model):
    grupo = models.ForeignKey(GrupoVariacion, related_name='opciones', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    # Cuánto suma al precio_base del producto. Si la Pizza Hawaiana base cuesta 0, la opción Familiar suma 35.
    precio_adicional = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 

    def __str__(self):
        return f"{self.nombre} (+S/ {self.precio_adicional})"

class DetalleOrdenOpcion(models.Model):
    detalle_orden = models.ForeignKey(DetalleOrden, on_delete=models.CASCADE, related_name='opciones_seleccionadas')
    opcion_variacion = models.ForeignKey(OpcionVariacion, on_delete=models.PROTECT)
    precio_adicional_aplicado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Opcion {self.opcion_variacion.nombre} en Detalle #{self.detalle_orden.id}"

class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    # Aquí podrías agregar booleanos para permisos específicos si quieres algo muy granular
    puede_cobrar = models.BooleanField(default=False)
    puede_configurar = models.BooleanField(default=False)

    def __str__(self):
        return self.nombre

class Suscripcion(models.Model):
    negocio = models.OneToOneField(Negocio, on_delete=models.CASCADE, related_name='suscripcion')
    plan = models.ForeignKey(PlanSaaS, on_delete=models.PROTECT)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField()
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.negocio.nombre} - {self.plan.nombre} (Activa: {self.activa})"








