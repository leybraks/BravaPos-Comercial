from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# El Router crea las URLs mágicamente
router = DefaultRouter()
router.register(r'negocios', views.NegocioViewSet)
router.register(r'sedes', views.SedeViewSet)
router.register(r'mesas', views.MesaViewSet)
router.register(r'productos', views.ProductoViewSet)
router.register(r'ordenes', views.OrdenViewSet)
router.register(r'detalles', views.DetalleOrdenViewSet)
router.register(r'pagos', views.PagoViewSet)
router.register(r'roles', views.RolViewSet)
router.register(r'empleados', views.EmpleadoViewSet)
router.register(r'sesiones_caja', views.SesionCajaViewSet)
urlpatterns = [
    # Todas tus APIs vivirán bajo la ruta /api/
    path('', include(router.urls)),
    path('negocio/configuracion/', views.configuracion_negocio, name='configuracion_negocio'),
    path('dashboard/metricas/', views.metricas_dashboard, name='metricas_dashboard'),
]