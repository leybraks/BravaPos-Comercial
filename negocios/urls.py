from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# El Router crea las URLs mágicamente
router = DefaultRouter()

# Rutas normales (mantienen su queryset original)
router.register(r'negocios', views.NegocioViewSet)
router.register(r'sedes', views.SedeViewSet)
router.register(r'detalles', views.DetalleOrdenViewSet)
router.register(r'pagos', views.PagoViewSet)
router.register(r'roles', views.RolViewSet)
router.register(r'sesiones_caja', views.SesionCajaViewSet) # Eliminé el duplicado de 'cajas'
router.register(r'categorias', views.CategoriaViewSet, basename='categoria')
# ✨ RUTAS DINÁMICAS (Necesitan su basename porque ahora filtran por Sede/Negocio)
router.register(r'mesas', views.MesaViewSet, basename='mesa')
router.register(r'productos', views.ProductoViewSet, basename='producto')
router.register(r'ordenes', views.OrdenViewSet, basename='orden')
router.register(r'empleados', views.EmpleadoViewSet, basename='empleado')

urlpatterns = [
    # Todas tus APIs vivirán bajo la ruta /api/
    path('', include(router.urls)),
    
    path('negocio/configuracion/', views.configuracion_negocio, name='configuracion_negocio'),
    path('dashboard/metricas/', views.metricas_dashboard, name='metricas_dashboard'),
    path('movimientos-caja/', views.registrar_movimiento_caja, name='registrar_movimiento_caja'),
]