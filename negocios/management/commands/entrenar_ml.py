from django.core.management.base import BaseCommand
from negocios.services.entrenador import ejecutar_aprendizaje_machine_learning

class Command(BaseCommand):
    help = 'Ejecuta el entrenamiento del Random Forest'

    def handle(self, *args, **options):
        self.stdout.write("🧠 Iniciando el proceso de aprendizaje...")
        
        # Aquí llamamos a la función que vive en tu carpeta services
        resultado = ejecutar_aprendizaje_machine_learning()
        
        self.stdout.write(self.style.SUCCESS(f"✅ {resultado}"))