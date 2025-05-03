from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

from products.models import Attribute
from products.serializers import AttributeSerializer
from products.permissions import IsStaffOrReadOnly
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization

@extend_schema_view(
    list=extend_schema(summary="List all attributes", 
                      description="Returns attributes for the current organization."),
    retrieve=extend_schema(summary="Get a specific attribute", 
                         description="Returns details of a specific attribute."),
    create=extend_schema(summary="Create a new attribute", 
                       description="Create a new attribute for the current organization. Staff only."),
    update=extend_schema(summary="Update an attribute", 
                       description="Update an existing attribute. Staff only."),
    partial_update=extend_schema(summary="Partially update an attribute", 
                              description="Partially update an existing attribute. Staff only."),
    destroy=extend_schema(summary="Delete an attribute", 
                        description="Delete an attribute. Staff only."),
)
class AttributeViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product attributes.
    """
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    
    def perform_create(self, serializer):
        """Set organization and created_by from request user"""
        serializer.save(
            organization=get_user_organization(self.request.user),
            created_by=self.request.user
        ) 