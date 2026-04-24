from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 🛡️ IMPORTAMOS TUS VISTAS SEGURAS DE COOKIES
from .serializers_jwt import CustomTokenObtainPairView, CustomTokenRefreshView, LogoutView
from . import views

# El Router crea las URLs mágicamente
router = DefaultRouter()

router.register(r'negocios', views.NegocioViewSet, basename='negocio')
router.register(r'sedes', views.SedeViewSet, basename='sede')
router.register(r'detalles', views.DetalleOrdenViewSet, basename='detalleorden')
router.register(r'pagos', views.PagoViewSet, basename='pago')
router.register(r'roles', views.RolViewSet, basename='rol')
router.register(r'sesiones_caja', views.SesionCajaViewSet, basename='sesioncaja')
router.register(r'categorias', views.CategoriaViewSet, basename='categoria')
router.register(r'mesas', views.MesaViewSet, basename='mesa')
router.register(r'productos', views.ProductoViewSet, basename='producto')
router.register(r'ordenes', views.OrdenViewSet, basename='orden')
router.register(r'empleados', views.EmpleadoViewSet, basename='empleado')
router.register(r'insumo-base', views.InsumoBaseViewSet, basename='insumobase')
router.register(r'insumo-sede', views.InsumoSedeViewSet, basename='insumosede')
router.register(r'modificadores-rapidos', views.ModificadorRapidoViewSet, basename='modificadorrapido')
router.register(r'grupos-variacion', views.GrupoVariacionViewSet, basename='grupovariacion')
router.register(r'opciones-variacion', views.OpcionVariacionViewSet, basename='opcionvariacion')
router.register(r'recetas-opcion', views.RecetaOpcionViewSet, basename='recetaopcion')

urlpatterns = [
    path('', include(router.urls)),

    # ==========================================
    # 🛡️ ENDPOINTS DE AUTENTICACIÓN (COOKIES)
    # ==========================================
    # Login: Te da las cookies HttpOnly y la info del usuario
    path('login-admin/', CustomTokenObtainPairView.as_view(), name='login-admin'),

    # Refresh: Renueva el Access Token leyendo la cookie de Refresh automáticamente
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),

    # Logout: Destruye las cookies en el navegador del usuario
    path('token/logout/', LogoutView.as_view(), name='token-logout'),


    # ==========================================
    # RUTAS INDEPENDIENTES
    # ==========================================
    path('negocio/configuracion/', views.configuracion_negocio, name='configuracion_negocio'),
    path('dashboard/metricas/', views.metricas_dashboard, name='metricas_dashboard'),
    path('movimientos-caja/', views.registrar_movimiento_caja, name='registrar_movimiento_caja'),
    path('verificar-sesion/', views.verificar_sesion, name='verificar_sesion'),

    # ==========================================
    # RUTAS PÚBLICAS (Sin Token - Carta QR)
    # ==========================================
    path('menu-publico/<int:sede_id>/', views.menu_publico, name='menu_publico'),
    path('orden-publica/<int:sede_id>/<int:mesa_id>/', views.orden_publica, name='orden_publica'),
]