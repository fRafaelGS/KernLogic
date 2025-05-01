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
                from django.db.models import QuerySet
                return QuerySet().none()
        
        # Handle anonymous users
        if not self.request.user.is_authenticated:
            return qs.none()
        
        # Superusers can see everything
        if self.request.user.is_superuser:
            return qs
            
        # Regular users can only see objects in their organization    
        try:
            organization = self.request.user.profile.organization
            if organization:
                return qs.filter(organization=organization)
            return qs.none()
        except Exception as e:
            # If there's any error getting the organization, return an empty queryset
            print(f"Error filtering by organization: {e}")
            return qs.none() 