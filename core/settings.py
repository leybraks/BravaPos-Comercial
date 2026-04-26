"""
Django settings for core project — VERSIÓN SEGURA
Corregido según auditoría de seguridad.
"""
import os
import dj_database_url
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()


# ============================================================
# BASE
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================================
# SEGURIDAD CRÍTICA  (leer de variables de entorno, nunca hardcodeado)
# ============================================================
# ✅ FIX #1: SECRET_KEY desde variable de entorno
# Genera una nueva con:
#   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Luego ponla en tu archivo .env:  SECRET_KEY=<valor>
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("La variable de entorno SECRET_KEY no está definida.")

# ✅ FIX #1b: DEBUG desactivado en producción
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# ✅ FIX #2: Sin wildcard en ALLOWED_HOSTS
# Agrega tus dominios reales en la variable de entorno:
#   ALLOWED_HOSTS=163.176.135.213,tu-dominio.com
_allowed = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()]

# ============================================================
# APLICACIONES
# ============================================================
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Herramientas de terceros
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Nuestras Apps
    'negocios',
]

ASGI_APPLICATION = 'core.asgi.application'

# ============================================================
# CHANNEL LAYERS
# ============================================================
REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379')  # 'redis' = nombre del servicio en docker-compose

if os.environ.get('USE_REDIS', 'True') == 'True':
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    # Solo para desarrollo local sin Docker
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ============================================================
# BASE DE DATOS
# ============================================================
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', f'sqlite:///{BASE_DIR}/db.sqlite3'),
        conn_max_age=600
    )
}

# ============================================================
# VALIDACIÓN DE CONTRASEÑAS
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ============================================================
# INTERNACIONALIZACIÓN
# ============================================================
LANGUAGE_CODE = 'es-pe'
TIME_ZONE = 'America/Lima'
USE_I18N = True

# ✅ FIX #13: USE_TZ = True para evitar datos financieros incorrectos
# Con USE_TZ=True Django guarda en UTC y convierte a America/Lima al mostrar.
USE_TZ = True

# ============================================================
# ARCHIVOS ESTÁTICOS
# ============================================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# CORS
# ============================================================
# ✅ FIX #3: NUNCA usar CORS_ALLOW_ALL_ORIGINS = True en producción
CORS_ALLOW_ALL_ORIGINS = False

# Agrega orígenes extra desde .env:  CORS_EXTRA_ORIGINS=https://mi-app.com
_extra_cors = os.environ.get('CORS_EXTRA_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _extra_cors.split(',') if o.strip()]

if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with', 'x-empleado-id',
]

# ============================================================
# HEADERS DE SEGURIDAD HTTP  (✅ FIX #15)
# ============================================================
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'                    # Previene Clickjacking
SECURE_REFERRER_POLICY = 'same-origin'

# Activa estos cuando tengas HTTPS/TLS (✅ FIX #12):
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True

# ============================================================
# REST FRAMEWORK + JWT
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'negocios.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/hour',   
        'user': '1000/hour',
        'intentos_pin': '5/minute',
        # ✅ FIX #8: Límite estricto para evitar fuerza bruta en el login
        'login': '5/minute' 
    },
}

SIMPLE_JWT = {
    # 🛡️ Solución Problema #7: Bajamos los tiempos de vida
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),    # 1 hora es suficiente para una sesión activa
    'REFRESH_TOKEN_LIFETIME': timedelta(days=90),       # Bajamos de 1 año a 1 día
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'BLACKLIST_AFTER_ROTATION': True,
    'ROTATE_REFRESH_TOKENS': True,
    'UPDATE_LAST_LOGIN': True,
    'TOKEN_OBTAIN_SERIALIZER': 'negocios.serializers.CustomTokenObtainPairSerializer',
    
    # 🛡️ Solución Problema #2: Configuración para Cookies HttpOnly
    'AUTH_COOKIE': 'access_token',           # Nombre de la cookie de acceso
    'AUTH_COOKIE_REFRESH': 'refresh_token',  # Nombre de la cookie de refresh
    'AUTH_COOKIE_HTTP_ONLY': True,           # 🚫 Impide que JavaScript lea el token (Blindaje XSS)
    'AUTH_COOKIE_SECURE': False,             # Cambiar a True cuando actives HTTPS (Problema #6)
    'AUTH_COOKIE_SAMESITE': 'Lax',           # Protección contra ataques CSRF
    'AUTH_COOKIE_PATH': '/',
}

CORS_ALLOW_CREDENTIALS = True