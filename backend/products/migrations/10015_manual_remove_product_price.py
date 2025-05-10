from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '10013_migrate_price_type_and_currency'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='price',
        ),
    ] 