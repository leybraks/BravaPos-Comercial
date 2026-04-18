import pandas as pd
import joblib
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from negocios.models import Producto

class Command(BaseCommand):
    help = 'Genera predicciones para la próxima semana y las exporta a CSV'

    def handle(self, *args, **options):
        self.stdout.write("🔮 Cargando la bola de cristal (Random Forest)...")
        
        try:
            modelo = joblib.load('modelo_brava_mermas.pkl')
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR("❌ Falta el modelo. Ejecuta 'python manage.py entrenar_ml' primero."))
            return

        productos = Producto.objects.all()
        fecha_actual = timezone.now()
        datos_prediccion = []

        # Vamos a predecir para los próximos 7 días, en horas punta (13h y 20h)
        for dia_extra in range(1, 8):
            fecha_futura = fecha_actual + timedelta(days=dia_extra)
            dia_semana = fecha_futura.weekday()
            
            for hora in [13, 20]: 
                for prod in productos:
                    # Le preguntamos al modelo: ¿Cuánto venderé de esto?
                    X_input = pd.DataFrame([{
                        'dia_semana': dia_semana, 
                        'hora': hora, 
                        'producto_id': prod.id
                    }])
                    
                    prediccion = modelo.predict(X_input)[0]
                    
                    datos_prediccion.append({
                        'Fecha_Prediccion': fecha_futura.strftime('%Y-%m-%d'),
                        'Hora': f"{hora}:00",
                        'Producto': prod.nombre,
                        'Cantidad_Estimada': round(prediccion)
                    })

        # Exportamos a CSV para lucirnos en Power BI
        df_pred = pd.DataFrame(datos_prediccion)
        # Filtramos las cantidades negativas o ceros por si acaso
        df_pred = df_pred[df_pred['Cantidad_Estimada'] > 0] 
        df_pred.to_csv('predicciones_brava.csv', index=False)
        
        self.stdout.write(self.style.SUCCESS("✅ ¡Éxito! Archivo 'predicciones_brava.csv' generado para Power BI."))