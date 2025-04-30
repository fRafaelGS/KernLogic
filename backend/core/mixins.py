from django.db.models import Q

class OrganizationQuerySetMixin:
    """
    A mixin that filters querysets by the user's organization
    and also filters out archived items by default.
    """
    
    def get_queryset(self):
        """
        Filter queryset to show only records from the user's organization,
        and exclude archived items by default.
        """
        queryset = super().get_queryset()
        
        # Apply organization filtering only if model has organization field
        if hasattr(self.get_serializer().Meta.model, 'organization'):
            user = self.request.user
            
            try:
                organization = user.profile.organization
                queryset = queryset.filter(organization=organization)
            except Exception as e:
                # If the user doesn't have an organization, return an empty queryset
                # This is safer than returning all records
                print(f"Error getting user organization: {e}")
                return queryset.none()
        
        # Filter out archived items by default
        if hasattr(self.get_serializer().Meta.model, 'is_archived'):
            show_archived = self.request.query_params.get('show_archived', '').lower() == 'true'
            if not show_archived:
                queryset = queryset.filter(is_archived=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Automatically set the organization when creating a new instance.
        """
        # Get the user's organization
        user = self.request.user
        try:
            organization = user.profile.organization
            serializer.save(organization=organization)
        except Exception as e:
            # If there's an issue with the organization, just save without it
            print(f"Error setting organization: {e}")
            serializer.save() 