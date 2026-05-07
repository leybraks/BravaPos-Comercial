# core/asgi.py
import os

# ✅ DEBE ir ANTES de cualquier import de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from negocios.middleware import JWTWebSocketMiddleware
import negocios.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTWebSocketMiddleware(   # ✅ Middleware JWT aplicado
        URLRouter(
            negocios.routing.websocket_urlpatterns
        )
    ),
})