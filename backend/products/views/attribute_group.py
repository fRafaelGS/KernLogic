from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.db import models
from rest_framework import status
from django.db import transaction

from django.db.models import Prefetch, Q

from products.models import AttributeGroup, AttributeValue, Product, AttributeGroupItem, Attribute
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
    This is a read-only endpoint.
    """
    serializer_class = AttributeGroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Build a filtered queryset of attribute groups that have *at least one* value
        for this product/localisation combination.

        Steps:
        1.  Compute a Q() object (`value_filter`) matching the product, locale and
            channel requested by the client.  This will be re-used both for the
            annotation and for prefetching the concrete `AttributeValue` rows.
        2.  Annotate every `AttributeGroup` with `num_values`, the count of
            `AttributeValue` rows reachable through the M2M relation
            `attributegroupitem → attribute → attributevalue` that match the
            filter.
        3.  Keep only the groups where `num_values > 0` – these are the groups
            that have relevant data for the current product.
        4.  Prefetch the related items/attributes/values so the serializer can
            render them without additional queries.
        """

        product_id = self.kwargs.get('product_pk')
        locale     = self.request.query_params.get('locale')
        channel    = self.request.query_params.get('channel')

        # Base filter that must always match – the product and organisation.
        value_filter = Q(
            attributegroupitem__attribute__attributevalue__product_id=product_id,
            attributegroupitem__attribute__attributevalue__organization=get_user_organization(self.request.user)
        )

        # Optional locale / channel specificity.  Only add these conditions
        # when the client explicitly requests them – otherwise we allow *any*
        # locale/channel so that existing values are counted.
        if locale not in [None, '']:
            value_filter &= Q(attributegroupitem__attribute__attributevalue__locale=locale)

        if channel not in [None, '']:
            value_filter &= Q(attributegroupitem__attribute__attributevalue__channel=channel)

        org = get_user_organization(self.request.user)

        queryset = AttributeGroup.objects.filter(
            organization=org
        ).annotate(
            # Count AttributeValue rows that match our filter.
            num_values=models.Count(
                'attributegroupitem__attribute__attributevalue',
                filter=value_filter,
            )
        ).filter(
            num_values__gt=0  # keep only groups that have values
        ).prefetch_related(
            'attributegroupitem_set__attribute',
            # Prefetch only the relevant values so the serializer can access
            # them without extra queries.
            Prefetch(
                'attributegroupitem_set__attribute__attributevalue_set',
                queryset=AttributeValue.objects.filter(
                    product_id=product_id,
                    organization=org,
                    **({'locale': locale} if locale not in [None, ''] else {}),
                    **({'channel': channel} if channel not in [None, ''] else {}),
                ).select_related('attribute'),
                to_attr='product_values'
            )
        )

        return queryset
    
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
            organization=get_user_organization(request.user)
        )
        
        # Create a mapping of attribute ID to value for quick lookup
        attribute_value_map = {}
        for value in all_attribute_values:
            # Create a composite key that includes attribute ID, locale, and channel
            # This ensures we respect the specific locale/channel selection
            key = f"{value.attribute_id}::{value.locale or ''}::{value.channel or ''}"
            
            # If specific locale/channel requested, only include exact matches or null values
            # (null meaning "applies to all")
            if locale and value.locale and value.locale != locale:
                continue
            if channel and value.channel and value.channel != channel:
                continue
            
            # Only store the value if it's the most specific match:
            # 1. Values with exact locale/channel match are preferred
            # 2. Values with partial matches (one matches, one null) are next
            # 3. Values with both locale and channel as null are last (they apply to all)
            if key in attribute_value_map:
                # We already have a value for this attribute+locale+channel, skip
                continue
            else:
                # Create a more specific key that we'll use for duplicate detection
                # when specific locale/channel is requested
                if locale or channel:
                    specific_key = f"{value.attribute_id}"
                    attribute_value_map[key] = value
                    
                    # If we have both a specific locale/channel and null locale/channel,
                    # prefer the specific one (overwrite the general one)
                    if specific_key in attribute_value_map:
                        existing = attribute_value_map[specific_key]
                        replace_existing = False
                        
                        # If locale is specified, prefer matching locale over null
                        if locale and existing.locale != locale and (value.locale == locale or value.locale is None):
                            replace_existing = True
                            
                        # If channel is specified, prefer matching channel over null
                        if channel and existing.channel != channel and (value.channel == channel or value.channel is None):
                            replace_existing = True
                            
                        if replace_existing:
                            attribute_value_map[specific_key] = value
                    else:
                        attribute_value_map[specific_key] = value
                else:
                    # No specific locale/channel requested, just use the attribute ID as key
                    attribute_value_map[key] = value
        
        print(f"Found {len(attribute_value_map)} direct attribute values after filtering")
        for k, v in attribute_value_map.items():
            print(f"  Map entry: {k} -> value={v.value}, locale={v.locale}, channel={v.channel}")
        
        # Now process each group and item
        for group in data:
            print(f"Group: {group['name']} (id: {group['id']})")
            for item in group.get('items', []):
                attribute_id = item['attribute']
                
                # Generate keys for this attribute with the current locale/channel context
                attr_key = f"{attribute_id}::{locale or ''}::{channel or ''}"
                attr_key_any = f"{attribute_id}:::::"  # Key for values that apply to all locales/channels
                
                print(f"  Item: id={item['id']}, attribute={attribute_id}, looking for keys {attr_key} or {attr_key_any}")
                
                # First try to find an exact match for the locale/channel
                if attr_key in attribute_value_map:
                    value_obj = attribute_value_map[attr_key]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                    print(f"  → Setting value from EXACT match: {value_obj.value} (ID: {value_obj.id})")
                # Then try to find a value that applies to all locales/channels
                elif attr_key_any in attribute_value_map:
                    value_obj = attribute_value_map[attr_key_any]
                    item['value'] = value_obj.value
                    item['locale'] = value_obj.locale
                    item['channel'] = value_obj.channel
                    item['value_id'] = value_obj.id
                    print(f"  → Setting value from ALL match: {value_obj.value} (ID: {value_obj.id})")
                # If no specific match, look for a partial match
                else:
                    # Look for any key that starts with the attribute ID
                    potential_keys = [k for k in attribute_value_map.keys() if k.startswith(f"{attribute_id}::")]
                    if potential_keys:
                        # Use the first match we find
                        value_obj = attribute_value_map[potential_keys[0]]
                        item['value'] = value_obj.value
                        item['locale'] = value_obj.locale
                        item['channel'] = value_obj.channel
                        item['value_id'] = value_obj.id
                        print(f"  → Setting value from PARTIAL match: {value_obj.value} (ID: {value_obj.id})")
                    else:
                        # Fall back to the original prefetch-based logic
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