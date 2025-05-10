# Generated manually to resolve migration issues

from django.db import migrations


class Migration(migrations.Migration):
    """
    This is a fake migration to satisfy the dependency chain for 10003_remove_company_id_field.
    The original 10002_merge_20250502_1606.py was missing.
    """
    dependencies = [
        ('products', '10001_set_null_orders_to_zero'),
    ]

    operations = [
        # No operations - this is a placeholder migration
    ] 