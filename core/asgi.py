import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
# Importamos el routing de tu aplicación "negocios"
import negocios.routing 

# Le decimos que "core" es la carpeta principal de tu configuración
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(
        negocios.routing.websocket_urlpatterns
    ),
})