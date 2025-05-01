from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.response import Response
from rest_framework import status

from products.models import AttributeValue, Product, Attribute
from products.serializers import AttributeValueSerializer
from kernlogic.org_queryset import OrganizationQuerySetMixin

@extend_schema_view(
    list=extend_schema(summary="List attribute values for a product", 
                     description="Returns all attribute values for a specific product."),
    retrieve=extend_schema(summary="Get a specific attribute value", 
                         description="Returns details of a specific attribute value for a product."),
    create=extend_schema(summary="Create a new attribute value", 
                       description="Create a new attribute value for a product."),
    update=extend_schema(summary="Update an attribute value", 
                       description="Update an existing attribute value."),
    partial_update=extend_schema(summary="Partially update an attribute value", 
                              description="Partially update an existing attribute value."),
    destroy=extend_schema(summary="Delete an attribute value", 
                        description="Delete an attribute value from a product."),
)
class AttributeValueViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product attribute values.
    Nested under products.
    """
    serializer_class = AttributeValueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter attribute values by product ID from URL and organization
        """
        qs = super().get_queryset()
        return qs.filter(product_id=self.kwargs.get('product_pk'))
    
    def perform_create(self, serializer):
        """Set organization, product, and attribute from URL parameters and request data"""
        product = get_object_or_404(
            Product.objects.filter(organization=self.request.user.profile.organization),
            pk=self.kwargs.get('product_pk')
        )
        
        # Get attribute ID from request data
        attribute_id = self.request.data.get('attribute')
        if not attribute_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"attribute": "This field is required."})
            
        # Get the attribute object
        attribute = get_object_or_404(
            Attribute.objects.filter(organization=self.request.user.profile.organization),
            pk=attribute_id
        )
        
        serializer.save(
            organization=self.request.user.profile.organization,
            product=product,
            attribute=attribute
        )

    def create(self, request, *args, **kwargs):
        """Custom create method to set attribute in context"""
        # Get attribute ID from request data
        attribute_id = request.data.get('attribute')
        if not attribute_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"attribute": "This field is required."})
            
        # Get the attribute object
        attribute = get_object_or_404(
            Attribute.objects.filter(organization=request.user.profile.organization),
            pk=attribute_id
        )
        
        # Create a new context dictionary with the attribute
        context = self.get_serializer_context()
        context['attribute'] = attribute
        
        # Create serializer with updated context
        serializer = self.get_serializer(data=request.data, context=context)
        
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers) 