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
        # Get data from request
        data = self.request.data.copy()
        
        # Get product and attribute from URL
        product_id = self.kwargs.get('product_pk')
        attribute_id = data.get('attribute')
        
        # Get organization from current user
        organization = self.request.user.profile.organization
        
        # Get attribute to check if it supports localization/scope
        attribute = get_object_or_404(
            Attribute.objects.filter(organization=organization),
            pk=attribute_id
        )
        
        # Force locale/channel to None if not supported by attribute
        locale = data.get('locale')
        channel = data.get('channel')
        
        if not attribute.is_localisable:
            locale = None
        elif locale == '':
            locale = None
        
        if not attribute.is_scopable:
            channel = None
        elif channel == '':
            channel = None
        
        # Create with our preprocessed data
        serializer.save(
            product_id=product_id,
            attribute_id=attribute_id,
            organization=organization,
            locale=locale,
            channel=channel,
        )

    def perform_update(self, serializer):
        # Get data from request
        data = self.request.data.copy()
        
        # Get attribute to check if it supports localization/scope
        attribute = serializer.instance.attribute
        
        # Force locale/channel to None if not supported by attribute
        locale = data.get('locale')
        channel = data.get('channel')
        
        if not attribute.is_localisable:
            locale = None
        elif locale == '':
            locale = None
        
        if not attribute.is_scopable:
            channel = None
        elif channel == '':
            channel = None
        
        # Update with our preprocessed data
        serializer.save(
            locale=locale,
            channel=channel
        )

    def create(self, request, *args, **kwargs):
        """Custom create method to set attribute in context"""
        # Debug the raw request data
        print(f"[DEBUG] Raw request data: {request.data}")
        
        # Get attribute ID from request data
        attribute_id = request.data.get('attribute')
        if not attribute_id:
            from rest_framework.exceptions import ValidationError
            print(f"[DEBUG] ValidationError: attribute field is required")
            raise ValidationError({"attribute": "This field is required."})
            
        # Get product ID from URL
        product_id = self.kwargs.get('product_pk')
        print(f"[DEBUG] Product ID from URL: {product_id}")
        
        # Debug the attribute ID
        print(f"[DEBUG] Attribute ID from request: {attribute_id}, type: {type(attribute_id)}")
        
        try:
            # Get the attribute object
            attribute = get_object_or_404(
                Attribute.objects.filter(organization=request.user.profile.organization),
                pk=attribute_id
            )
            print(f"[DEBUG] Found attribute: {attribute.id} - {attribute.label}")
        except Exception as e:
            print(f"[DEBUG] Error getting attribute: {str(e)}")
            raise
        
        # Get locale and channel from request data
        locale = request.data.get('locale')
        channel = request.data.get('channel')
        
        # Convert empty string values to None for locale and channel
        if locale == '':
            locale = None
        if channel == '':
            channel = None
        
        print(f"[DEBUG] Locale: {locale}, Channel: {channel}")
        
        # Check if an attribute value already exists for this combination
        try:
            # Build filter for finding existing attribute value
            filter_kwargs = {
                'product_id': product_id,
                'attribute_id': attribute_id,
                'organization': request.user.profile.organization
            }
            
            # Only add locale/channel to filter if provided
            if locale is not None:
                filter_kwargs['locale'] = locale
            if channel is not None:
                filter_kwargs['channel'] = channel
                
            print(f"[DEBUG] Looking for existing attribute value with filters: {filter_kwargs}")
            
            # Try to find existing attribute value
            existing_value = AttributeValue.objects.get(**filter_kwargs)
            
            print(f"[DEBUG] Found existing attribute value: {existing_value.id}")
            
            # If we get here, an attribute value exists - update it instead
            context = self.get_serializer_context()
            context['attribute'] = attribute
            
            serializer = self.get_serializer(existing_value, data=request.data, partial=True, context=context)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except AttributeValue.DoesNotExist:
            # No existing value found, create a new one
            print("[DEBUG] No existing attribute value found, creating new one")
            
            # Create a new context dictionary with the attribute
            context = self.get_serializer_context()
            context['attribute'] = attribute
            
            # Create serializer with updated context
            serializer = self.get_serializer(data=request.data, context=context)
            
            # Validate and check for errors
            try:
                serializer.is_valid(raise_exception=True)
                print(f"[DEBUG] Serializer valid with data: {serializer.validated_data}")
            except Exception as e:
                print(f"[DEBUG] Serializer validation error: {str(e)}")
                raise
            
            # Create the instance
            try:
                self.perform_create(serializer)
                print(f"[DEBUG] Successfully created attribute value")
            except Exception as e:
                print(f"[DEBUG] Error in perform_create: {str(e)}")
                raise
            
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except AttributeValue.MultipleObjectsReturned:
            # If multiple values exist, handle the duplication issue
            print("[DEBUG] Multiple attribute values found, resolving duplication...")
            
            # Get all duplicate values
            duplicates = AttributeValue.objects.filter(**filter_kwargs).order_by('-id')
            
            # Keep the most recent one
            latest_value = duplicates.first()
            # Delete the rest
            duplicates.exclude(id=latest_value.id).delete()
            
            # Update the remaining value
            context = self.get_serializer_context()
            context['attribute'] = attribute
            
            serializer = self.get_serializer(latest_value, data=request.data, partial=True, context=context)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data, status=status.HTTP_200_OK) 