import sys
from django.db.models.signals import post_save, post_delete, pre_save

# Create placeholder classes for migrations
if 'makemigrations' in sys.argv or 'migrate' in sys.argv:
    class Product:
        pass
    class Activity:
        objects = None
    # No need to connect signals during migrations
else:
    from .models import Product, Activity
    from django.dispatch import receiver
    from .events import record

    @receiver(post_save, sender=Product)
    def product_saved(sender, instance, created, **kwargs):
        """Log when a product is created or updated"""
        if created:
            # Create an Activity record for product creation
            Activity.objects.create(
                organization=instance.organization,
                user=instance.created_by,
                entity='product',
                entity_id=instance.id,
                action='create',
                message=f"Created product '{instance.name}'"
            )
            
            # Record product creation event
            record(
                product=instance,
                user=instance.created_by,
                event_type="created",
                summary=f"Product '{instance.name}' was created",
                payload=None
            )

    # Uncomment for additional signal handlers
    """
    @receiver(pre_save, sender=Product)
    def product_about_to_save(sender, instance, **kwargs):
        # Get the database instance if this is an update
        if instance.pk:
            try:
                old_instance = sender.objects.get(pk=instance.pk)
                # Store data for comparison after save if needed
                instance._old_price = old_instance.price
            except sender.DoesNotExist:
                pass
                
    @receiver(post_delete, sender=Product)
    def product_deleted(sender, instance, **kwargs):
        # Log when a product is deleted
        Activity.objects.create(
            company_id=1,  # Default company ID
            organization=instance.organization,
            user=None,  # We don't know who deleted it through this signal
            entity='product',
            entity_id=instance.id,
            action='delete',
            message=f"Deleted product '{instance.name}'"
        )
    """ 