# Generated manually to resolve migration issues

from django.db import migrations


class Migration(migrations.Migration):
    """
    This is a fake migration to satisfy the dependency chain for 10010_alter_product_price.
    The original 10009_make_price_field_optional.py was missing.
    """
    dependencies = [
        ('products', '10007_backfill_product_prices'),
    ]

    operations = [
        # No operations - this is a placeholder migration
    ] 