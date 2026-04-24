# negocios/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    """
    Valida el JWT y retorna el User correspondiente.
    Retorna AnonymousUser si el token es inválido o expiró.
    """
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, InvalidToken, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTWebSocketMiddleware(BaseMiddleware):
    """
    Middleware que lee el token JWT desde la query string del WebSocket.

    React debe conectarse así:
        const ws = new WebSocket(`ws://servidor/ws/cocina/1/?token=${localStorage.getItem('tablet_token')}`);
    """

    async def __call__(self, scope, receive, send):
        # Extraemos el token de la query string: ?token=eyJ...
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [None])
        token_str = token_list[0] if token_list else None

        if token_str:
            scope['user'] = await get_user_from_token(token_str)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)