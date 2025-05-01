from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from django.db.models import Prefetch, Q

from products.models import AttributeGroup, AttributeValue, Product
from products.serializers import AttributeGroupSerializer
from products.permissions import IsStaffOrReadOnly
from kernlogic.org_queryset import OrganizationQuerySetMixin

@extend_schema_view(
    list=extend_schema(summary="List all attribute groups", 
                      description="Returns attribute groups for the current organization.",
                      tags=["Attributes - Groups"]),
    retrieve=extend_schema(summary="Get a specific attribute group", 
                         description="Returns details of a specific attribute group.",
                         tags=["Attributes - Groups"]),
    create=extend_schema(summary="Create a new attribute group", 
                       description="Create a new attribute group for the current organization. Staff only.",
                       tags=["Attributes - Groups"]),
    update=extend_schema(summary="Update an attribute group", 
                       description="Update an existing attribute group. Staff only.",
                       tags=["Attributes - Groups"]),
    partial_update=extend_schema(summary="Partially update an attribute group", 
                              description="Partially update an existing attribute group. Staff only.",
                              tags=["Attributes - Groups"]),
    destroy=extend_schema(summary="Delete an attribute group", 
                        description="Delete an attribute group. Staff only.",
                        tags=["Attributes - Groups"]),
)
class AttributeGroupViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing attribute groups.
    """
    queryset = AttributeGroup.objects.all()
    serializer_class = AttributeGroupSerializer
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    
    def perform_create(self, serializer):
        """Set organization and created_by from request user"""
        serializer.save(
            organization=self.request.user.profile.organization,
            created_by=self.request.user
        )

@extend_schema_view(
    list=extend_schema(summary="Get attribute groups with values for a product", 
                      description="Returns attribute groups with their values for a specific product.",
                      tags=["Attributes - Groups"]),
)
class ProductAttributeGroupViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for retrieving product attribute groups with values.
    This is a read-only endpoint.
    """
    serializer_class = AttributeGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        product_id = self.kwargs.get('product_pk')
        locale = self.request.query_params.get('locale')
        channel = self.request.query_params.get('channel')
        
        # Build filter for attribute values
        value_filter = Q(product_id=product_id)
        if locale:
            value_filter &= Q(locale=locale)
        if channel:
            value_filter &= Q(channel=channel)
            
        # Get organization from request
        org = self.request.user.profile.organization
        
        # Get all groups for the organization with their attributes and values for this product
        return AttributeGroup.objects.filter(
            organization=org
        ).prefetch_related(
            'attributegroupitem_set__attribute',
            Prefetch(
                'attributegroupitem_set__attribute__attributevalue_set',
                queryset=AttributeValue.objects.filter(value_filter),
                to_attr='product_values'
            )
        )
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # Enhance the output with attribute values
        product_id = self.kwargs.get('product_pk')
        for group in data:
            for item in group.get('items', []):
                # Find the corresponding attribute to get its values
                for attr_group_item in queryset:
                    for attr_item in attr_group_item.attributegroupitem_set.all():
                        if attr_item.id == item['id']:
                            # Found the attribute, now get its values for this product
                            values = getattr(attr_item.attribute, 'product_values', [])
                            if values:
                                item['value'] = values[0].value
                                item['locale'] = values[0].locale
                                item['channel'] = values[0].channel
        
        return Response(data) 