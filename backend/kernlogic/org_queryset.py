from django.db.models import QuerySet
from .utils import get_user_organization
import logging

logger = logging.getLogger(__name__)

class OrganizationQuerySetMixin:
    """
    A mixin that filters querysets by the user's organization.
    
    This mixin should be applied to viewsets that need to filter
    models that have an organization foreign key.
    """
    
    def get_queryset(self):
        """
        Filter the queryset to only include objects belonging to the user's organization.
        
        Allows superusers to see all objects. Returns an empty queryset for anonymous users
        unless configured to allow anonymous access.
        """
        # Get queryset from the parent class
        try:
            qs = super().get_queryset()
        except AssertionError:
            # Fallback if queryset isn't defined
            if hasattr(self, 'model'):
                qs = self.model.objects.all()
            elif hasattr(self, 'serializer_class') and hasattr(self.serializer_class.Meta, 'model'):
                qs = self.serializer_class.Meta.model.objects.all()
            else:
                # Empty queryset as last resort
                return QuerySet().none()
        
        # Handle anonymous users
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        
        # Superusers can see everything
        if user.is_superuser or user.is_staff:
            return qs
        
        # Get the organization from the user's active membership
        organization = get_user_organization(user)
        if not organization:
            # If no organization can be determined, return an empty queryset
            return qs.none()
            
        # Regular users can only see objects in their organization
        try:
            model = qs.model
            
            # Check if the model has an organization field
            if hasattr(model, 'organization') or any(field.name == 'organization' for field in model._meta.fields):
                return qs.filter(organization=organization)
            
            # If no organization field, try user field for personal objects
            if hasattr(model, 'user') or any(field.name == 'user' for field in model._meta.fields):
                return qs.filter(user=user)
                
            # If created_by field exists, filter by that
            if hasattr(model, 'created_by') or any(field.name == 'created_by' for field in model._meta.fields):
                return qs.filter(created_by=user)
                
            # If all else fails, return an empty queryset for safety
            return qs.none()
            
        except Exception as e:
            # Log the error for debugging
            logger.error(f"Error in OrganizationQuerySetMixin: {e}", exc_info=True)
            
            # If there's any error, return an empty queryset
            return qs.none() 