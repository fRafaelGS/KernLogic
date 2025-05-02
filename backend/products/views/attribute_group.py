from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db import models
from rest_framework import status

from django.db.models import Prefetch, Q

from products.models import AttributeGroup, AttributeValue, Product, AttributeGroupItem
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
        
    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        """
        Add a single attribute to a group without affecting other attributes.
        This is a simpler alternative to the full PATCH operation.
        """
        group = self.get_object()
        attr_id = request.data.get('attribute')
        
        if not attr_id:
            return Response(
                {"detail": "attribute field is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Ensure attribute ID is an integer
        try:
            attr_id = int(attr_id)
        except (ValueError, TypeError):
            return Response(
                {"detail": "attribute must be an integer ID"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if attribute is already in the group
        existing_item = group.attributegroupitem_set.filter(attribute_id=attr_id).first()
        if existing_item:
            # Return success with the existing item details
            return Response(
                {
                    'id': existing_item.id, 
                    'attribute': existing_item.attribute_id, 
                    'order': existing_item.order
                }, 
                status=status.HTTP_200_OK
            )
        
        # Find max order and create new item
        max_order = group.attributegroupitem_set.aggregate(models.Max('order'))['order__max'] or 0
        item = group.attributegroupitem_set.create(
            attribute_id=attr_id, 
            order=max_order+1
        )
        
        return Response(
            {'id': item.id, 'attribute': attr_id, 'order': item.order}, 
            status=status.HTTP_201_CREATED
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
        
        # Get all groups for the organization with their attributes
        return AttributeGroup.objects.filter(
            organization=org
        ).prefetch_related(
            'attributegroupitem_set__attribute',
            # Improved prefetch that directly targets the values we need
            Prefetch(
                'attributegroupitem_set__attribute__attributevalue_set',
                queryset=AttributeValue.objects.filter(
                    product_id=product_id,
                    organization=org
                ).select_related('attribute'),
                to_attr='product_values'
            )
        )
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        
        # Enhance the output with attribute values
        product_id = self.kwargs.get('product_pk')
        locale = request.query_params.get('locale')
        channel = request.query_params.get('channel')
        
        print(f"Processing attribute groups for product {product_id}")
        
        # First, fetch ALL attribute values for this product directly
        # This ensures we don't miss any values that may not be correctly prefetched
        all_attribute_values = AttributeValue.objects.filter(
            product_id=product_id,
            organization=request.user.profile.organization
        )
        
        # Create a mapping of attribute ID to value for quick lookup
        attribute_value_map = {}
        for value in all_attribute_values:
            key = f"{value.attribute_id}"
            if locale and value.locale != locale:
                continue
            if channel and value.channel != channel:
                continue
            
            # Only store the most relevant value
            # If we already have a value with matching locale/channel, use that
            if key in attribute_value_map:
                existing = attribute_value_map[key]
                # If current matches the locale/channel better, replace
                if (locale and value.locale == locale and existing.locale != locale) or \
                   (channel and value.channel == channel and existing.channel != channel):
                    attribute_value_map[key] = value
            else:
                attribute_value_map[key] = value
        
        print(f"Found {len(attribute_value_map)} direct attribute values")
        
        # Now process each group and item
        for group in data:
            print(f"Group: {group['name']} (id: {group['id']})")
            for item in group.get('items', []):
                attribute_id = item['attribute']
                print(f"  Item: id={item['id']}, attribute={attribute_id}")
                
                # First check our direct map
                if str(attribute_id) in attribute_value_map:
                    value_obj = attribute_value_map[str(attribute_id)]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                    print(f"  → Setting value from direct map: {value_obj.value} (ID: {value_obj.id})")
                else:
                    # Fall back to the original logic
                    for attr_group_item in queryset:
                        for attr_item in attr_group_item.attributegroupitem_set.all():
                            if attr_item.id == item['id']:
                                # Found the attribute, now get its values for this product
                                values = getattr(attr_item.attribute, 'product_values', [])
                                # Debug log for attribute values
                                print(f"Item {item['id']} (attr: {attr_item.attribute.id}): Found {len(values)} values from prefetch")
                                if values:
                                    item['value'] = values[0].value
                                    item['locale'] = values[0].locale
                                    item['channel'] = values[0].channel
                                    # Add the actual attributevalue id
                                    item['value_id'] = values[0].id
                                    print(f"  → Setting value from prefetch: {values[0].value} (ID: {values[0].id})")
        
        # Final review of populated data
        for group in data:
            for item in group.get('items', []):
                if 'value' in item:
                    print(f"Final item {item['id']} has value: {item['value']} (attribute {item['attribute']})")
                else:
                    print(f"Final item {item['id']} has NO value (attribute {item['attribute']})")
        
        # Add a debug query to directly check if any attribute values exist for this product
        print(f"\n\nDIRECT DB CHECK: Checking attribute values for product {product_id}")
        direct_values = AttributeValue.objects.filter(product_id=product_id)
        if direct_values.exists():
            for val in direct_values:
                print(f"Found direct value: attr_id={val.attribute_id}, value={val.value}, locale={val.locale}, channel={val.channel}")
        else:
            print("NO direct attribute values found for this product")
            
        return Response(data) 