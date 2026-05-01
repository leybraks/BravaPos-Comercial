from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from ..models import ReglaNegocio, HorarioVisibilidad, ComponenteCombo, Producto

class MarketingGlobalView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        negocio = request.user.negocio
        
        # Traemos todas las reglas de este negocio
        reglas_db = ReglaNegocio.objects.filter(negocio=negocio).values(
            'id', 'tipo', 'valor', 'es_porcentaje', 'monto_minimo_orden', 'dia_semana', 'activa'
        )
        
        return Response({
            "reglas": list(reglas_db)
        })
    # @transaction.atomic asegura que si algo falla, no se guarda nada a medias
    @transaction.atomic 
    def post(self, request):
        # Asumimos que el usuario logueado tiene un negocio asociado
        negocio = request.user.negocio 
        data = request.data
        
        # ==========================================
        # 🚚 1. PROCESAR REGLAS DE NEGOCIO
        # ==========================================
        reglas = data.get('reglasCreadas', [])
        for r in reglas:
            # Solo guardamos las que tienen el ID generado temporalmente por React (Date.now())
            # (Si usas un ID real de DB, aquí harías un update en lugar de create)
            if str(r.get('id')).startswith('17'): 
                # Limpieza de datos (React manda strings vacíos "", Django necesita None o 0)
                dia = r.get('dia_semana')
                dia = None if dia == "" else int(dia)
                
                monto = r.get('monto_minimo_orden')
                monto = 0 if monto == "" else float(monto)
                
                valor = r.get('valor')
                valor = 0 if valor == "" else float(valor)

                ReglaNegocio.objects.create(
                    negocio=negocio,
                    tipo=r.get('tipo'),
                    valor=valor,
                    es_porcentaje=r.get('es_porcentaje', False),
                    monto_minimo_orden=monto,
                    dia_semana=dia,
                    activa=r.get('activa', True)
                )

        # ==========================================
        # ⏰ 2. PROCESAR HAPPY HOURS
        # ==========================================
        horario = data.get('configuracionHorario', {})
        if horario.get('productoId'):
            prod_id = horario['productoId']
            
            # Buscamos si ya tiene horario, si no, lo creamos
            hv, created = HorarioVisibilidad.objects.get_or_create(producto_id=prod_id)
            hv.dias_permitidos = horario.get('dias', [])
            
            # Si mandaron hora, la ponemos, si no, None (aplica todo el día)
            hv.hora_inicio = horario.get('horaInicio') or None
            hv.hora_fin = horario.get('horaFin') or None
            hv.save()

        # ==========================================
        # 🍔 3. PROCESAR CONSTRUCTOR DE COMBOS
        # ==========================================
        combo = data.get('configuracionCombo', {})
        if combo.get('productoPadreId'):
            padre_id = combo['productoPadreId']
            
            # Marcamos el producto padre como "Combo"
            padre = Producto.objects.get(id=padre_id, negocio=negocio)
            padre.es_combo = True
            padre.save()
            
            # Borramos los componentes viejos para evitar duplicados y metemos los nuevos
            ComponenteCombo.objects.filter(combo_id=padre_id).delete()
            
            for item in combo.get('items', []):
                ComponenteCombo.objects.create(
                    combo_id=padre_id,
                    producto_hijo_id=item['productoId'],
                    cantidad=item['cantidad']
                )

        return Response({"mensaje": "¡Marketing y Promociones guardados con éxito!"})