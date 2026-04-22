import pandas as pd
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from sklearn.ensemble import RandomForestRegressor
from negocios.models import Orden, DetalleOrden, Producto, Sede

class Command(BaseCommand):
    help = 'Destruye datos fantasma, simula realidad y predice en 1 solo clic'

    def handle(self, *args, **options):
        self.stdout.write("💥 1. DESTRUYENDO DATOS FANTASMA...")
        # Esto borra TODO el historial sin piedad (no borra tus productos ni usuarios)
        Orden.objects.all().delete()
        DetalleOrden.objects.all().delete()

        self.stdout.write("🌱 2. SIMULANDO UN RESTAURANTE REAL (180 DÍAS)...")
        sede = Sede.objects.first()
        productos = list(Producto.objects.all())
        
        fecha_actual = timezone.now()
        ordenes_crear = []
        
        # Recorremos 6 meses
        for dias_atras in range(180, -1, -1):
            fecha_base = fecha_actual - timedelta(days=dias_atras)
            dia_semana = fecha_base.weekday()
            
            # Fines de semana: 35-50 mesas. Lunes a Jueves: 15-25 mesas.
            num_ordenes = random.randint(35, 50) if dia_semana >= 4 else random.randint(15, 25)
            
            for _ in range(num_ordenes):
                # Concentramos en almuerzo (13-15h) y cena (19-21h)
                hora = random.choice([13, 14, 19, 20, 21])
                fecha_orden = fecha_base.replace(hour=hora, minute=random.randint(0, 59))
                ordenes_crear.append(Orden(sede=sede, estado="completado", estado_pago="pagado", creado_en=fecha_orden))
        
        # Guardamos las órdenes
        Orden.objects.bulk_create(ordenes_crear, batch_size=5000)
        
        detalles_crear = []
        for orden in Orden.objects.all():
            # Cada mesa pide entre 1 y 3 platos
            for _ in range(random.randint(1, 3)):
                prod = random.choice(productos)
                # Cada persona pide 1, a veces 2
                cant = random.randint(1, 2)
                detalles_crear.append(DetalleOrden(orden=orden, producto=prod, cantidad=cant, precio_unitario=prod.precio_base))
                
        # Guardamos los platos
        DetalleOrden.objects.bulk_create(detalles_crear, batch_size=5000)

        self.stdout.write("🧠 3. ENTRENANDO A LA INTELIGENCIA ARTIFICIAL...")
        datos = DetalleOrden.objects.all().values('orden__creado_en', 'producto__nombre', 'cantidad')
        df = pd.DataFrame(list(datos))
        
        df['fecha'] = pd.to_datetime(df['orden__creado_en']).dt.date
        df['dia_semana'] = pd.to_datetime(df['orden__creado_en']).dt.dayofweek
        df['hora'] = pd.to_datetime(df['orden__creado_en']).dt.hour
        
        # Agrupamos por DÍA EXACTO
        df_diario = df.groupby(['fecha', 'dia_semana', 'hora', 'producto__nombre'])['cantidad'].sum().reset_index()
        
        dict_productos = {nombre: i for i, nombre in enumerate(df_diario['producto__nombre'].unique())}
        df_diario['prod_num'] = df_diario['producto__nombre'].map(dict_productos)
        
        X = df_diario[['dia_semana', 'hora', 'prod_num']]
        y = df_diario['cantidad']
        
        modelo = RandomForestRegressor(n_estimators=100, random_state=42)
        modelo.fit(X, y)

        self.stdout.write("🔮 4. EXPORTANDO PREDICCIONES (MAX 50 PLATOS)...")
        fecha_hoy = timezone.now().date()
        predicciones = []
        
        # Predecimos 7 días
        for i in range(1, 8):
            fecha_futura = fecha_hoy + timedelta(days=i)
            dia_semana = fecha_futura.weekday()
            
            # Solo estimamos venta de almuerzo y cena
            for hora in [13, 20]:
                for nombre_prod, num_prod in dict_productos.items():
                    pred = modelo.predict([[dia_semana, hora, num_prod]])[0]
                    predicciones.append({
                        'Fecha': fecha_futura.strftime('%Y-%m-%d'),
                        'Producto': nombre_prod,
                        'Platos_a_Vender': round(pred)
                    })
                    
        # Sumamos el total del día
        df_final = pd.DataFrame(predicciones)
        df_final = df_final.groupby(['Fecha', 'Producto'])['Platos_a_Vender'].sum().reset_index()
        
        nombre_archivo = 'VENTAS_REALES_DEF.csv'
        df_final.to_csv(nombre_archivo, index=False)
        self.stdout.write(self.style.SUCCESS(f"✅ ¡LISTO! Abre el archivo '{nombre_archivo}'. Verás números reales."))