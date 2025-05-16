from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import Locale
from products.serializers import LocaleSerializer
from teams.models import Membership

class LocaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organization locales
    
    Provides CRUD operations for Locale objects associated with the current
    user's organization.
    """
    serializer_class = LocaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'label']
    ordering_fields = ['code', 'label', 'created_at']
    ordering = ['code']
    
    def get_queryset(self):
        """
        Return locales for the current user's organization only.
        """
        user = self.request.user
        
        # Get organization from membership
        try:
            membership = Membership.objects.filter(user=user, status='active').first()
            if membership and membership.organization:
                return Locale.objects.filter(organization=membership.organization)
        except Exception as e:
            print(f"Error getting user organization from membership: {e}")
        
        return Locale.objects.none()
    
    def perform_create(self, serializer):
        """
        Set the organization when creating a new locale.
        """
        user = self.request.user
        
        # Get organization from membership
        try:
            membership = Membership.objects.filter(user=user, status='active').first()
            if membership and membership.organization:
                serializer.save(organization=membership.organization)
                return
        except Exception as e:
            print(f"Error getting user organization from membership: {e}")
        
        return Response(
            {"error": "User has no organization assigned"},
            status=status.HTTP_400_BAD_REQUEST
        ) 