import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

JWT_SECRET = os.getenv('JWT_SECRET', 'xC9At_Fjj72KKADDJdKweZZS6q_nGzTRaEtr8dhmJvhLZlAov034taFme9zkTgMXKlU')
SECRET_KEY = os.getenv('SECRET_KEY', JWT_SECRET)

# On Render free tier: force DEBUG=False to save significant RAM
# (Django debug mode keeps full SQL query history in memory)
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',

    # Local apps
    'apps.accounts',
    'apps.masterdata',
    'apps.shipments',
    'apps.quotes',
    'apps.routing',
    'apps.weather',
    'apps.customs',
    'apps.risk',
    'apps.ml_pricing',
    'apps.agent_ops',
    'apps.analytics_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
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
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

# SimpleJWT Configuration
SIMPLE_JWT = {
    'SIGNING_KEY': JWT_SECRET,
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-user-role',
    'x-user-email',
]

# ─── Startup Pre-Warm ─────────────────────────────────────────────────────────
# Only pre-warm MongoDB connection (lightweight).
# ML model is intentionally NOT pre-warmed here — it lazy-loads on first
# prediction request. Pre-warming at boot on Render free tier (512MB)
# immediately consumes 150-300MB RAM before any traffic arrives, causing OOM.
import threading

def _prewarm_mongo():
    try:
        from core.mongodb import get_mongo_db
        get_mongo_db()
    except Exception:
        pass

threading.Thread(target=_prewarm_mongo, daemon=True, name='mongo-prewarm').start()

