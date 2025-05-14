from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from django.db import transaction
from django.shortcuts import get_object_or_404

from kernlogic.utils import get_user_organization
from products.permissions import HasProductViewPermission

from products.models import Product, AttributeGroup, FamilyAttributeGroup


class ProductGroupOverride:
    """
    Utility class to manage product-specific attribute group overrides.
    This is implemented as a JSON field in the product attributes to track
    which attribute groups should be hidden for a specific product.
    """
    OVERRIDE_KEY = "hidden_attribute_groups"
    
    @classmethod
    def get_hidden_groups(cls, product):
        """Get list of hidden attribute group IDs for a product"""
        attributes = product.get_attributes()
        return attributes.get(cls.OVERRIDE_KEY, [])
    
    @classmethod
    def set_hidden_groups(cls, product, group_ids):
        """Set list of hidden attribute group IDs for a product"""
        attributes = product.get_attributes()
        attributes[cls.OVERRIDE_KEY] = group_ids
        product.set_attributes(attributes)
        product.save(update_fields=['attributes'])
    
    @classmethod
    def hide_group(cls, product, group_id):
        """Hide a specific attribute group for a product"""
        hidden_groups = cls.get_hidden_groups(product)
        if group_id not in hidden_groups:
            hidden_groups.append(group_id)
            cls.set_hidden_groups(product, hidden_groups)
            return True
        return False
    
    @classmethod
    def show_group(cls, product, group_id):
        """Show a previously hidden attribute group for a product"""
        hidden_groups = cls.get_hidden_groups(product)
        if group_id in hidden_groups:
            hidden_groups.remove(group_id)
            cls.set_hidden_groups(product, hidden_groups)
            return True
        return False


@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'attribute_group': {'type': 'integer'},
                'removed': {'type': 'boolean'}
            },
            'required': ['attribute_group', 'removed']
        }
    },
    responses={
        200: {'description': 'Attribute group override successfully updated'},
        400: {'description': 'Invalid request data'},
        404: {'description': 'Product or attribute group not found'}
    },
    parameters=[
        OpenApiParameter(name='product_id', description='Product ID', required=True, type=int)
    ]
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasProductViewPermission])
def override_attribute_group(request, product_id):
    """
    Override/remove a specific attribute group for a product.
    
    This endpoint allows hiding or showing a specific attribute group for a product,
    regardless of what is required by the product's family.
    
    Request body:
    {
        "attribute_group": ID,  # Required: ID of the attribute group to override
        "removed": true/false   # Required: Whether to hide (true) or show (false) the attribute group
    }
    """
    organization = get_user_organization(request.user)
    
    # Get the product
    product = get_object_or_404(
        Product, 
        id=product_id, 
        organization=organization
    )
    
    # Validate request data
    group_id = request.data.get('attribute_group')
    removed = request.data.get('removed')
    
    if group_id is None or removed is None:
        return Response(
            {"error": "attribute_group and removed fields are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        group_id = int(group_id)
    except (ValueError, TypeError):
        return Response(
            {"error": "attribute_group must be an integer"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not isinstance(removed, bool):
        return Response(
            {"error": "removed must be a boolean"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if the attribute group exists and is associated with the product's family
    if product.family:
        try:
            # Check if attribute group is in the product's family
            family_group = FamilyAttributeGroup.objects.get(
                family=product.family,
                attribute_group_id=group_id,
                organization=organization
            )
        except FamilyAttributeGroup.DoesNotExist:
            return Response(
                {"error": "Attribute group is not associated with this product's family"},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # If product has no family, check if the attribute group exists in the organization
        try:
            AttributeGroup.objects.get(
                id=group_id,
                organization=organization
            )
        except AttributeGroup.DoesNotExist:
            return Response(
                {"error": "Attribute group not found or not accessible"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Apply the override
    with transaction.atomic():
        if removed:
            ProductGroupOverride.hide_group(product, group_id)
        else:
            ProductGroupOverride.show_group(product, group_id)
    
    # Return success response with current hidden groups
    return Response({
        "hidden_attribute_groups": ProductGroupOverride.get_hidden_groups(product)
    })


from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404

from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from products.permissions import HasProductChangePermission
from products.models import ProductFamilyOverride, Product, AttributeGroup
from products.serializers import ProductFamilyOverrideSerializer

class ProductFamilyOverrideViewSet(
    OrganizationQuerySetMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """
    API endpoints for managing product family attribute group overrides.
    
    This viewset allows products to override (remove or add) attribute groups
    inherited from their family.
    """
    serializer_class = ProductFamilyOverrideSerializer
    permission_classes = [IsAuthenticated, HasProductChangePermission]
    queryset = ProductFamilyOverride.objects.all()
    
    def get_queryset(self):
        """Filter overrides by product ID from URL"""
        queryset = super().get_queryset()
        product_pk = self.kwargs.get('product_pk')
        if product_pk:
            queryset = queryset.filter(product_id=product_pk)
        return queryset
    
    def get_serializer_context(self):
        """Add product ID to serializer context"""
        context = super().get_serializer_context()
        context['product_id'] = self.kwargs.get('product_pk')
        return context
    
    def create(self, request, *args, **kwargs):
        """Handle creation of a single override or bulk override operations"""
        product_pk = self.kwargs.get('product_pk')
        product = get_object_or_404(Product, id=product_pk)
        organization = get_user_organization(request.user)
        
        # Check if bulk operation
        if isinstance(request.data, list):
            created_overrides = []
            with transaction.atomic():
                # Clear existing overrides
                ProductFamilyOverride.objects.filter(product_id=product_pk).delete()
                
                # Create new overrides
                for item in request.data:
                    # Validate attribute group exists and belongs to user's org
                    try:
                        attribute_group = AttributeGroup.objects.get(
                            id=item.get('attribute_group'),
                            organization=organization
                        )
                    except AttributeGroup.DoesNotExist:
                        return Response(
                            {"error": f"Attribute group {item.get('attribute_group')} not found"},
                            status=status.HTTP_404_NOT_FOUND
                        )
                    
                    override = ProductFamilyOverride.objects.create(
                        product=product,
                        attribute_group=attribute_group,
                        removed=item.get('removed', True),
                        organization=organization
                    )
                    created_overrides.append(override)
            
            serializer = self.get_serializer(created_overrides, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        # Handle single override
        return super().create(request, *args, **kwargs) 