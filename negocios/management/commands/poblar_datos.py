# management/commands/seed_full_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal

from negocios.models import *

class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        print("🔥 Creando estructura base...")

        # 👤 USER
        user = User.objects.create(username="admin")

        # 💰 PLAN
        plan = PlanSaaS.objects.create(
            nombre="Pro",
            precio_mensual=99,
            modulo_inventario=True,
            modulo_kds=True,
            max_sedes=3
        )

        # 🏪 NEGOCIO
        negocio = Negocio.objects.create(
            propietario=user,
            nombre="Restaurante El Sabor",
            plan=plan,
            fin_prueba=timezone.now() + timedelta(days=15)
        )

        # 📍 SEDE
        sede = Sede.objects.create(
            negocio=negocio,
            nombre="Sede Centro"
        )

        # 👨‍🍳 ROLES
        rol_admin = Rol.objects.create(nombre="Admin", puede_configurar=True)
        rol_cajero = Rol.objects.create(nombre="Cajero", puede_cobrar=True)

        # 👷 EMPLEADO
        Empleado.objects.create(
            negocio=negocio,
            sede=sede,
            nombre="Juan Perez",
            pin="1234",
            rol=rol_admin
        )

        # 🪑 MESAS
        mesas = []
        for i in range(1, 21):
            mesas.append(
                Mesa.objects.create(sede=sede, numero_o_nombre=f"M{i}")
            )

        # 🍽️ CATEGORÍAS
        cat_platos = Categoria.objects.create(negocio=negocio, nombre="Platos")
        cat_bebidas = Categoria.objects.create(negocio=negocio, nombre="Bebidas")

        # 🍗 PRODUCTOS REALES
        productos = [
            ("Pollo a la Brasa", 18, cat_platos),
            ("Chaufa", 12, cat_platos),
            ("Lomo Saltado", 15, cat_platos),
            ("Menu del Dia", 10, cat_platos),
            ("Inka Cola", 5, cat_bebidas),
            ("Coca Cola", 5, cat_bebidas),
            ("Agua", 3, cat_bebidas),
        ]

        productos_db = []
        for nombre, precio, cat in productos:
            productos_db.append(
                Producto.objects.create(
                    negocio=negocio,
                    nombre=nombre,
                    precio_base=precio,
                    categoria=cat
                )
            )

        print("🔥 Generando 50,000 órdenes...")

        for i in range(50000):

            orden = Orden.objects.create(
                sede=sede,
                mesa=random.choice(mesas),
                estado="completado",
                estado_pago="pagado"
            )

            total = Decimal('0')

            for _ in range(random.randint(1, 3)):
                prod = random.choice(productos_db)
                cantidad = random.randint(1, 2)

                total += prod.precio_base * cantidad

                DetalleOrden.objects.create(
                    orden=orden,
                    producto=prod,
                    cantidad=cantidad,
                    precio_unitario=prod.precio_base
                )

            orden.total = total
            orden.save()

            Pago.objects.create(
                orden=orden,
                metodo="efectivo",
                monto=total
            )

            if i % 1000 == 0:
                print(f"✔ {i}")

        print("🚀 TODO LISTO")