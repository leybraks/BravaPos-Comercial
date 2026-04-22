import pandas as pd
from django.core.management.base import BaseCommand
from negocios.models import DetalleOrden

class Command(BaseCommand):
    help = 'Exporta los datos de ventas a un CSV para Power BI'

    def handle(self, *args, **options):
        self.stdout.write("📊 Extrayendo datos de la base de datos...")
        
        # Seleccionamos los campos necesarios
        data = DetalleOrden.objects.all().values(
            'orden__creado_en', 
            'producto__nombre', 
            'cantidad', 
            'precio_unitario'
        )
        
        # Convertimos a DataFrame
        df = pd.DataFrame(list(data))
        
        # Verificamos si hay datos antes de exportar
        if not df.empty:
            nombre_archivo = 'ventas_brava_pos.csv'
            df.to_csv(nombre_archivo, index=False)
            self.stdout.write(self.style.SUCCESS(f"✅ ¡Éxito! Archivo creado: {nombre_archivo}"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ No hay datos para exportar."))