import pandas as pd
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from sklearn.ensemble import RandomForestRegressor
from negocios.models import DetalleOrden

class Command(BaseCommand):
    help = 'Entrena y exporta la predicción perfecta en un solo paso'

    def handle(self, *args, **options):
        self.stdout.write("🧠 1. Leyendo tu historial realista...")
        
        # Traemos solo lo que necesitamos de la base de datos
        datos = DetalleOrden.objects.all().values('orden__creado_en', 'producto__nombre', 'cantidad')
        df = pd.DataFrame(list(datos))
        
        if df.empty:
            self.stdout.write(self.style.ERROR("❌ No hay datos. Corre 'python manage.py poblar_datos' primero."))
            return

        # Preparamos los datos
        df['fecha'] = pd.to_datetime(df['orden__creado_en']).dt.date
        df['dia_semana'] = pd.to_datetime(df['orden__creado_en']).dt.dayofweek
        df['hora'] = pd.to_datetime(df['orden__creado_en']).dt.hour

        # Agrupamos por DÍA EXACTO
        df_diario = df.groupby(['fecha', 'dia_semana', 'hora', 'producto__nombre'])['cantidad'].sum().reset_index()

        # Convertimos los nombres de productos a números para el modelo
        productos_unicos = df_diario['producto__nombre'].unique()
        dict_productos = {nombre: i for i, nombre in enumerate(productos_unicos)}
        df_diario['prod_num'] = df_diario['producto__nombre'].map(dict_productos)

        self.stdout.write("🔥 2. Entrenando el modelo...")
        X = df_diario[['dia_semana', 'hora', 'prod_num']]
        y = df_diario['cantidad']
        
        modelo = RandomForestRegressor(n_estimators=100, random_state=42)
        modelo.fit(X, y)

        self.stdout.write("🔮 3. Generando el futuro...")
        fecha_actual = timezone.now().date()
        predicciones = []

        # Predecimos 7 días hacia el futuro
        for i in range(1, 8):
            fecha_futura = fecha_actual + timedelta(days=i)
            dia_semana = fecha_futura.weekday()

            # Horas punta: 1 PM (13) y 8 PM (20)
            for hora in [13, 20]:
                for nombre_prod, num_prod in dict_productos.items():
                    # Le pedimos al modelo que adivine
                    pred = modelo.predict([[dia_semana, hora, num_prod]])[0]
                    
                    predicciones.append({
                        'Fecha': fecha_futura.strftime('%Y-%m-%d'),
                        'Producto': nombre_prod,
                        'Platos_a_Vender': round(pred)
                    })

        # Sumamos los platos por día completo (almuerzo + cena)
        df_final = pd.DataFrame(predicciones)
        df_final = df_final.groupby(['Fecha', 'Producto'])['Platos_a_Vender'].sum().reset_index()

        # Guardamos el CSV
        nombre_archivo = 'PREDICCION_PERFECTA.csv'
        df_final.to_csv(nombre_archivo, index=False)
        self.stdout.write(self.style.SUCCESS(f"✅ ¡Todo listo! Se ha generado el archivo {nombre_archivo}"))