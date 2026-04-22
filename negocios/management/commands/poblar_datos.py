from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random

# Asegúrate de que los imports coincidan con tu app
from negocios.models import PlanSaaS, Negocio, Sede, Categoria, Producto, Orden, DetalleOrden, Pago

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        self.stdout.write("🏗️ 1. Preparando el entorno comercial...")

        # --- 1. CASCARÓN BÁSICO ---
        user, _ = User.objects.get_or_create(username="admin_brava")
        if _: user.set_password("brava2026"); user.is_superuser = True; user.is_staff = True; user.save()

        plan, _ = PlanSaaS.objects.get_or_create(nombre="Pro", defaults={'precio_mensual': 99, 'modulo_ml': True})
        negocio, _ = Negocio.objects.get_or_create(propietario=user, defaults={'nombre': "Brava Restobar", 'plan': plan, 'fin_prueba': timezone.now() + timedelta(days=30)})
        sede, _ = Sede.objects.get_or_create(negocio=negocio, nombre="Sede Principal")

        cat_platos, _ = Categoria.objects.get_or_create(negocio=negocio, nombre="Platos")
        cat_bebidas, _ = Categoria.objects.get_or_create(negocio=negocio, nombre="Bebidas")

        # Menú ampliado para mayor realismo
        menu = [
            ("Pollo a la Brasa", 65, cat_platos), ("Chaufa de Carne", 20, cat_platos), 
            ("Lomo Saltado", 25, cat_platos), ("Porción de Anticuchos", 18, cat_platos),
            ("Inka Cola 1L", 10, cat_bebidas), ("Chicha Morada 1L", 12, cat_bebidas), ("Agua Mineral", 3, cat_bebidas)
        ]

        productos_db = []
        for nombre, precio, cat in menu:
            p, _ = Producto.objects.get_or_create(negocio=negocio, nombre=nombre, defaults={'precio_base': precio, 'categoria': cat})
            productos_db.append(p)

        self.stdout.write("🧹 2. Limpiando el historial antiguo...")
        Orden.objects.all().delete() 

        self.stdout.write("⏳ 3. Simulando 6 meses de ventas reales (Día a día)...")
        fecha_actual = timezone.now()
        ordenes_crear = []
        detalles_crear = []

        # --- 2. EL MOTOR DE REALISMO (Recorremos los últimos 180 días) ---
        for dias_atras in range(180, -1, -1):
            fecha_base = fecha_actual - timedelta(days=dias_atras)
            dia_semana = fecha_base.weekday() # 0 = Lunes, 6 = Domingo

            # Volumen de clientes realista por día
            if dia_semana in [0, 1, 2]:    # Lunes a Miércoles: Días flojos
                num_ordenes = random.randint(15, 25)
            elif dia_semana == 3:          # Jueves: Empieza el movimiento
                num_ordenes = random.randint(25, 40)
            elif dia_semana == 4:          # Viernes: Salida del trabajo / Noche
                num_ordenes = random.randint(45, 70)
            elif dia_semana == 5:          # Sábado: El pico máximo de la semana
                num_ordenes = random.randint(60, 90)
            else:                          # Domingo: Fuerte, pero más concentrado en almuerzo
                num_ordenes = random.randint(50, 75)

            for _ in range(num_ordenes):
                # 80% de ventas en almuerzo (1-4pm) y cena (7-10pm)
                if random.random() < 0.5:
                    hora = random.randint(13, 15) # Almuerzo
                else:
                    hora = random.randint(19, 22) # Cena
                
                fecha_orden = fecha_base.replace(hour=hora, minute=random.randint(0, 59))

                orden = Orden(sede=sede, estado="completado", estado_pago="pagado", creado_en=fecha_orden)
                ordenes_crear.append(orden)

        # Guardamos las órdenes
        Orden.objects.bulk_create(ordenes_crear, batch_size=5000)
        
        self.stdout.write("🥩 4. Asignando platos a cada mesa (Con preferencias de consumo)...")
        ordenes_guardadas = Orden.objects.all()

        for orden in ordenes_guardadas:
            dia_orden = orden.creado_en.weekday()
            es_fin_de_semana = dia_orden >= 4
            
            # Grupos más grandes los fines de semana
            cantidad_platos_diferentes = random.randint(2, 4) if es_fin_de_semana else random.randint(1, 2)
            total_orden = 0

            # Definición de pesos base (Probabilidad de compra)
            pesos_menu = [
                30, # Pollo a la Brasa
                15, # Chaufa
                20, # Lomo Saltado
                15, # Anticuchos
                10, # Inka Cola
                8,  # Chicha
                2   # Agua
            ]

            # Si es domingo, el Pollo a la Brasa arrasa con todo
            if dia_orden == 6:
                pesos_menu[0] = 60 # Sube la probabilidad del pollo a 60%

            # Si es de noche (después de las 7pm), suben los anticuchos
            if orden.creado_en.hour >= 19:
                pesos_menu[3] = 30 # Anticuchos de noche pegan más

            for _ in range(cantidad_platos_diferentes):
                # Elegimos el producto usando la probabilidad ponderada
                prod = random.choices(productos_db, weights=pesos_menu, k=1)[0]
                
                # Fines de semana piden más porciones del mismo plato
                cantidad = random.randint(2, 3) if es_fin_de_semana else random.randint(1, 2)
                
                total_orden += prod.precio_base * cantidad
                detalles_crear.append(DetalleOrden(orden=orden, producto=prod, cantidad=cantidad, precio_unitario=prod.precio_base))
            
            orden.total = total_orden

        # Guardamos los detalles y actualizamos los totales en masa
        DetalleOrden.objects.bulk_create(detalles_crear, batch_size=5000)
        Orden.objects.bulk_update(ordenes_guardadas, ['total'], batch_size=5000)

        self.stdout.write(self.style.SUCCESS("🚀 ¡Impecable! Base de datos poblada con un modelo comercial 100% realista."))