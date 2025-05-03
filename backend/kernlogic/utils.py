import logging
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned

logger = logging.getLogger(__name__)

def get_user_organization(user, status="active"):
    """
    Get the organization for a user based on their active membership.
    
    This is the canonical way to determine a user's organization and should be used
    instead of user.profile.organization which is being deprecated.
    
    Args:
        user: The user object
        status: The membership status to filter by (default: "active")
        
    Returns:
        An Organization object or None if no active membership exists
    """
    if not user or not user.is_authenticated:
        return None
        
    try:
        # Import here to avoid circular imports
        from teams.models import Membership
        
        # Get the user's active membership
        membership = Membership.objects.filter(
            user=user,
            status=status
        ).select_related('organization').first()
        
        if membership:
            return membership.organization
            
    except (ObjectDoesNotExist, MultipleObjectsReturned) as e:
        logger.warning(f"Error getting organization for user {user.id}: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error getting organization for user {user.id}: {str(e)}")
        
    return None


def get_user_org_id(user, status="active"):
    """
    Get the organization ID for a user based on their active membership.
    
    Args:
        user: The user object
        status: The membership status to filter by (default: "active")
        
    Returns:
        An organization ID or None if no active membership exists
    """
    org = get_user_organization(user, status)
    return org.id if org else None 