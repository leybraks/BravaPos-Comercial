# negocios/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.conf import settings
from http.cookies import SimpleCookie
import traceback

@database_sync_to_async
def get_user_from_token(token_str):
    from django.contrib.auth.models import AnonymousUser
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

    User = get_user_model()
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        user = User.objects.get(id=user_id)
        print(f"✅ WS: Usuario {user.username} autenticado vía cookie.")
        return user
    except Exception as e:
        print(f"⚠️ WS: Token inválido o expirado. {e}")
        return AnonymousUser()

class JWTWebSocketMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        try:
            headers = dict(scope.get('headers', []))
            raw_token = None

            print("\n🕵️‍♂️ WS: Iniciando Handshake. Buscando cookies...")

            if b'cookie' in headers:
                cookies_str = headers[b'cookie'].decode('utf-8')
                print(f"🍪 WS: Header de cookies detectado.")
                
                parsed_cookies = SimpleCookie(cookies_str)
                cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token')

                if cookie_name in parsed_cookies:
                    raw_token = parsed_cookies[cookie_name].value
                    print("🔑 WS: Token de acceso encontrado en la cookie.")
                else:
                    print(f"❌ WS: La cookie '{cookie_name}' no está en la petición.")
            else:
                print("❌ WS: El navegador no envió ninguna cookie.")

            if raw_token:
                scope['user'] = await get_user_from_token(raw_token)
            else:
                scope['user'] = AnonymousUser()

            return await super().__call__(scope, receive, send)

        except Exception as e:
            print("🔥 ERROR CRÍTICO EN MIDDLEWARE WS:")
            traceback.print_exc() # Esto imprimirá la línea exacta del error
            scope['user'] = AnonymousUser()
            return await super().__call__(scope, receive, send)