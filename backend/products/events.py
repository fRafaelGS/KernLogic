from django.contrib.auth import get_user_model
from .models import Product, ProductEvent

User = get_user_model()

def record(product: Product, user: User, event_type: str, summary: str, payload=None):
    """
    Record a product event in the audit log.
    
    Args:
        product (Product): The product instance
        user (User): The user who performed the action
        event_type (str): Type of event (e.g., "created", "updated", "price_changed")
        summary (str): Human-readable summary of the event
        payload (dict, optional): Additional data or diff for power users
    
    Returns:
        ProductEvent: The created event instance
    """
    try:
        # Get organization_id directly from product
        organization_id = product.organization_id
        
        return ProductEvent.objects.create(
            product=product,
            created_by=user,
            event_type=event_type,
            summary=summary[:255],
            payload=payload or {},
            organization_id=organization_id,  # Set organization_id from product
        )
    except Exception as e:
        print(f"Error recording event: {str(e)}")
        # Create record without organization if there's an error
        return ProductEvent.objects.create(
            product=product,
            created_by=user,
            event_type=event_type,
            summary=summary[:255],
            payload=payload or {},
        ) 