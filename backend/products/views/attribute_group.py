from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db import models
from rest_framework import status
from django.db import transaction
from rest_framework.views import APIView

from django.db.models import Prefetch, Q

from products.models import AttributeGroup, AttributeValue, Product, AttributeGroupItem, Attribute, Locale
from products.serializers import AttributeGroupSerializer, AttributeGroupItemSerializer
from products.permissions import IsStaffOrReadOnly
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from ..events import record

@extend_schema_view(
    list=extend_schema(summary="List attribute groups", 
                      description="Returns attribute groups for the current organization."),
    retrieve=extend_schema(summary="Get a specific attribute group", 
                         description="Returns details of a specific attribute group."),
    create=extend_schema(summary="Create a new attribute group", 
                       description="Create a new attribute group for the current organization. Staff only."),
    update=extend_schema(summary="Update an attribute group", 
                       description="Update an existing attribute group. Staff only."),
    partial_update=extend_schema(summary="Partially update an attribute group", 
                               description="Partially update an existing attribute group. Staff only."),
    destroy=extend_schema(summary="Delete an attribute group", 
                        description="Delete an attribute group. Staff only."),
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
        group = serializer.save(
            organization=get_user_organization(self.request.user),
            created_by=self.request.user
        )
        
        # Automatically add available attributes to the group
        try:
            # Get attributes for the same organization
            attributes = Attribute.objects.filter(
                organization=get_user_organization(self.request.user)
            ).order_by('id')[:1]  # Add at least one attribute to start with
            
            # Add each attribute to the group
            for index, attr in enumerate(attributes):
                AttributeGroupItem.objects.create(
                    group=group,
                    attribute=attr,
                    order=index
                )
                print(f"Added attribute {attr.code} to new group {group.name}")
        except Exception as e:
            # Log the error but don't fail the group creation
            print(f"Error adding default attributes to group: {e}")
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder all attribute groups
        Request body should contain a list of group IDs in the desired order.
        Example: {"group_ids": [5, 1, 3, 2, 4]}
        """
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"error": "User is not associated with an organization"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        group_ids = request.data.get('group_ids', [])
        if not isinstance(group_ids, list):
            return Response(
                {"error": "Expected 'group_ids' to be a list of integers"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate all IDs belong to the user's organization
        groups = AttributeGroup.objects.filter(
            id__in=group_ids,
            organization=organization
        )
        
        if len(groups) != len(group_ids):
            return Response(
                {"error": "Some group IDs were not found or do not belong to your organization"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update order fields
        with transaction.atomic():
            for index, group_id in enumerate(group_ids, 1):
                AttributeGroup.objects.filter(
                    id=group_id,
                    organization=organization
                ).update(order=index)
                
        return Response({"status": "Groups reordered successfully"})
        
    @action(detail=True, methods=['post'])
    def reorder_items(self, request, pk=None):
        """
        Reorder items within an attribute group
        Request body should contain a list of item IDs in the desired order.
        Example: {"item_ids": [5, 1, 3, 2, 4]}
        """
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"error": "User is not associated with an organization"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            group = AttributeGroup.objects.get(pk=pk, organization=organization)
        except AttributeGroup.DoesNotExist:
            return Response(
                {"error": "Attribute group not found"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        item_ids = request.data.get('item_ids', [])
        if not isinstance(item_ids, list):
            return Response(
                {"error": "Expected 'item_ids' to be a list of integers"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate all IDs belong to this group
        items = AttributeGroupItem.objects.filter(
            id__in=item_ids,
            group=group
        )
        
        if len(items) != len(item_ids):
            return Response(
                {"error": "Some item IDs were not found or do not belong to this group"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update order fields
        with transaction.atomic():
            for index, item_id in enumerate(item_ids, 1):
                AttributeGroupItem.objects.filter(
                    id=item_id,
                    group=group
                ).update(order=index)
                
        return Response({"status": "Group items reordered successfully"})
        
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
        
        # Get the attribute name for the log summary
        attribute = Attribute.objects.get(id=attr_id)
        
        # Log this change in the application logs for now - we can't use product events
        # since this is a group-level change without a specific product
        print(f"User {request.user.username} added attribute '{attribute.label}' to group '{group.name}'")
        
        return Response(
            {'id': item.id, 'attribute': attr_id, 'order': item.order}, 
            status=status.HTTP_201_CREATED
        )
        
    @action(detail=True, methods=['delete'], url_path='items/(?P<item_id>\d+)')
    def remove_item(self, request, pk=None, item_id=None):
        """
        Delete ONE item from the group, leaving the rest intact and re-ordering.
        """
        group = self.get_object()
        try:
            item = AttributeGroupItem.objects.get(id=item_id, group=group)
        except AttributeGroupItem.DoesNotExist:
            return Response(
                {"detail": "Item not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        # Delete the item
        item.delete()
        # Compact orders (0,1,2,...)
        remaining_items = AttributeGroupItem.objects.filter(group=group).order_by('order')
        for pos, gi in enumerate(remaining_items):
            if gi.order != pos:
                try:
                    gi.order = pos
                    gi.save(update_fields=['order'])
                except Exception as e:
                    # Log the error, but don't crash
                    print(f'Error updating order for AttributeGroupItem {gi.id}: {e}')
        return Response(status=status.HTTP_204_NO_CONTENT)

@extend_schema_view(
    list=extend_schema(summary="Get attribute groups with values for a product", 
                      description="Returns attribute groups with their values for a specific product.",
                      tags=["Attributes - Groups"]),
)
class ProductAttributeGroupViewSet(OrganizationQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for retrieving product attribute groups with values.
    This is a read-only endpoint that only returns attribute groups 
    that are inherited from the product's family or modified via overrides.
    
    Products can ONLY have attribute groups through family inheritance and overrides,
    not through direct assignment.
    """
    serializer_class = AttributeGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Build a queryset of attribute groups for this product based on its family.
        
        This only returns groups that are:
        1. Associated with the product's family (via FamilyAttributeGroup)
        2. Modified by any ProductFamilyOverride entries for the product
        """
        product_id = self.kwargs.get('product_pk')
        locale_code = self.request.query_params.get('locale')
        channel_code = self.request.query_params.get('channel')
        org = get_user_organization(self.request.user)

        # Convert locale code to PK if provided
        locale_pk = None
        if locale_code:
            locale_obj = Locale.objects.filter(organization=org, code=locale_code).first()
            if locale_obj:
                locale_pk = locale_obj.pk

        # Channel is a string, so use as-is
        channel = channel_code if channel_code else None

        if not product_id:
            return AttributeGroup.objects.none()
        try:
            product = Product.objects.get(id=product_id, organization=org)
            if not product.family:
                return AttributeGroup.objects.none()
            family_group_ids = product.family.attribute_groups.values_list('attribute_group_id', flat=True)
            removed_group_ids = product.family_overrides.filter(removed=True).values_list('attribute_group_id', flat=True)
            added_group_ids = product.family_overrides.filter(removed=False).values_list('attribute_group_id', flat=True)
            effective_group_ids = (set(family_group_ids) - set(removed_group_ids)) | set(added_group_ids)
            if not effective_group_ids:
                return AttributeGroup.objects.none()
            # Only use PKs for locale in the filter
            value_filter = {
                'product_id': product_id,
                'organization': org
            }
            if locale_pk is not None:
                value_filter['locale'] = locale_pk
            if channel:
                value_filter['channel'] = channel
            return AttributeGroup.objects.filter(
                id__in=effective_group_ids,
                organization=org
            ).prefetch_related(
                'attributegroupitem_set__attribute',
                Prefetch(
                    'attributegroupitem_set__attribute__attributevalue_set',
                    queryset=AttributeValue.objects.filter(**value_filter).select_related('attribute'),
                    to_attr='product_values'
                )
            )
        except Product.DoesNotExist:
            return AttributeGroup.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        product_id = self.kwargs.get('product_pk')
        locale_code = request.query_params.get('locale')
        channel = request.query_params.get('channel')
        org = get_user_organization(request.user)
        # Convert locale code to PK for all comparisons
        locale_pk = None
        if locale_code:
            locale_obj = Locale.objects.filter(organization=org, code=locale_code).first()
            if locale_obj:
                locale_pk = locale_obj.pk
        all_attribute_values = AttributeValue.objects.filter(
            product_id=product_id,
            organization=org
        )
        attribute_value_map = {}
        for value in all_attribute_values:
            key = f"{value.attribute_id}::{value.locale or ''}::{value.channel or ''}"
            if locale_pk and value.locale and value.locale != locale_pk:
                continue
            if channel and value.channel and value.channel != channel:
                continue
            if key in attribute_value_map:
                continue
            else:
                if locale_pk or channel:
                    specific_key = f"{value.attribute_id}"
                    attribute_value_map[key] = value
                    if specific_key in attribute_value_map:
                        existing = attribute_value_map[specific_key]
                        replace_existing = False
                        if locale_pk and existing.locale != locale_pk and (value.locale == locale_pk or value.locale is None):
                            replace_existing = True
                        if channel and existing.channel != channel and (value.channel == channel or value.channel is None):
                            replace_existing = True
                        if replace_existing:
                            attribute_value_map[specific_key] = value
                    else:
                        attribute_value_map[specific_key] = value
                else:
                    attribute_value_map[key] = value
        for group in data:
            for item in group.get('items', []):
                attribute_id = item['attribute']
                attr_key = f"{attribute_id}::{locale_pk or ''}::{channel or ''}"
                attr_key_any = f"{attribute_id}::{''}{''}"
                simple_attr_key = str(attribute_id)
                if attr_key in attribute_value_map:
                    value_obj = attribute_value_map[attr_key]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale_id
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                elif attr_key_any in attribute_value_map:
                    value_obj = attribute_value_map[attr_key_any]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale_id
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                elif simple_attr_key in attribute_value_map:
                    value_obj = attribute_value_map[simple_attr_key]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale_id
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                else:
                    potential_keys = [k for k in attribute_value_map.keys() if k.startswith(f"{attribute_id}::")]
                    if potential_keys:
                        value_obj = attribute_value_map[potential_keys[0]]
                        item['value'] = value_obj.value
                        item['locale'] = value_obj.locale_id
                        item['channel'] = value_obj.channel
                        item['value_id'] = value_obj.id
                    else:
                        for attr_group_item in queryset:
                            for attr_item in attr_group_item.attributegroupitem_set.all():
                                if attr_item.id == item['id']:
                                    values = getattr(attr_item.attribute, 'product_values', [])
                                    if values:
                                        item['value'] = values[0].value
                                        item['locale'] = values[0].locale_id
                                        item['channel'] = values[0].channel
                                        item['value_id'] = values[0].id
        return Response(data) 