from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.authtoken import views
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('negocios.urls')),
]