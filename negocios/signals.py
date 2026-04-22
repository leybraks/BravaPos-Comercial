from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import F
from django.db import transaction # ✨ 1. Importamos la transacción
from .models import Pago, InsumoSede, RecetaDetalle, RecetaOpcion

@receiver(post_save, sender=Pago)
def procesar_descuento_stock(sender, instance, created, **kwargs):
    """
    Cuando se crea un Pago, recorremos la orden y descontamos el stock 
    de la receta base Y de las opciones extras elegidas.
    """
    if created: 
        orden = instance.orden
        sede = orden.sede
        
        with transaction.atomic():
            for detalle in orden.detalles.all():
                producto = detalle.producto
                cantidad_vendida = detalle.cantidad
                
                # 🔪 1. DESCONTAMOS LA RECETA BASE DEL PLATO
                recetas_base = RecetaDetalle.objects.filter(producto=producto)
                for receta in recetas_base:
                    gasto_total = float(receta.cantidad_necesaria) * float(cantidad_vendida)
                    InsumoSede.objects.filter(
                        sede=sede, insumo_base=receta.insumo
                    ).update(stock_actual=F('stock_actual') - gasto_total)
                    
                # 🔪 2. ✨ NUEVO: DESCONTAMOS LAS VARIACIONES Y EXTRAS
                # Recorremos qué opciones eligió el cliente (Ej: Tamaño Familiar, Extra Rachi)
                for opcion_seleccionada in detalle.opciones_seleccionadas.all():
                    
                    # Buscamos la receta de esa opción específica
                    recetas_opcion = RecetaOpcion.objects.filter(opcion=opcion_seleccionada.opcion_variacion)
                    
                    for receta_opc in recetas_opcion:
                        # Si compró 2 pizzas familiares, gastamos 2 veces los insumos de la "Familiar"
                        gasto_total_opcion = float(receta_opc.cantidad_necesaria) * float(cantidad_vendida)
                        InsumoSede.objects.filter(
                            sede=sede, insumo_base=receta_opc.insumo
                        ).update(stock_actual=F('stock_actual') - gasto_total_opcion)