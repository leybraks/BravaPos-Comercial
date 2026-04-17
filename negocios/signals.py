from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Pago, InsumoSede, RecetaDetalle
from django.db.models import F

@receiver(post_save, sender=Pago)
def procesar_descuento_stock(sender, instance, created, **kwargs):
    """
    Cuando se crea un Pago, recorremos la orden y descontamos el stock 
    de la sede donde se realizó la venta.
    """
    if created: # Solo si es un pago nuevo
        orden = instance.orden
        sede = orden.sede
        
        # 1. Recorremos cada plato de la orden
        for detalle in orden.detalles.all():
            producto = detalle.producto
            cantidad_vendida = detalle.cantidad
            
            # 2. Buscamos qué ingredientes (InsumoBase) lleva este plato
            recetas = RecetaDetalle.objects.filter(producto=producto)
            
            for receta in recetas:
                # Calculamos cuánto gastamos: $Gasto = Cantidad \times Receta$
                gasto_total = receta.cantidad_necesaria * cantidad_vendida
                
                # 3. Restamos del stock físico de ESTA sede
                InsumoSede.objects.filter(
                    sede=sede, 
                    insumo_base=receta.insumo
                ).update(stock_actual=F('stock_actual') - gasto_total)