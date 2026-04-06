import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CocinaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Cuando el KDS se abre, se une al grupo "cocina"
        await self.channel_layer.group_add("cocina", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Cuando el KDS se cierra, sale del grupo
        await self.channel_layer.group_discard("cocina", self.channel_name)

    # Esta función se dispara cuando Django recibe una nueva orden
    async def enviar_orden(self, event):
        orden = event['orden']
        # La envía inmediatamente a React
        await self.send(text_data=json.dumps({
            'type': 'nueva_orden',
            'orden': orden
        }))