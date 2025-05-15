import logging
from django.db import migrations, models
from django.db.migrations.operations.special import RunPython

logger = logging.getLogger(__name__)

def log_image_removal(apps, schema_editor):
    """
    Log information about removed data for audit purposes.
    
    We're not transferring data because the assets system should 
    already have the primary images stored properly.
    """
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    
    # Log product image counts for auditing
    image_count = ProductImage.objects.count()
    products_with_primary = Product.objects.filter(
        primary_image__isnull=False
    ).count()
    
    logger.info(f"Removing {image_count} ProductImage records")
    logger.info(f"Removing primary_image field from {products_with_primary} products")
    
    # No data transfer needed - assets system should already have the data


def reverse_migration(apps, schema_editor):
    """
    Reversing this migration is not supported as it would result in data loss.
    """
    raise migrations.exceptions.IrreversibleError(
        "This migration removes the ProductImage model and legacy image fields. "
        "It cannot be reversed as the original data has been deleted."
    )


class Migration(migrations.Migration):

    dependencies = [
        ('products', '10023_product_attribute_override'),
    ]

    operations = [
        # First run the code to log information
        migrations.RunPython(
            log_image_removal,
            reverse_migration
        ),
        
        # Remove ForeignKey constraints from ProductImage to make deletion cleaner
        migrations.RemoveField(
            model_name='productimage',
            name='organization',
        ),
        migrations.RemoveField(
            model_name='productimage',
            name='product',
        ),
        
        # Remove the primary_image field from Product model (only field that exists)
        migrations.RemoveField(
            model_name='product',
            name='primary_image',
        ),
        
        # Finally, remove the entire ProductImage model
        migrations.DeleteModel(
            name='ProductImage',
        ),
    ] 