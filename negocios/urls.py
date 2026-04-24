from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers_jwt import CustomTokenObtainPairView
from . import views

# El Router crea las URLs mágicamente
router = DefaultRouter()

# Rutas protegidas y dinámicas (Todas con 'basename' para evitar AssertionError)
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

    # ✅ Login del dueño — ahora usa el serializer JWT personalizado
    # Devuelve: access, refresh, negocio_id, negocio_nombre, rol
    path('login-admin/', CustomTokenObtainPairView.as_view(), name='login-admin'),

    # ✅ Refresh token — renueva el access token automáticamente desde React
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Otras rutas
    path('negocio/configuracion/', views.configuracion_negocio, name='configuracion_negocio'),
    path('dashboard/metricas/', views.metricas_dashboard, name='metricas_dashboard'),
    path('movimientos-caja/', views.registrar_movimiento_caja, name='registrar_movimiento_caja'),

    # Rutas públicas (sin token — carta QR)
    path('menu-publico/<int:sede_id>/', views.menu_publico, name='menu_publico'),
    path('orden-publica/<int:sede_id>/<int:mesa_id>/', views.orden_publica, name='orden_publica'),
]