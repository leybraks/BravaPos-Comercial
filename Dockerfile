FROM python:3.11-slim

# Evita que Python escriba archivos .pyc y fuerza a que la consola muestre logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalamos dependencias del sistema operativo que PostgreSQL podría necesitar
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Si aún no tienes daphne en tu requirements.txt, descomenta la siguiente línea
# RUN pip install daphne

COPY . .

EXPOSE 8000

# Usamos Daphne para soportar tus WebSockets y tu API HTTP al mismo tiempo
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "tu_proyecto.asgi:application"] 
# ⚠️ CAMBIA "tu_proyecto" por el nombre real de la carpeta donde está tu asgi.py