from decimal import Decimal
from django.utils import timezone
from .models import ReglaNegocio


def aplicar_reglas_negocio(orden, metodo_pago=None):
    """
    Recalcula subtotal, descuento_total, recargo_total y total de una Orden
    aplicando todas las ReglaNegocio activas del negocio.

    - orden: instancia de Orden con detalles ya guardados (no hace orden.save()).
    - metodo_pago: método de pago conocido al momento del cobro ('yape', 'efectivo', etc.).
      Si es None se lee orden.metodo_pago_esperado (útil para delivery/bot).

    Llama a orden.save() externamente después de esta función.
    """
    # 1. Subtotal bruto desde los detalles
    subtotal = sum(
        d.precio_unitario * d.cantidad
        for d in orden.detalles.all()
    )
    subtotal = Decimal(str(subtotal))
    orden.subtotal = subtotal

    reglas = ReglaNegocio.objects.filter(negocio=orden.sede.negocio, activa=True)

    descuento = Decimal('0.00')
    recargo = Decimal('0.00')

    ahora = timezone.localtime()
    dia_hoy = ahora.weekday()   # 0=Lunes, 6=Domingo
    hora_hoy = ahora.hour

    costo_envio = Decimal(str(orden.costo_envio or 0))

    # Determina si el pago es con Yape/Efectivo/Plin
    metodos_descuento = ('yape', 'efectivo', 'plin')
    metodo_lower = str(metodo_pago or orden.metodo_pago_esperado or '').lower()
    pago_con_descuento = any(m in metodo_lower for m in metodos_descuento)

    for regla in reglas:
        # Salta reglas que requieren un monto mínimo que no se alcanza
        if subtotal < regla.monto_minimo_orden:
            continue

        valor = Decimal(str(regla.valor))

        def monto_o_porcentaje(base):
            return base * valor / 100 if regla.es_porcentaje else valor

        if regla.tipo == 'recargo_llevar' and orden.tipo == 'llevar':
            recargo += monto_o_porcentaje(subtotal)

        elif regla.tipo == 'delivery_gratis' and orden.tipo == 'delivery':
            costo_envio = Decimal('0.00')
            orden.costo_envio = Decimal('0.00')

        elif regla.tipo == 'descuento_dia':
            if regla.dia_semana is not None and regla.dia_semana == dia_hoy:
                descuento += monto_o_porcentaje(subtotal)

        elif regla.tipo == 'descuento_yape_efectivo' and pago_con_descuento:
            descuento += monto_o_porcentaje(subtotal)

        elif regla.tipo == 'recargo_nocturno' and (hora_hoy >= 22 or hora_hoy < 6):
            recargo += monto_o_porcentaje(subtotal)

        elif regla.tipo == 'servicio_grupo_grande':
            recargo += monto_o_porcentaje(subtotal)

    orden.descuento_total = descuento.quantize(Decimal('0.01'))
    orden.recargo_total = recargo.quantize(Decimal('0.01'))

    total = subtotal - descuento + recargo + costo_envio
    orden.total = max(total, Decimal('0.00')).quantize(Decimal('0.01'))
