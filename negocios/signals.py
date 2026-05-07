from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db.models import F
from django.db import transaction
from django.core.mail import send_mail
from core import settings # ✨ 1. Importamos la transacción
from .models import HorarioVisibilidad, Pago, InsumoSede, RecetaDetalle, RecetaOpcion, ReglaNegocio

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

def _enviar_email_auditoria(negocio, accion, objeto, detalle):
    """Helper que envía email al dueño del negocio."""
    email_dueno = negocio.propietario.email
    if not email_dueno:
        return
    try:
        send_mail(
            subject=f'[BravaPOS] {accion}: {objeto}',
            message=(
                f'Hola,\n\n'
                f'Se realizó el siguiente cambio en tu negocio "{negocio.nombre}":\n\n'
                f'Acción: {accion}\n'
                f'Objeto: {objeto}\n'
                f'Detalle: {detalle}\n\n'
                f'Si no reconoces este cambio, contacta a soporte.\n\n'
                f'— BravaPOS'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email_dueno],
            fail_silently=True,  # No rompe el flujo si el email falla
        )
    except Exception:
        pass


@receiver(post_save, sender=HorarioVisibilidad)
def auditoria_happy_hour(sender, instance, created, **kwargs):
    accion = 'Creado' if created else 'Editado'
    objetivo = instance.producto.nombre if instance.producto else (instance.categoria.nombre if instance.categoria else 'Sin objetivo')
    _enviar_email_auditoria(
        negocio=instance.negocio,
        accion=f'Happy Hour {accion}',
        objeto=instance.nombre,
        detalle=f'Tipo: {instance.get_tipo_promo_display()} | Aplica a: {objetivo} | Activo: {instance.activa}'
    )

@receiver(post_delete, sender=HorarioVisibilidad)
def auditoria_happy_hour_delete(sender, instance, **kwargs):
    objetivo = instance.producto.nombre if instance.producto else (instance.categoria.nombre if instance.categoria else 'Sin objetivo')
    _enviar_email_auditoria(
        negocio=instance.negocio,
        accion='Happy Hour Eliminado',
        objeto=instance.nombre,
        detalle=f'Aplica a: {objetivo}'
    )

@receiver(post_save, sender=ReglaNegocio)
def auditoria_regla(sender, instance, created, **kwargs):
    accion = 'Creada' if created else 'Editada'
    _enviar_email_auditoria(
        negocio=instance.negocio,
        accion=f'Regla de Negocio {accion}',
        objeto=instance.nombre or instance.get_tipo_display(),
        detalle=f'Tipo: {instance.get_tipo_display()} | Valor: {instance.valor} | Activa: {instance.activa}'
    )

@receiver(post_delete, sender=ReglaNegocio)
def auditoria_regla_delete(sender, instance, **kwargs):
    _enviar_email_auditoria(
        negocio=instance.negocio,
        accion='Regla de Negocio Eliminada',
        objeto=instance.nombre or instance.get_tipo_display(),
        detalle=f'Tipo: {instance.get_tipo_display()}'
    )