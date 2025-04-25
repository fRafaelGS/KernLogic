from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Product, Activity

@receiver(post_save, sender=Product)
def log_product_save(sender, instance, created, **kwargs):
    """
    Log when a product is created or updated
    """
    # Determine the action type
    action = 'create' if created else 'update'
    
    # Create an appropriate message
    if created:
        message = f"Created product: {instance.name} (SKU: {instance.sku})"
    else:
        message = f"Updated product: {instance.name} (SKU: {instance.sku})"
    
    # Get user and company info
    user = instance.created_by
    # In a real app, you'd get the company ID from the user
    company_id = user.id if user else 1
    
    # Create activity log
    Activity.objects.create(
        company_id=company_id,
        user=user,
        entity='product',
        entity_id=instance.id,
        action=action,
        message=message
    )

@receiver(post_delete, sender=Product)
def log_product_delete(sender, instance, **kwargs):
    """
    Log when a product is deleted
    """
    # Get user and company info
    user = instance.created_by
    # In a real app, you'd get the company ID from the user
    company_id = user.id if user else 1
    
    # Create activity log
    Activity.objects.create(
        company_id=company_id,
        user=user,
        entity='product',
        entity_id=instance.id,
        action='delete',
        message=f"Deleted product: {instance.name} (SKU: {instance.sku})"
    ) 