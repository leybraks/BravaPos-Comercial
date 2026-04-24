# negocios/serializers_jwt.py
"""
🛡️ FIX #2: CustomTokenObtainPairView y CustomTokenRefreshView

Los tokens JWT ya NO se devuelven en el cuerpo de la respuesta JSON.
En su lugar, se setean como cookies HttpOnly; Secure; SameSite=Lax.

Esto previene que código JavaScript (incluyendo scripts XSS inyectados)
pueda leer los tokens desde document.cookie o localStorage.

El frontend debe configurar axios con `withCredentials: true` para
que las cookies se envíen automáticamente en cada request.
"""
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle


def _set_token_cookies(response, access_token, refresh_token=None):
    """
    Setea los tokens JWT como cookies HttpOnly.
    Centraliza la configuración para evitar inconsistencias.
    """
    jwt_settings = settings.SIMPLE_JWT
    secure = jwt_settings.get('AUTH_COOKIE_SECURE', False)
    samesite = jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax')
    http_only = jwt_settings.get('AUTH_COOKIE_HTTP_ONLY', True)
    path = jwt_settings.get('AUTH_COOKIE_PATH', '/')

    # Calcular max_age en segundos desde timedelta
    access_lifetime = jwt_settings.get('ACCESS_TOKEN_LIFETIME')
    refresh_lifetime = jwt_settings.get('REFRESH_TOKEN_LIFETIME')

    response.set_cookie(
        key=jwt_settings.get('AUTH_COOKIE', 'access_token'),
        value=str(access_token),
        max_age=int(access_lifetime.total_seconds()) if access_lifetime else 3600,
        httponly=http_only,
        secure=secure,
        samesite=samesite,
        path=path,
    )

    if refresh_token is not None:
        response.set_cookie(
            key=jwt_settings.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
            value=str(refresh_token),
            max_age=int(refresh_lifetime.total_seconds()) if refresh_lifetime else 86400,
            httponly=http_only,
            secure=secure,
            samesite=samesite,
            path=path,
        )

    return response


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Datos adicionales en el payload del JWT
        if hasattr(user, 'negocio'):
            token['negocio_id'] = user.negocio.id
            token['rol'] = 'Dueño'
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login del administrador/dueño.
    Devuelve datos no-sensibles en el body y setea tokens en cookies HttpOnly.
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        tokens = serializer.validated_data
        access_token  = tokens.get('access')
        refresh_token = tokens.get('refresh')
        user = serializer.user

        # Solo enviamos datos no-sensibles en el body JSON
        response_data = {
            'negocio_id': user.negocio.id if hasattr(user, 'negocio') else None,
            'rol': 'Dueño' if hasattr(user, 'negocio') else 'Admin',
            # ⚠️  Los tokens NO van aquí — viajan en las cookies HttpOnly
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        _set_token_cookies(response, access_token, refresh_token)
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """
    Refresco de token.
    Lee el refresh token de la cookie HttpOnly (no del body).
    Devuelve el nuevo access token también como cookie.
    """

    def post(self, request, *args, **kwargs):
        # Leer el refresh token desde la cookie, no del body
        refresh_token = request.COOKIES.get(
            settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH', 'refresh_token')
        )

        if not refresh_token:
            return Response(
                {'error': 'No se encontró el refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Inyectamos el token en el request.data para que el serializer lo procese
        request._full_data = {'refresh': refresh_token}

        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            return Response(
                {'error': 'Refresh token inválido o expirado.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        new_access = response.data.get('access')
        new_refresh = response.data.get('refresh')  # Solo si ROTATE_REFRESH_TOKENS=True

        # Limpiar tokens del body de la respuesta
        response.data = {'detail': 'Token renovado correctamente.'}

        # Setear nuevas cookies
        _set_token_cookies(response, new_access, new_refresh)
        return response


class LogoutView:
    """
    Logout: elimina las cookies de tokens.
    Registrar en urls.py como:
        path('token/logout/', LogoutView.as_view())
    """
    from rest_framework.views import APIView
    from rest_framework.permissions import IsAuthenticated

    class _View(APIView):
        permission_classes = []  # Permite logout incluso con token expirado

        def post(self, request, *args, **kwargs):
            response = Response({'detail': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)
            jwt_settings = settings.SIMPLE_JWT

            # Eliminar ambas cookies seteando max_age=0
            response.delete_cookie(
                key=jwt_settings.get('AUTH_COOKIE', 'access_token'),
                path=jwt_settings.get('AUTH_COOKIE_PATH', '/'),
                samesite=jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax'),
            )
            response.delete_cookie(
                key=jwt_settings.get('AUTH_COOKIE_REFRESH', 'refresh_token'),
                path=jwt_settings.get('AUTH_COOKIE_PATH', '/'),
                samesite=jwt_settings.get('AUTH_COOKIE_SAMESITE', 'Lax'),
            )
            return response

    # Exponer como clase con .as_view()
    as_view = _View.as_view