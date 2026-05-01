from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('negocios', '0047_alter_sede_bot_cumple_activo_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='orden',
            name='subtotal',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='orden',
            name='descuento_total',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='orden',
            name='recargo_total',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
    ]
