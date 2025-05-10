from django.db import migrations


class Migration(migrations.Migration):
    """
    This migration merges two different approaches to removing the legacy price field.
    10014_remove_product_price adjusts indexes and foreign keys.
    10015_manual_remove_product_price directly removes the price field.
    10015_remove_product_price removes the index and the price field but depends on 10014.
    
    This merge takes the best of all approaches to ensure a smooth migration.
    """
    dependencies = [
        ('products', '10015_manual_remove_product_price'),
        ('products', '10015_remove_product_price'),
    ]

    operations = [
        # No additional operations needed - dependencies already have the operations
    ] 