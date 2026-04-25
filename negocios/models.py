from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, is_password_usable
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator

class ActivoManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(activo=True)
    
class PlanSaaS(models.Model):
    nombre = models.CharField(max_length=50)
    precio_mensual = models.DecimalField(max_digits=8, decimal_places=2)
    
    # ✨ PERMISOS DEL PLAN (Lo que el cliente compró)
    modulo_kds = models.BooleanField(default=False, help_text="¿Tiene pantalla de cocina?")
    modulo_inventario = models.BooleanField(default=False)
    modulo_delivery = models.BooleanField(default=False)
    modulo_carta_qr = models.BooleanField(default=False)      # ✨ Nuevo: Menú QR
    modulo_bot_wsp = models.BooleanField(default=False)       # ✨ Nuevo: Pedidos WhatsApp
    modulo_ml = models.BooleanField(default=False)            # ✨ Nuevo: Machine Learning
    max_sedes = models.IntegerField(default=1)

    def __str__(self):
        return self.nombre

class Negocio(models.Model):
    propietario = models.OneToOneField(User, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)

    plan = models.ForeignKey(PlanSaaS, on_delete=models.PROTECT, related_name='negocios', null=True, blank=True)

    fecha_registro = models.DateTimeField(auto_now_add=True)
    fin_prueba = models.DateTimeField() # Para el demo de 15 días
    activo = models.BooleanField(default=True)
    numero_yape = models.CharField(max_length=15, blank=True, null=True)
    
    # 🛡️ MÓDULOS DEL SISTEMA (Feature Flags)
    mod_salon_activo = models.BooleanField(default=True) # Activa/Desactiva el mapa de mesas
    mod_cocina_activo = models.BooleanField(default=False) # KDS
    mod_inventario_activo = models.BooleanField(default=False)
    mod_delivery_activo = models.BooleanField(default=False)
    mod_clientes_activo = models.BooleanField(default=False) # CRM (Base de datos de clientes)
    mod_facturacion_activo = models.BooleanField(default=False) # Boletas/Facturas Sunat
    mod_carta_qr_activo = models.BooleanField(default=False) # Carta digital con QR para mesas y delivery
    mod_bot_wsp_activo = models.BooleanField(default=False) # Bot de WhatsApp para tomar pedidos y consultas automáticas
    mod_ml_activo = models.BooleanField(default=False) # Módulo de Machine Learning para recomendaciones y predicciones de ventas
    
    # 🎨 PERSONALIZACIÓN VISUAL
    color_primario = models.CharField(max_length=7, default='#ff5a1f') # Naranja Brava por defecto
    tema_fondo = models.CharField(max_length=10, default='dark') # 'dark' o 'light'
    
    def __str__(self):
        return self.nombre

class Sede(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE, related_name='sedes')
    nombre = models.CharField(max_length=100) # Ej: "Local Ventanilla", "Sede Centro"
    direccion = models.CharField(max_length=200, null=True, blank=True)
    activo = models.BooleanField(default=True)
    columnas_salon = models.IntegerField(default=2)
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

    posicion_x = models.IntegerField(default=0)
    posicion_y = models.IntegerField(default=0)
    
    # Opcional: Para distinguir formas
    ESQUEMA_CHOICES = [('circular', 'Circular'), ('cuadrada', 'Cuadrada')]
    forma = models.CharField(max_length=20, choices=ESQUEMA_CHOICES, default='cuadrada')

    class Meta:
        unique_together = ('sede', 'numero_o_nombre')
    def __str__(self):
        return f"{self.numero_o_nombre} - {self.sede.nombre}"

class Categoria(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE, related_name='categorias')
    nombre = models.CharField(max_length=50) # Ej. "Pizzas", "Parrillas", "Bebidas"
    orden = models.IntegerField(default=0) # Para que tú elijas qué categoría sale primero
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} - {self.negocio.nombre}"

class Producto(models.Model):
    # El producto sigue siendo del Negocio (Menú global)
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE)
    categoria = models.ForeignKey('Categoria', on_delete=models.SET_NULL, null=True, blank=True, related_name='productos')
    
    nombre = models.CharField(max_length=100)
    es_venta_rapida = models.BooleanField(default=False)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    disponible = models.BooleanField(default=True)
    tiene_variaciones = models.BooleanField(default=False)
    requiere_seleccion = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    
    # ✨ LOS NUEVOS CAMPOS PARA COMBOS Y MARKETING ✨
    es_combo = models.BooleanField(default=False, help_text="Indica si este producto está compuesto por otros productos")
    destacar_como_promocion = models.BooleanField(default=False, help_text="¿Aparece destacado en el Bot de WhatsApp o Carta QR?")
    
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

class Empleado(models.Model):
    # Relaciones vitales para el multi-local
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='empleados', null=True)
    sede = models.ForeignKey('Sede', on_delete=models.SET_NULL, null=True, blank=True, related_name='empleados')
    
    nombre = models.CharField(max_length=100)
    pin = models.CharField(max_length=128)
    rol = models.ForeignKey('Rol', on_delete=models.SET_NULL, null=True, related_name='empleados')
    activo = models.BooleanField(default=True)
    ultimo_ingreso = models.DateTimeField(null=True, blank=True)
    
    # ✨ LA MAGIA OCURRE AQUÍ ✨
    # 1. Devolvemos el manager normal a su lugar (Trae a todos)
    objects = models.Manager() 
    # 2. Tu manager personalizado lo guardamos con otro nombre (por si lo usas en el backend)
    activos = ActivoManager()

    class Meta:
        pass
    
    def save(self, *args, **kwargs):
        # Si el PIN no empieza con la firma del hasher de Django, significa que es un PIN nuevo en texto plano. Lo encriptamos.
        if self.pin:
            self.pin = self.pin.strip()
            
        # 2. EL ESCUDO: Solo evaluamos si REALMENTE hay un texto.
        # Si self.pin está vacío (""), esta condición se salta y no arruina la contraseña.
        if self.pin and not is_password_usable(self.pin):
            # Además, verificamos que sea cortito (un PIN real) para evitar doble encriptación
            if len(self.pin) < 30:
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

    mesero = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_tomadas', help_text="¿Quién tomó el pedido inicial?")
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.PROTECT, null=True, blank=True, related_name='ordenes', help_text="Turno en el que se cobró")
                                    
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

class Pago(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta (Visa/MC)'),
        ('yape', 'Yape'),
        ('plin', 'Plin'),
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
    precio = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    # ✨ EL NUEVO CAMPO MÁGICO: Relación con las categorías
    # blank=True permite que lo dejes vacío si quieres que el modificador sea 100% Global
    categorias_aplicables = models.ManyToManyField('Categoria', blank=True, related_name='modificadores_rapidos')

    def __str__(self):
        if self.precio > 0:
            return f"{self.nombre} (+S/ {self.precio})"
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

class MovimientoCaja(models.Model):
    TIPOS_MOVIMIENTO = [
        ('ingreso', 'Ingreso (Base/Ajuste)'),
        ('egreso', 'Egreso (Gasto/Retiro)'),
    ]

    sede = models.ForeignKey(Sede, on_delete=models.CASCADE, related_name='movimientos_caja')
    sesion_caja = models.ForeignKey(SesionCaja, on_delete=models.CASCADE, related_name='movimientos')
    empleado = models.ForeignKey(Empleado, on_delete=models.PROTECT, related_name='movimientos_registrados')

    tipo = models.CharField(max_length=10, choices=TIPOS_MOVIMIENTO)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    concepto = models.CharField(max_length=255) 
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['sesion_caja', 'tipo']),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - S/ {self.monto} - {self.concepto[:20]}"

class InsumoBase(models.Model):
    """
    EL CATÁLOGO GLOBAL (Sede 0 / Matriz)
    Aquí el Dueño define qué ingredientes existen en todo el negocio.
    """
    UNIDADES_MEDIDA = [
        ('g', 'Gramos'), ('kg', 'Kilogramos'),
        ('ml', 'Mililitros'), ('l', 'Litros'),
        ('unidades', 'Unidades'),
    ]

    nombre = models.CharField(max_length=100)
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='catalogo_insumos')
    unidad_medida = models.CharField(max_length=20, choices=UNIDADES_MEDIDA)
    imagen = models.ImageField(upload_to='insumos/', null=True, blank=True)
    activo = models.BooleanField(default=True)
    
    # ✨ CORRECCIÓN: Aquí es donde vive el stock de la Matriz
    stock_general = models.DecimalField(max_digits=10, decimal_places=3, default=0)

    def __str__(self):
        return f"{self.nombre} ({self.unidad_medida})"

class InsumoSede(models.Model):
    """
    EL STOCK LOCAL
    Representa cuánta cantidad de un InsumoBase hay en una Sede específica.
    """
    insumo_base = models.ForeignKey(InsumoBase, on_delete=models.CASCADE, related_name='stocks_locales')
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name='inventario')
    
    stock_actual = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    costo_unitario = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # ❌ (Borramos el stock_general de aquí porque este es el local)

    class Meta:
        unique_together = ('insumo_base', 'sede')

    def __str__(self):
        return f"{self.insumo_base.nombre} en {self.sede.nombre}"

class RecetaDetalle(models.Model):
    """
    LA RECETA GLOBAL
    Ahora conectamos el Plato con el InsumoBase. 
    Así, la receta es la misma para todas las sedes.
    """
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='ingredientes')
    insumo = models.ForeignKey(InsumoBase, on_delete=models.CASCADE)
    
    cantidad_necesaria = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0)])

    def __str__(self):
        return f"{self.cantidad_necesaria} {self.insumo.unidad_medida} de {self.insumo.nombre} para {self.producto.nombre}"

class RecetaOpcion(models.Model):
    """
    LA RECETA DE LA VARIACIÓN
    Define qué insumos EXACTOS gasta una opción. 
    Sirve tanto para sumar (Extra Rachi) como para definir un plato completo (Mixto 2).
    """
    opcion = models.ForeignKey(OpcionVariacion, on_delete=models.CASCADE, related_name='ingredientes')
    insumo = models.ForeignKey('InsumoBase', on_delete=models.CASCADE) # Conectamos al Almacén Matriz
    
    # Cuánto suma (o resta) esta opción al inventario
    cantidad_necesaria = models.DecimalField(max_digits=10, decimal_places=3)

    def __str__(self):
        return f"{self.cantidad_necesaria} {self.insumo.unidad_medida} de {self.insumo.nombre} para opción {self.opcion.nombre}"
    
class RegistroAuditoria(models.Model):
    """
    EL OJO QUE TODO LO VE (Log de Seguridad)
    Registra operaciones críticas que podrían representar fugas de dinero o malas prácticas.
    """
    TIPO_ACCION = [
        ('anular_plato', 'Anulación de Plato en Cocina'),
        ('cancelar_orden', 'Orden Completa Cancelada'),
        ('descuento', 'Descuento Aplicado Manualmente'),
        ('modificar_caja', 'Modificación de Caja Fuerte'),
    ]
    
    # Lo vinculamos a la sede para que el Dueño pueda filtrar por local
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE, related_name='auditorias')
    
    # Guardamos el empleado real, pero si lo despiden (eliminan), no perdemos el historial
    empleado = models.ForeignKey(Empleado, on_delete=models.SET_NULL, null=True, blank=True)
    empleado_nombre = models.CharField(max_length=100) # Respaldo en texto plano
    
    accion = models.CharField(max_length=50, choices=TIPO_ACCION)
    descripcion = models.TextField() # Ej: "Anuló 1x Anticucho de Orden #45. Motivo: Se equivocó de mesa"
    
    # ¿En qué orden pasó esto? (Opcional, porque la orden podría llegar a eliminarse en un futuro lejano)
    orden = models.ForeignKey(Orden, on_delete=models.SET_NULL, null=True, blank=True)
    
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['sede', 'fecha']),
            models.Index(fields=['accion']),
        ]

    def __str__(self):
        return f"[{self.fecha.strftime('%d/%m %H:%M')}] {self.empleado_nombre}: {self.get_accion_display()}"
    
class Cliente(models.Model):
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='clientes')
    telefono = models.CharField(max_length=20) # Identificador para WhatsApp
    nombre = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # Datos para el modelo de ML y fidelización
    puntos_acumulados = models.IntegerField(default=0)
    total_gastado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cantidad_pedidos = models.IntegerField(default=0)
    ultima_compra = models.DateTimeField(null=True, blank=True)
    
    # Etiquetas para segmentación (ej: ["VIP", "Frecuente", "Dormido"])
    tags = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ('negocio', 'telefono')

    def __str__(self):
        return f"{self.nombre or 'Cliente'} ({self.telefono})"

# ==========================================
# 2. LOGÍSTICA Y COBERTURA
# ==========================================
class ZonaDelivery(models.Model):
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name='zonas_delivery')
    nombre = models.CharField(max_length=100) # Ej: "Sector A - Surco"
    costo_envio = models.DecimalField(max_digits=6, decimal_places=2)
    pedido_minimo = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    # Texto para que el Bot busque coincidencias (puedes usar geolocalización después)
    distritos_cobertura = models.TextField(help_text="Lista de distritos o barrios separados por comas")
    activa = models.BooleanField(default=True)

# ==========================================
# 3. MOTOR DE REGLAS Y PROMOCIONES
# ==========================================
class ReglaNegocio(models.Model):
    TIPO_REGLA = [
        ('recargo_llevar', 'Recargo por empaque (Llevar)'),
        ('delivery_gratis', 'Delivery Gratis por Monto'),
        ('descuento_dia', 'Descuento por Día Específico'),
    ]
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE)
    tipo = models.CharField(max_length=30, choices=TIPO_REGLA)
    valor = models.DecimalField(max_digits=10, decimal_places=2) # Monto o Porcentaje
    es_porcentaje = models.BooleanField(default=False)
    
    # Condicionales
    monto_minimo_orden = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    dia_semana = models.IntegerField(null=True, blank=True) # 0=Lunes, 6=Domingo
    activa = models.BooleanField(default=True)

class CuponPromocional(models.Model):
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE)
    codigo = models.CharField(max_length=20, unique=True) # Ej: "BRAVA10"
    descripcion = models.TextField(blank=True)
    
    monto_descuento = models.DecimalField(max_digits=10, decimal_places=2)
    es_porcentaje = models.BooleanField(default=False)
    
    limite_usos = models.IntegerField(default=1)
    fecha_expiracion = models.DateTimeField()
    activo = models.BooleanField(default=True)

# ==========================================
# 4. COMBOS Y DISPONIBILIDAD TEMPORAL
# ==========================================
class HorarioVisibilidad(models.Model):
    """Controla cuándo un producto (o combo) aparece en el POS/Carta QR"""
    producto = models.OneToOneField('Producto', on_delete=models.CASCADE, related_name='horario')
    
    # JSON con los días permitidos: [0, 2, 4] -> Lun, Mie, Vie
    dias_permitidos = models.JSONField(default=list)
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    
    mensaje_fuera_horario = models.CharField(max_length=100, default="Disponible otros días")

class ComponenteCombo(models.Model):
    """Define de qué está hecho un Combo para descontar stock real"""
    combo = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='items_combo')
    producto_hijo = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='+')
    cantidad = models.PositiveIntegerField(default=1)