from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import SalesChannel
from products.serializers import SalesChannelSerializer
from teams.models import Membership

class SalesChannelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organization sales channels
    
    Provides CRUD operations for SalesChannel objects associated with the current
    user's organization.
    """
    serializer_class = SalesChannelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """
        Return channels for the current user's organization only.
        """
        user = self.request.user
        
        # Get organization from membership
        try:
            membership = Membership.objects.filter(user=user, status='active').first()
            if membership and membership.organization:
                return SalesChannel.objects.filter(organization=membership.organization)
        except Exception as e:
            print(f"Error getting user organization from membership: {e}")
        
        return SalesChannel.objects.none()
    
    def perform_create(self, serializer):
        """
        Set the organization when creating a new channel.
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