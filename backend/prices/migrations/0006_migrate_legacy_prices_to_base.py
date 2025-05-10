# -*- coding: utf-8 -*-
from django.db import migrations, models
from django.utils import timezone
import logging
from django.db.models import F

logger = logging.getLogger(__name__)

def forward(apps, schema_editor):
    """
    Create base price entries for all products without one, using their legacy price.
    """
    Product = apps.get_model('products', 'Product')
    ProductPrice = apps.get_model('prices', 'ProductPrice')
    PriceType = apps.get_model('prices', 'PriceType')
    Organization = apps.get_model('organizations', 'Organization')
    
    # Get base price type
    try:
        base_type = PriceType.objects.get(code='base')
    except PriceType.DoesNotExist:
        logger.error("Price type 'base' not found. Migration cannot proceed.")
        return
    
    # Find products that don't have a base price yet
    products_migrated = 0
    products_skipped = 0
    new_prices = []
    
    for product in Product.objects.all():
        # Skip products with no legacy price or zero price
        if product.price is None or product.price == 0:
            products_skipped += 1
            continue
            
        # Check if a base price already exists for this product
        if ProductPrice.objects.filter(product=product, price_type_id=base_type.id).exists():
            products_skipped += 1
            continue
            
        # Get the organization's default currency or use USD as fallback
        try:
            org_currency = product.organization.default_currency
        except (Organization.DoesNotExist, AttributeError):
            org_currency = 'USD'
            
        # Create new base price entry
        new_prices.append(ProductPrice(
            product=product,
            price_type=base_type,
            amount=product.price,
            currency=org_currency,
            valid_from=timezone.now().date(),
            created_at=timezone.now(),
            updated_at=timezone.now()
        ))
        products_migrated += 1
        
    # Bulk create the new prices
    if new_prices:
        ProductPrice.objects.bulk_create(new_prices)
        
    logger.info(f"Price migration complete. Created {products_migrated} base prices, skipped {products_skipped} products.")

def backward(apps, schema_editor):
    """
    Remove base prices that were created by this migration.
    Note: This may not be fully reversible as we can't always tell which were created by this migration.
    """
    ProductPrice = apps.get_model('prices', 'ProductPrice')
    PriceType = apps.get_model('prices', 'PriceType')
    
    # Get base price type
    try:
        base_type = PriceType.objects.get(code='base')
    except PriceType.DoesNotExist:
        logger.error("Price type 'base' not found. Backward migration cannot proceed.")
        return
        
    # Since we can't reliably identify exactly which prices were created by this migration,
    # we'll use a heuristic: delete base prices that match the legacy product.price exactly
    matched_prices = ProductPrice.objects.filter(
        price_type_id=base_type.id,
        amount=F('product__price')  # This matches prices where amount equals the product's legacy price
    )
    
    count = matched_prices.count()
    matched_prices.delete()
    
    logger.info(f"Backward migration complete. Removed {count} base prices that matched legacy prices.")

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),  # Replace with your actual Product migration dependency
        ('prices', '0005_update_product_price_model'),  # Fix the dependency to point to the actual previous migration
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ] 