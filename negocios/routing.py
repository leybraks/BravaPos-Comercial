from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # 👇 ESTA ES LA LÍNEA MÁGICA QUE HAY QUE ACTUALIZAR 👇
    re_path(r'ws/cocina/(?P<sede_id>\w+)/$', consumers.CocinaConsumer.as_asgi()),
    re_path(r'ws/salon/(?P<sede_id>\w+)/$', consumers.SalonConsumer.as_asgi()), 
]