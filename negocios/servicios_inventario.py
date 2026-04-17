from django.db import transaction

def descontar_stock_por_orden(orden):
    """
    Recibe una Orden pagada/completada y descuenta el stock exacto
    de todos los insumos utilizados en esa Sede.
    """
    # 🛡️ Si la orden se cancela, no deberíamos descontar (o deberíamos devolverlo)
    if orden.estado == 'cancelado':
        return

    with transaction.atomic(): # Si falla un ingrediente, se deshace todo para no corromper el inventario
        # 1. Revisamos cada detalle (plato) de la orden
        for detalle in orden.detalles.all():
            producto = detalle.producto
            cantidad_vendida = detalle.cantidad
            
            # 2. Buscamos la receta de ese producto
            ingredientes = producto.ingredientes.all()
            
            # 3. Descontamos cada insumo de la base de datos
            for ingrediente in ingredientes:
                # Si se vendieron 3 Lomos, multiplicamos 200g x 3
                gasto_total = ingrediente.cantidad_necesaria * cantidad_vendida
                
                # Descontamos directamente en la base de datos usando F() para evitar colisiones 
                # si dos meseros venden al mismo milisegundo
                from django.db.models import F
                Insumo.objects.filter(id=ingrediente.insumo.id).update(
                    stock_actual=F('stock_actual') - gasto_total
                )