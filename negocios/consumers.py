import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CocinaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Capturamos el ID de la URL
        self.sede_id = self.scope['url_route']['kwargs']['sede_id']
        
        # Nos unimos al grupo de ESA sede
        self.room_group_name = f"cocina_sede_{self.sede_id}"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    # Si tienes la función disconnect, actualízala también:
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name, # Usa el nombre del grupo con la sede
            self.channel_name
        )


class SalonConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Atrapamos la sede de la URL (ws/salon/1/)
        self.sede_id = self.scope['url_route']['kwargs']['sede_id']
        self.room_group_name = f"salon_sede_{self.sede_id}"

        # 2. El mesero se une al grupo de "notificaciones" de su sede
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # 3. Este método recibe el evento 'pedido_listo' enviado desde views.py
    # y lo "escupe" por el WebSocket hacia la tablet del mesero
    async def pedido_listo(self, event):
        await self.send(text_data=json.dumps({
            'type': 'pedido_listo',
            'mesa': event['mesa'],
            'producto': event['producto']
        }))