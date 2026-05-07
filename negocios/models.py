from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, is_password_usable
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from openlocationcode import openlocationcode as olc
from django.utils import timezone

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

from django.db import models
from django.contrib.auth.models import User
# Asegúrate de importar tu modelo PlanSaaS si está en otro archivo, o déjalo como lo tienes

class Negocio(models.Model):
    propietario = models.OneToOneField(User, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)

    # ==========================================
    # 🏢 1. IDENTIDAD COMERCIAL
    # ==========================================
    ruc = models.CharField(max_length=11, blank=True, null=True, unique=True)
    razon_social = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to='negocios/logos/', blank=True, null=True)

    # ==========================================
    # 📱 2. BILLETERAS DIGITALES (QRs y Números)
    # ==========================================
    yape_numero = models.CharField(max_length=15, blank=True, null=True)
    yape_qr = models.ImageField(upload_to='negocios/qrs/yape/', blank=True, null=True)
    
    plin_numero = models.CharField(max_length=15, blank=True, null=True)
    plin_qr = models.ImageField(upload_to='negocios/qrs/plin/', blank=True, null=True)

    # ==========================================
    # 💳 3. PASARELA DE PAGO (Culqi)
    # ==========================================
    usa_culqi = models.BooleanField(default=False)
    culqi_public_key = models.CharField(max_length=255, blank=True, null=True)
    culqi_private_key = models.CharField(max_length=255, blank=True, null=True)

    # ==========================================
    # ⚙️ CONFIGURACIÓN DEL PLAN
    # ==========================================
    plan = models.ForeignKey('PlanSaaS', on_delete=models.PROTECT, related_name='negocios', null=True, blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fin_prueba = models.DateTimeField() # Para el demo de 15 días
    activo = models.BooleanField(default=True)
    
    # ==========================================
    # 🛡️ MÓDULOS DEL SISTEMA (Feature Flags)
    # ==========================================
    mod_salon_activo = models.BooleanField(default=True) # Activa/Desactiva el mapa de mesas
    mod_cocina_activo = models.BooleanField(default=False) # KDS
    mod_inventario_activo = models.BooleanField(default=False)
    mod_delivery_activo = models.BooleanField(default=False)
    mod_clientes_activo = models.BooleanField(default=False) # CRM (Base de datos de clientes)
    mod_facturacion_activo = models.BooleanField(default=False) # Boletas/Facturas Sunat
    mod_carta_qr_activo = models.BooleanField(default=False) # Carta digital con QR para mesas y delivery
    mod_bot_wsp_activo = models.BooleanField(default=False) # Bot de WhatsApp
    mod_ml_activo = models.BooleanField(default=False) # Machine Learning
    
    # ==========================================
    # 🎨 PERSONALIZACIÓN VISUAL
    # ==========================================
    color_primario = models.CharField(max_length=7, default='#ff5a1f') # Naranja Brava por defecto
    tema_fondo = models.CharField(max_length=10, default='dark') # 'dark' o 'light'
    
    carta_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Configuración visual de la carta digital (fuentes, fondos, colores, estilos)"
    )
    def __str__(self):
        return self.nombre
    def save(self, *args, **kwargs):
        # Si el RUC llega como un string vacío, lo forzamos a ser estrictamente NULL
        if self.ruc == "":
            self.ruc = None
            
        super().save(*args, **kwargs)

class Sede(models.Model):
    negocio = models.ForeignKey(Negocio, on_delete=models.CASCADE, related_name='sedes')
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(
        max_length=200, null=True, blank=True,
        help_text="Pega el Plus Code de Google Maps (Ej: 6MC5+QQ Ventanilla)"
    )
    activo = models.BooleanField(default=True)
    columnas_salon = models.IntegerField(default=2)
    latitud = models.FloatField(null=True, blank=True, help_text="Se autocompleta al guardar")
    longitud = models.FloatField(null=True, blank=True, help_text="Se autocompleta al guardar")

    # ==========================================
    # 📱 BOT MULTI-SEDE
    # ==========================================
    whatsapp_instancia = models.CharField(max_length=50, null=True, blank=True, help_text="Nombre exacto en Evolution API")
    whatsapp_numero = models.CharField(max_length=20, null=True, blank=True, help_text="Número del bot")
    enlace_carta_virtual = models.URLField(max_length=500, null=True, blank=True, help_text="Link a tu menú digital, Canva, Drive o Instagram")
    carta_pdf = models.FileField(upload_to='cartas_pdf/', null=True, blank=True, help_text="Sube tu carta en formato PDF")
    hora_apertura = models.TimeField(null=True, blank=True)
    hora_cierre = models.TimeField(null=True, blank=True)

    # ⚠️ CAMBIO: de JSONField a un choices fijo.
    # El JSONField libre era propenso a errores de tipeo ("Lunes" vs "lunes" vs "LUN").
    # Con IntegerField + choices el bot siempre lee números: 0=Lun, 1=Mar... 6=Dom.
    DIAS_SEMANA = [(0,'Lunes'),(1,'Martes'),(2,'Miércoles'),(3,'Jueves'),(4,'Viernes'),(5,'Sábado'),(6,'Domingo')]
    dias_atencion = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de enteros: [0,1,2] = Lun, Mar, Mié. (0=Lun … 6=Dom)"
    )

    bot_puntos_activos = models.BooleanField(default=True, help_text="¿El bot gestiona y menciona los puntos?")
    bot_max_pedidos_pendientes = models.IntegerField(
        default=20,
        help_text="Límite de pedidos en preparación antes de activar el Modo Cocina Colapsada"
    )

    # ==========================================
    # 🎂 PROMOCIÓN DE CUMPLEAÑOS
    # ==========================================
    TIPO_CUMPLE = [
        ('porcentaje', 'Porcentaje de descuento'),
        ('fijo', 'Monto fijo en soles'),
        ('combo', 'Combo / Producto gratis'),
    ]

    bot_cumple_activo = models.BooleanField(default=False, help_text="¿Activar promoción de cumpleaños?")
    bot_cumple_tipo = models.CharField(max_length=20, choices=TIPO_CUMPLE, default='porcentaje')
    bot_cumple_valor = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Para 'porcentaje': escribe 20 (= 20%). Para 'fijo': escribe 15 (= S/ 15). Dejar vacío si el tipo es 'combo'."
    )
    bot_cumple_minimo = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Consumo mínimo en soles para que aplique el beneficio."
    )

    # ✅ CAMBIO: ManyToManyField en lugar de JSONField con IDs.
    # Con M2M, si un producto se elimina Django limpia la relación automáticamente.
    # Con el JSONField anterior, quedaban IDs huérfanos sin ningún aviso.
    bot_cumple_productos = models.ManyToManyField(
        'Producto',
        blank=True,
        related_name='sedes_promo_cumple',
        help_text="Solo para tipo 'combo': productos que se regalan o descuentan."
    )

    objects = ActivoManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ('negocio', 'nombre')

    def __str__(self):
        return f"{self.nombre} ({self.negocio.nombre})"

    # ✅ NUEVO: Validación cruzada entre tipo y valor/productos.
    # Sin esto, el admin podía guardar tipo='combo' sin productos, o tipo='fijo' sin valor,
    # y el bot explotaría en runtime sin ningún mensaje claro de por qué.
    def clean(self):
        super().clean()
        if not self.bot_cumple_activo:
            return  # Si la promo está apagada, no validamos nada más.

        if self.bot_cumple_tipo in ('porcentaje', 'fijo'):
            if self.bot_cumple_valor is None:
                raise ValidationError({
                    'bot_cumple_valor': f"Debes ingresar un valor para el tipo '{self.bot_cumple_tipo}'."
                })
            if self.bot_cumple_tipo == 'porcentaje' and not (0 < self.bot_cumple_valor <= 100):
                raise ValidationError({
                    'bot_cumple_valor': "El porcentaje debe estar entre 1 y 100."
                })

        # Nota: la validación de 'combo' (que haya productos seleccionados)
        # no se puede hacer aquí porque M2M no existe hasta después del save().
        # Esa validación vive en el serializer o en el admin con clean() del formulario.

    def save(self, *args, **kwargs):
        self.full_clean()  # Dispara clean() antes de guardar
        if self.direccion and '+' in self.direccion:
            try:
                codigo_limpio = self.direccion.split(' ')[0]
                if olc.isFull(codigo_limpio):
                    code_area = olc.decode(codigo_limpio)
                    self.latitud = code_area.latitudeCenter
                    self.longitud = code_area.longitudeCenter
            except Exception as e:
                # ✅ CAMBIO: usa logging en lugar de print().
                # print() no aparece en producción (Gunicorn/Railway lo suprime).
                # logging sí llega a tus logs de servidor.
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("Error decodificando Plus Code '%s': %s", self.direccion, e)
        super().save(*args, **kwargs)

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
    imagen = models.ImageField(upload_to='productos/fotos/', null=True, blank=True)
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
    # 🛵 DATOS DE DELIVERY
    direccion_entrega = models.CharField(max_length=255, null=True, blank=True)
    latitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    costo_envio = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    # 💳 MÉTODO DE PAGO ESPERADO (Para saber si el motorizado lleva POS o Vuelto)
    metodo_pago_esperado = models.CharField(max_length=50, null=True, blank=True, help_text="Ej: Yape, Efectivo (con vuelto de S/50)")
    pago_validado_bot = models.BooleanField(default=False, help_text="¿Gemini validó la captura?")
    estado = models.CharField(max_length=20, choices=ESTADOS_COCINA, default='pendiente')
    estado_pago = models.CharField(max_length=20, choices=ESTADOS_PAGO, default='pendiente') # 👈 NUEVO
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    descuento_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    recargo_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
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
    
# En models.py
class Cliente(models.Model):
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='clientes')
    telefono = models.CharField(max_length=20)
    nombre = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # 📊 DATOS DE FIDELIZACIÓN
    puntos_acumulados = models.IntegerField(default=0)
    total_gastado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cantidad_pedidos = models.IntegerField(default=0)
    ultima_compra = models.DateTimeField(null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)

    # 🧠 ✨ NUEVOS CAMPOS: MEMORIA DE ESTADO DEL BOT
    bot_estado = models.CharField(
        max_length=50, 
        default='INICIO', 
        help_text="Estado actual: INICIO, ESPERANDO_PAGO, ESPERANDO_UBICACION, etc."
    )
    bot_memoria = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Guarda el carrito temporal, coordenadas y datos de la sesión actual."
    )

    class Meta:
        unique_together = ('negocio', 'telefono')

    def __str__(self):
        return f"{self.nombre or 'Cliente'} ({self.telefono})"

# ==========================================
# 2. LOGÍSTICA Y COBERTURA
# ==========================================
class ZonaDelivery(models.Model):
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name='zonas_delivery')
    nombre = models.CharField(max_length=100) # Ej: "Radio Corto (0-2km)"
    costo_envio = models.DecimalField(max_digits=6, decimal_places=2)
    pedido_minimo = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    # ✨ EL NUEVO CORAZÓN DEL CÁLCULO
    radio_max_km = models.FloatField(help_text="Radio máximo en kilómetros para esta tarifa", default=2.0)
    
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} (hasta {self.radio_max_km}km) - S/ {self.costo_envio}"

# ==========================================
# 3. MOTOR DE REGLAS Y PROMOCIONES
# ==========================================
class ReglaNegocio(models.Model):
    TIPO_REGLA = [
        ('recargo_llevar', 'Recargo por empaque (Llevar)'),
        ('delivery_gratis', 'Delivery Gratis por Monto'),
        ('descuento_dia', 'Descuento por Día Específico'),
        ('descuento_yape_efectivo', 'Descuento por pagar con Yape/Efectivo'),
        ('servicio_grupo_grande', 'Recargo por mesa grande'),
        ('recargo_nocturno', 'Tarifa extra de madrugada'),
        ('personalizada', 'Regla Personalizada'),  # 👈 nuevo
    ]

    CONDICION_ORDEN = [
        ('cualquiera', 'Cualquier tipo'),
        ('salon', 'Solo Salón'),
        ('llevar', 'Solo Para Llevar'),
        ('delivery', 'Solo Delivery'),
    ]

    CONDICION_PAGO = [
        ('cualquiera', 'Cualquier método'),
        ('yape', 'Solo Yape'),
        ('plin', 'Solo Plin'),
        ('efectivo', 'Solo Efectivo'),
        ('tarjeta', 'Solo Tarjeta'),
    ]

    ACCION_APLICA = [
        ('orden', 'A toda la orden'),
        ('categoria', 'A una categoría'),
        ('producto', 'A un producto'),
    ]

    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100, default='', blank=True)  # 👈 nuevo
    tipo = models.CharField(max_length=30, choices=TIPO_REGLA)
    valor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    es_porcentaje = models.BooleanField(default=False)

    # Condiciones
    monto_minimo_orden = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    dia_semana = models.IntegerField(null=True, blank=True)  # 0=Lunes, 6=Domingo
    condicion_tipo_orden = models.CharField(max_length=30, choices=CONDICION_ORDEN, default='cualquiera')
    condicion_metodo_pago = models.CharField(max_length=30, choices=CONDICION_PAGO, default='cualquiera')
    condicion_hora_inicio = models.TimeField(null=True, blank=True)
    condicion_hora_fin = models.TimeField(null=True, blank=True)

    # Acción
    accion_aplica_a = models.CharField(max_length=30, choices=ACCION_APLICA, default='orden')
    accion_es_descuento = models.BooleanField(default=False)  # True=descuento, False=recargo  # 👈 nuevo
    accion_producto = models.ForeignKey('Producto', on_delete=models.SET_NULL, null=True, blank=True)
    accion_categoria = models.ForeignKey('Categoria', on_delete=models.SET_NULL, null=True, blank=True)

    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre or self.get_tipo_display()} — {self.negocio.nombre}"

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
    """Happy Hours: controla cuándo un producto/categoría tiene promoción"""
    from django.utils import timezone

    TIPO_PROMO_CHOICES = [
        ('visibilidad', 'Solo Visibilidad (aparece/desaparece)'),
        ('precio_especial', 'Precio Especial'),
        ('porcentaje', 'Descuento por Porcentaje'),
        ('nx_y', 'Compra X Lleva Y'),
    ]
    opcion_variacion = models.ForeignKey(
        'OpcionVariacion', on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="Si es null, aplica a todas las presentaciones del producto"
    )
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='happy_hours', null=True, blank=True)
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='horarios', null=True, blank=True)
    categoria = models.ForeignKey('Categoria', on_delete=models.CASCADE, related_name='horarios', null=True, blank=True)
    sede = models.ForeignKey(
        'Sede', on_delete=models.CASCADE, null=True, blank=True,
        related_name='happy_hours',
        help_text="Si es null, aplica a todas las sedes del negocio"
    )
    nombre = models.CharField(max_length=100)
    tipo_promo = models.CharField(max_length=20, choices=TIPO_PROMO_CHOICES, default='visibilidad')

    precio_especial = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    porcentaje_descuento = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    compra_x = models.PositiveIntegerField(default=2)
    lleva_y = models.PositiveIntegerField(default=1)

    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    dias_permitidos = models.JSONField(default=list, help_text="[0,1,2] = Lun,Mar,Mié")
    se_repite_semanalmente = models.BooleanField(default=True)
    rangos_fechas = models.JSONField(
        default=list, blank=True,
        help_text="[{'inicio':'2026-05-01','fin':'2026-05-15'}]"
    )

    activa = models.BooleanField(default=True)
    creado_en = models.DateTimeField(default=timezone.now)  # 👈 cambiado de auto_now_add

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.tipo_promo == 'nx_y':
            if self.compra_x > 6:
                raise ValidationError({'compra_x': 'Máximo 6 unidades.'})
            if self.lleva_y >= self.compra_x:
                raise ValidationError({'lleva_y': 'Lleva Y debe ser menor que Compra X.'})
        if self.producto and self.categoria:
            raise ValidationError('Elige producto O categoría, no ambos.')
        if not self.producto and not self.categoria:
            raise ValidationError('Debes elegir un producto o una categoría.')

    def __str__(self):
        objetivo = self.producto.nombre if self.producto else (self.categoria.nombre if self.categoria else '?')
        return f"{self.nombre} — {objetivo}"

class ComponenteCombo(models.Model):
    """Define de qué está hecho un Combo Normal para descontar stock real"""
    combo = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='items_combo')
    producto_hijo = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='+')
    cantidad = models.PositiveIntegerField(default=1)
    
    # Si el producto_hijo requiere_seleccion → qué opción se preseleccionó
    opcion_seleccionada = models.ForeignKey(
        'OpcionVariacion', on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Solo si el producto hijo requiere selección"
    )
    # Si el producto_hijo tiene_variaciones → qué variación se preseleccionó (null = producto base)
    variacion_seleccionada = models.ForeignKey(
        'VariacionProducto', on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Solo si el producto hijo tiene variaciones"
    )


# ==========================================
# 5. CEREBRO DEL BOT DE WHATSAPP
# ==========================================
class ReglaBot(models.Model):
    TRIGGERS = [
        ('saludo', 'Mensaje de Bienvenida (Primer contacto)'),
        ('fuera_horario', 'Mensaje de Fuera de Horario'),
        ('despedida', 'Despedida tras compra exitosa'),
        ('espera', 'Mensaje de espera (Cuando hay alta demanda)'),
    ]
    
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name='reglas_bot')
    trigger = models.CharField(max_length=50, choices=TRIGGERS)
    mensaje = models.TextField(help_text="Usa {nombre} para que el bot diga el nombre del cliente.")
    activa = models.BooleanField(default=True)

    class Meta:
        unique_together = ('sede', 'trigger')

    def __str__(self):
        return f"Regla {self.get_trigger_display()} - {self.sede.nombre}"

class PromocionBot(models.Model):
    TIPOS_PROMO = [
        ('cumpleanos', 'Felicitación de Cumpleaños'),
        ('inactivo_15d', 'Cliente inactivo por 15 días'),
        ('vip', 'Oferta exclusiva para clientes VIP'),
    ]
    
    sede = models.ForeignKey('Sede', on_delete=models.CASCADE, related_name='promociones_bot')
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50, choices=TIPOS_PROMO)
    
    # Podemos enlazarlo a un cupón existente en tu modelo CuponPromocional
    cupon = models.ForeignKey('CuponPromocional', on_delete=models.SET_NULL, null=True, blank=True)
    
    mensaje_gancho = models.TextField(help_text="Ej: ¡Feliz cumple {nombre}! Usa el código {cupon} para un 20% de dscto.")
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.sede.nombre})"
    
class SolicitudCambio(models.Model):
    ESTADOS = [('pendiente', 'Esperando Cocina'), ('aprobada', 'Aprobada'), ('rechazada', 'Rechazada')]
    ACCIONES = [('cancelar', 'Cancelar Orden'), ('agregar', 'Agregar Producto'), ('nota', 'Cambiar Nota')]

    orden = models.ForeignKey('Orden', on_delete=models.CASCADE, related_name='solicitudes_cambio')
    tipo_accion = models.CharField(max_length=20, choices=ACCIONES)
    detalles_json = models.JSONField(help_text="Datos del cambio: {'producto': id, 'cantidad': 1, 'notas': '...'}")
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Solicitud {self.tipo_accion} - Orden #{self.orden.id} ({self.get_estado_display()})"
    
class ComboPromocional(models.Model):
    """Combo creado desde el módulo CRM, con fechas. No aparece en la sección de platos."""
    negocio = models.ForeignKey('Negocio', on_delete=models.CASCADE, related_name='combos_promocionales')
    nombre = models.CharField(max_length=100)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='combos_promocionales/', null=True, blank=True)
    # Ej: [{"inicio": "2026-05-01", "fin": "2026-05-15"}, {"inicio": "2026-12-24", "fin": "2026-12-31"}]
    rangos_fechas = models.JSONField(default=list, help_text="Lista de rangos de fechas en que aplica el combo")
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    sede = models.ForeignKey(
        'Sede', on_delete=models.CASCADE, null=True, blank=True,
        related_name='combos_promocionales_sede',
        help_text="Si es null, aplica a todas las sedes del negocio"
    )
    class Meta:
        unique_together = ('negocio', 'nombre')

    def __str__(self):
        return f"Combo Promo: {self.nombre} - S/ {self.precio}"


class ItemComboPromocional(models.Model):
    """Un producto dentro de un ComboPromocional, con su variante/opción preseleccionada."""
    combo = models.ForeignKey(ComboPromocional, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)

    # Solo si el producto requiere_seleccion
    opcion_seleccionada = models.ForeignKey(
        'OpcionVariacion', on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Solo si el producto hijo requiere selección"
    )
    # Solo si el producto tiene_variaciones (null = se eligió el producto base)
    variacion_seleccionada = models.ForeignKey(
        'VariacionProducto', on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Solo si el producto hijo tiene variaciones"
    )

    def __str__(self):
        return f"{self.cantidad}x {self.producto.nombre} → Combo {self.combo.nombre}"