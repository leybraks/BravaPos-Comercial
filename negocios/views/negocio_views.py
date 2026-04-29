import time
import requests
import logging

from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from ..models import Negocio, Sede
from ..serializers import NegocioSerializer, SedeSerializer

logger = logging.getLogger(__name__)


# ============================================================
# NEGOCIO
# ============================================================

class NegocioViewSet(viewsets.ModelViewSet):
    serializer_class = NegocioSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Negocio.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Negocio.objects.filter(propietario=self.request.user)
        return Negocio.objects.none()


# ============================================================
# SEDE
# ============================================================

class SedeViewSet(viewsets.ModelViewSet):
    serializer_class = SedeSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Sede.objects.all()
        if hasattr(self.request.user, 'negocio'):
            return Sede.objects.filter(negocio=self.request.user.negocio)
        return Sede.objects.none()

    def perform_create(self, serializer):
        negocio = self.request.user.negocio

        cantidad_actual = Sede.objects.filter(negocio=negocio, activo=True).count()
        limite = negocio.plan.max_sedes if negocio.plan else 1

        if cantidad_actual >= limite:
            raise ValidationError({
                "detail": f"¡Límite alcanzado! Tu plan actual permite un máximo de {limite} sedes. Contáctanos para subir de plan."
            })

        serializer.save(negocio=negocio)

    # ==========================================
    # ✨ ENDPOINT PARA N8N (público, sin auth)
    # ==========================================
    @action(detail=False, methods=['get'], url_path='info_bot', permission_classes=[AllowAny])
    def info_bot(self, request):
        instancia = request.query_params.get('instancia')

        if not instancia:
            return Response({'error': 'Falta el parámetro instancia'}, status=400)

        sede = Sede.objects.filter(whatsapp_instancia=instancia).first()

        if not sede:
            return Response({'error': 'Instancia no registrada en ninguna Sede'}, status=404)

        return Response({
            'sede_id': sede.id,
            'negocio_id': sede.negocio.id,
            'nombre_sede': sede.nombre,
            'nombre_negocio': sede.negocio.nombre
        })

    # ==========================================
    # 🤖 CONTROLES DE EVOLUTION API
    # ==========================================

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def crear_instancia_whatsapp(self, request, pk=None):
        sede = self.get_object()
        nombre_instancia = f"brava_{sede.negocio.id}_sede_{sede.id}"

        headers = {
            "apikey": settings.EVO_GLOBAL_KEY,
            "Content-Type": "application/json"
        }

        # 💀 PASO 0: MATAR AL ZOMBIE
        url_logout = f"{settings.EVO_API_URL}/instance/logout/{nombre_instancia}"
        url_borrar = f"{settings.EVO_API_URL}/instance/delete/{nombre_instancia}"
        try:
            requests.delete(url_logout, headers=headers, timeout=5)
            time.sleep(1)
            requests.delete(url_borrar, headers=headers, timeout=5)
            time.sleep(1)
        except Exception:
            pass

        # --- PASO 1: CREAR LA INSTANCIA LIMPIA ---
        url_crear = f"{settings.EVO_API_URL}/instance/create"
        payload_crear = {
            "instanceName": nombre_instancia,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS",
            "syncFullHistory": False,
            "readMessages": True
        }

        try:
            res_crear = requests.post(url_crear, json=payload_crear, headers=headers)

            if res_crear.status_code in [200, 201]:
                data = res_crear.json()
                qr_base64 = data.get('qrcode', {}).get('base64')

                # --- PASO 2: CONFIGURAR EL WEBHOOK INMEDIATAMENTE ---
                url_webhook_n8n = f"https://silvadata.me/n8n/webhook/9b66058c-df85-41ce-aeac-1e6a15414914?instancia={nombre_instancia}"
                url_set_webhook = f"{settings.EVO_API_URL}/webhook/set/{nombre_instancia}"
                payload_webhook = {
                    "webhook": {
                        "enabled": True,
                        "url": url_webhook_n8n,
                        "webhookByEvents": False,
                        "webhookBase64": False,
                        "events": ["MESSAGES_UPSERT"]
                    }
                }

                time.sleep(1)
                requests.post(url_set_webhook, json=payload_webhook, headers=headers)

                # --- PASO 3: ASEGURAR EL QR ---
                if not qr_base64:
                    time.sleep(2)
                    url_qr = f"{settings.EVO_API_URL}/instance/connect/{nombre_instancia}"
                    res_qr = requests.get(url_qr, headers=headers)
                    if res_qr.status_code == 200:
                        qr_base64 = res_qr.json().get('base64')

                sede.whatsapp_instancia = nombre_instancia
                sede.save()

                return Response({
                    "mensaje": "Instancia creada y Webhook armado",
                    "instancia": nombre_instancia,
                    "qr_base64": qr_base64
                })

            return Response({"error": res_crear.json()}, status=res_crear.status_code)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def obtener_qr(self, request, pk=None):
        sede = self.get_object()
        if not sede.whatsapp_instancia:
            return Response({"error": "La sede no tiene instancia vinculada"}, status=400)

        url = f"{settings.EVO_API_URL}/instance/connect/{sede.whatsapp_instancia}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return Response(response.json())
            return Response({"error": "No se pudo obtener el QR"}, status=response.status_code)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def eliminar_instancia(self, request, pk=None):
        sede = self.get_object()
        instancia_nombre = sede.whatsapp_instancia

        if not instancia_nombre:
            return Response({"mensaje": "No hay instancia activa en la base de datos"}, status=200)

        url = f"{settings.EVO_API_URL}/instance/delete/{instancia_nombre}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.delete(url, headers=headers)
            print(f"DEBUG Evolution Delete: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Error de conexión con Evolution API: {e}")

        sede.whatsapp_instancia = None
        sede.whatsapp_numero = None
        sede.save()

        return Response({
            "mensaje": "Conexión desconectada localmente",
            "info_api": "Instancia removida del servidor o ya no existía"
        })

    @action(detail=True, methods=['get'], url_path='estado_conexion', permission_classes=[IsAuthenticated])
    def estado_conexion(self, request, pk=None):
        sede = self.get_object()
        if not sede.whatsapp_instancia:
            return Response({"estado": "desconectado"})

        url = f"{settings.EVO_API_URL}/instance/connectionState/{sede.whatsapp_instancia}"
        headers = {"apikey": settings.EVO_GLOBAL_KEY}

        try:
            response = requests.get(url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                estado_evo = data.get("instance", {}).get("state", "")

                if estado_evo == "open":
                    return Response({"estado": "conectado"})
                return Response({"estado": "esperando"})

            return Response({"estado": "desconectado"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
