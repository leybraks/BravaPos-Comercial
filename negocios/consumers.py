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
    
    async def orden_nueva(self, event):
        # Esto atrapa el evento de Django y lo "escupe" hacia React
        await self.send(text_data=json.dumps({
            'type': 'nueva_orden', # React espera este nombre
            'orden': event['orden']
        }))


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

    # Recibe mensajes del cliente (React) y los redistribuye al grupo
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mesa_estado':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'mesa_actualizada',
                    'mesa_id': data['mesa_id'],
                    'estado': data['estado'],
                    'total': data.get('total', 0),
                }
            )

    # 3. Este método recibe el evento 'pedido_listo' enviado desde views.py
    # y lo "escupe" por el WebSocket hacia la tablet del mesero
    async def pedido_listo(self, event):
        await self.send(text_data=json.dumps({
            'type': 'pedido_listo',
            'mesa': event['mesa'],
            'producto': event['producto']
        }))

    # 4. Nuevo evento: notifica a todos los meseros cuando cambia el estado de una mesa
    async def mesa_actualizada(self, event):
        await self.send(text_data=json.dumps({
            'type': 'mesa_actualizada',
            'mesa_id': event['mesa_id'],
            'estado': event['estado'],
            'total': event['total'],
        }))

    # 5. Nuevo evento: notifica cuando se crea o actualiza una orden para llevar
    async def orden_llevar_actualizada(self, event):
        await self.send(text_data=json.dumps({
            'type': 'orden_llevar_actualizada',
            'orden': event['orden'],
            'accion': event['accion'],  # 'nueva', 'actualizada', 'completada'
        }))