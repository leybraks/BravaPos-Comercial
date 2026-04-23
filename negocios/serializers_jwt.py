# ============================================================
# negocios/serializers_jwt.py  (crea este archivo)
# ============================================================
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # --- Datos del Dueño (User de Django) ---
        token['username'] = user.username
        token['email']    = user.email

        # --- Datos del Negocio (si el usuario tiene uno) ---
        try:
            negocio = user.negocio  # OneToOne inverso definido en tu modelo
            token['negocio_id']     = negocio.id
            token['negocio_nombre'] = negocio.nombre
            token['rol']            = 'Dueño'   # El dueño siempre es Dueño

            # Feature flags del negocio (para que React sepa qué módulos mostrar)
            token['modulos'] = {
                'salon':       negocio.mod_salon_activo,
                'cocina':      negocio.mod_cocina_activo,
                'inventario':  negocio.mod_inventario_activo,
                'delivery':    negocio.mod_delivery_activo,
                'carta_qr':    negocio.mod_carta_qr_activo,
                'facturacion': negocio.mod_facturacion_activo,
            }
        except Exception:
            # Si el User no tiene Negocio (ej: superuser de admin)
            token['negocio_id']     = None
            token['negocio_nombre'] = None
            token['rol']            = 'Admin'
            token['modulos']        = {}

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Agregamos los mismos datos al body del response
        # Para que loginAdministrador en React pueda leerlos sin decodificar
        try:
            negocio = self.user.negocio
            data['negocio_id']     = negocio.id
            data['negocio_nombre'] = negocio.nombre
            data['rol']            = 'Dueño'
        except Exception:
            data['negocio_id']     = None
            data['negocio_nombre'] = None
            data['rol']            = 'Admin'

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer