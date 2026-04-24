from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.authtoken import views as authtoken_views
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Limita intentos de login al scope 'login' definido en DEFAULT_THROTTLE_RATES."""
    scope = 'login'


class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [LoginRateThrottle]


class ThrottledObtainAuthTokenView(authtoken_views.ObtainAuthToken):
    throttle_classes = [LoginRateThrottle]


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),
    path('api/login-tablet/', ThrottledObtainAuthTokenView.as_view(), name='login_tablet'),
    path('api/', include('negocios.urls')),
]