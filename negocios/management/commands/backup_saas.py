import os
from django.core.management.base import BaseCommand
from django.core import serializers
from django.utils.timezone import now
from negocios.models import (
    Negocio, Sede, Mesa, Categoria, Producto, VariacionProducto, 
    Empleado, SesionCaja, Orden, DetalleOrden, Pago, ModificadorRapido,
    GrupoVariacion, OpcionVariacion, DetalleOrdenOpcion, MovimientoCaja,
    InsumoBase, InsumoSede, RecetaDetalle, RecetaOpcion, RegistroAuditoria
)

class Command(BaseCommand):
    help = 'Genera un dataset JSON completo y profundo por cada negocio para ML'

    def handle(self, *args, **options):
        fecha_str = now().strftime("%Y-%m-%d")
        
        for negocio in Negocio.objects.all():
            self.stdout.write(f"Procesando: {negocio.nombre}...")
            dataset = []

            # 1. Nivel Negocio (Configuración y Catálogo)
            dataset.append(negocio)
            dataset.extend(list(Categoria.objects.filter(negocio=negocio)))
            dataset.extend(list(ModificadorRapido.objects.filter(negocio=negocio)))
            dataset.extend(list(InsumoBase.objects.filter(negocio=negocio)))
            
            # 2. Productos y sus jerarquías (Recursivo)
            productos = Producto.objects.filter(negocio=negocio)
            dataset.extend(list(productos))
            dataset.extend(list(VariacionProducto.objects.filter(producto__in=productos)))
            
            grupos = GrupoVariacion.objects.filter(producto__in=productos)
            dataset.extend(list(grupos))
            dataset.extend(list(OpcionVariacion.objects.filter(grupo__in=grupos)))
            dataset.extend(list(RecetaDetalle.objects.filter(producto__in=productos)))

            # 3. Nivel Sede (Operaciones y Stocks)
            sedes = Sede.objects.filter(negocio=negocio)
            dataset.extend(list(sedes))
            dataset.extend(list(Mesa.objects.filter(sede__in=sedes)))
            dataset.extend(list(Empleado.objects.filter(sede__in=sedes)))
            dataset.extend(list(InsumoSede.objects.filter(sede__in=sedes)))
            dataset.extend(list(RegistroAuditoria.objects.filter(sede__in=sedes)))

            # 4. Transacciones (La "carnita" para tus modelos de ML)
            sesiones = SesionCaja.objects.filter(sede__in=sedes)
            dataset.extend(list(sesiones))
            dataset.extend(list(MovimientoCaja.objects.filter(sesion_caja__in=sesiones)))
            
            ordenes = Orden.objects.filter(sede__in=sedes)
            dataset.extend(list(ordenes))
            
            detalles = DetalleOrden.objects.filter(orden__in=ordenes)
            dataset.extend(list(detalles))
            dataset.extend(list(Pago.objects.filter(orden__in=ordenes)))
            dataset.extend(list(DetalleOrdenOpcion.objects.filter(detalle_orden__in=detalles)))

            # Guardar en un archivo único por negocio
            filename = f"ML_DATA_{negocio.id}_{negocio.nombre.replace(' ', '_')}_{fecha_str}.json"
            
            # Asegúrate de que la carpeta exista en tu servidor
            path = f"/home/ubuntu/backups/ml_datasets/{fecha_str}/"
            os.makedirs(path, exist_ok=True)

            with open(os.path.join(path, filename), "w", encoding="utf-8") as f:
                f.write(serializers.serialize("json", dataset, indent=2))

            self.stdout.write(self.style.SUCCESS(f"✅ Dataset creado: {filename}"))