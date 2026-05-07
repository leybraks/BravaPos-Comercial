# negocios/apps.py
from django.apps import AppConfig

class NegociosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'negocios'

    def ready(self):
        # ✨ Importación segura: solo ocurre cuando la app está lista
        import negocios.signals