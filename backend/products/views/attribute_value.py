from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q

from products.models import AttributeValue, Product, Attribute, Locale
from products.serializers import AttributeValueSerializer, AttributeValueDetailSerializer
from products.permissions import IsStaffOrReadOnly
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from products.events import record

@extend_schema_view(
    list=extend_schema(summary="List all attribute values", 
                      description="Returns attribute values for the current organization."),
    retrieve=extend_schema(summary="Get a specific attribute value", 
                         description="Returns details of a specific attribute value."),
    create=extend_schema(summary="Create a new attribute value", 
                       description="Create a new attribute value for the current organization. Staff only."),
    update=extend_schema(summary="Update an attribute value", 
                       description="Update an existing attribute value. Staff only."),
    partial_update=extend_schema(summary="Partially update an attribute value", 
                               description="Partially update an existing attribute value. Staff only."),
    destroy=extend_schema(summary="Delete an attribute value", 
                        description="Delete an attribute value. Staff only."),
)
class AttributeValueViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing attribute values.
    """
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    
    def get_queryset(self):
        """
        Return AttributeValues scoped to the current user's organisation.
        If the URL is nested under /products/<product_pk>/, limit to that product.
        Otherwise return all attribute values for the organisation.
        Keeps backwards-compatibility with existing non-nested endpoint which expects
        organisation-wide results.
        """
        org = get_user_organization(self.request.user)

        # Standard base queryset – always organisation scoped
        qs = AttributeValue.objects.filter(organization=org).select_related('attribute', 'product')

        # Check if we are under a nested router with product_pk in kwargs
        product_pk = self.kwargs.get('product_pk') or self.kwargs.get('product_id')

        if product_pk:
            qs = qs.filter(product_id=product_pk)

        # --------------------------------------------------------------
        # Locale / Channel scoping
        # --------------------------------------------------------------
        # When the frontend supplies ?locale=<code>&channel=<code> it expects
        # operations (list, update, delete) to apply ONLY to that specific
        # locale / channel combination.  Previously we ignored these query
        # parameters which meant that list responses mixed values from other
        # locales/channels and the delete button could remove a fallback
        # (locale/channel = NULL) value, effectively deleting the attribute
        # for all contexts.  By honouring the query-string here we ensure that
        # any action is strictly scoped to the requested locale/channel.

        locale_code = self.request.query_params.get('locale')
        channel = self.request.query_params.get('channel')

        if locale_code is not None and locale_code != '':
            # Fix: Don't try to filter by locale code string directly
            # Instead, look up the locale by code or use NULL values
            locale_qs = Locale.objects.filter(organization=org, code=locale_code)
            if locale_qs.exists():
                locale_obj = locale_qs.first()
                qs = qs.filter(Q(locale=locale_obj) | Q(locale__isnull=True))
            else:
                # If no matching locale found, only return values with null locale
                qs = qs.filter(locale__isnull=True)

        if channel is not None and channel != '':
            qs = qs.filter(Q(channel=channel) | Q(channel__isnull=True))

        return qs
    
    def get_serializer(self, *args, **kwargs):
        data = kwargs.get('data')
        if data:
            organization = get_user_organization(self.request.user)
            locale_code = data.get('locale')
            if locale_code and not str(locale_code).isdigit():
                locale_obj = Locale.objects.filter(organization=organization, code=locale_code).first()
                data = data.copy()
                data['locale'] = locale_obj.pk if locale_obj else None
                kwargs['data'] = data
        return super().get_serializer(*args, **kwargs)
    
    def perform_create(self, serializer):
        """Assign implicit product from nested URL and save.

        Front-end uses the nested route `/api/products/<product_pk>/attributes/` and
        does **not** include a `product` field in the JSON body. DRF will mark
        that field as required unless we inject it here.  We resolve the
        product based on the `<product_pk>` path parameter and supply it to
        `serializer.save()` along with tenant and creator info.
        """

        organization = get_user_organization(self.request.user)
        product_pk = self.kwargs.get('product_pk') or self.kwargs.get('product_id')
        product_obj = None
        if product_pk is not None:
            product_obj = get_object_or_404(
                Product.objects.filter(organization=organization),
                pk=product_pk,
            )
        # Get the locale code from query or data, and resolve to Locale instance
        locale_code = self.request.query_params.get('locale') or self.request.data.get('locale')
        locale_obj = None
        if locale_code:
            try:
                locale_obj = Locale.objects.get(organization=organization, code=locale_code)
            except Locale.DoesNotExist:
                locale_obj = None
        serializer.save(
            organization=organization,
            product=product_obj or serializer.validated_data.get('product'),
            locale=locale_obj,
            channel=self.request.query_params.get('channel') or self.request.data.get('channel') or serializer.validated_data.get('channel'),
            created_by=self.request.user,
        )

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple attribute values at once"""
        serializer = AttributeValueSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save(organization=get_user_organization(request.user), created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ------------------------------------------------------------------
    # Deletion safety – ensure we only delete the value that matches the
    # requested locale/channel so that a global (NULL locale/channel) value
    # isn't removed accidentally when the user is working within a specific
    # context.
    # ------------------------------------------------------------------
    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError
        locale_param  = self.request.query_params.get('locale')
        channel_param = self.request.query_params.get('channel')
        if locale_param:
            organization = get_user_organization(self.request.user)
            try:
                locale_obj = Locale.objects.get(organization=organization, code=locale_param)
                if instance.locale_id != locale_obj.pk:
                    raise ValidationError({'detail': 'Attribute value does not match the requested locale – deletion aborted.'})
            except Locale.DoesNotExist:
                if instance.locale_id is not None:
                    raise ValidationError({'detail': 'Attribute value does not match the requested locale – deletion aborted.'})
        if channel_param and (instance.channel or '') != channel_param:
            raise ValidationError({'detail': 'Attribute value does not match the requested channel – deletion aborted.'})
        instance.delete()

    def perform_update(self, serializer):
        organization = get_user_organization(self.request.user)
        # Get the locale code from query or data, and resolve to Locale instance
        locale_code = self.request.query_params.get('locale') or self.request.data.get('locale')
        locale_obj = None
        if locale_code:
            try:
                locale_obj = Locale.objects.get(organization=organization, code=locale_code)
            except Locale.DoesNotExist:
                locale_obj = None
        serializer.save(
            locale=locale_obj,
            channel=self.request.query_params.get('channel') or self.request.data.get('channel') or serializer.validated_data.get('channel'),
        )

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return AttributeValueDetailSerializer
        return AttributeValueSerializer

class ProductAttributeValueList(generics.ListAPIView):
    """
    API endpoint to list all attribute values for a specific product
    """
    serializer_class = AttributeValueDetailSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by product ID"""
        product_id = self.kwargs['product_id']
        organization = get_user_organization(self.request.user)
        
        # Get the product
        try:
            product = Product.objects.get(id=product_id, organization=organization)
        except Product.DoesNotExist:
            return AttributeValue.objects.none()
            
        # Return all attribute values for this product
        return AttributeValue.objects.filter(
            product=product,
            organization=organization
        ).select_related('attribute')

class AttributeValuesByAttributeList(generics.ListAPIView):
    """
    API endpoint to list all values for a specific attribute
    """
    serializer_class = AttributeValueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by attribute ID"""
        attribute_id = self.kwargs['attribute_id']
        return AttributeValue.objects.filter(
            attribute__id=attribute_id,
            attribute__in=Attribute.objects.filter(organization=get_user_organization(self.request.user)),
        )

    def perform_create(self, serializer):
        """Set organization and created_by from request user"""
        organization = get_user_organization(self.request.user)
        serializer.save(
            organization=organization,
            created_by=self.request.user
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
        
        # Save old value for comparison in event payload
        old_value = serializer.instance.value
        
        # Update with our preprocessed data
        attr_value = serializer.save(
            locale=locale,
            channel=channel
        )
        
        # Only record event if value actually changed
        if old_value != attr_value.value:
            # Log the update event in the product history
            product = serializer.instance.product
            
            # Create event summary
            location_context = ""
            if locale and channel:
                location_context = f" for locale {locale} and channel {channel}"
            elif locale:
                location_context = f" for locale {locale}"
            elif channel:
                location_context = f" for channel {channel}"
            
            summary = f"Updated attribute '{attribute.label}'{location_context}"
            
            # Record the event
            record(
                product=product,
                user=self.request.user,
                event_type="attribute_updated",
                summary=summary,
                payload={
                    "attribute_id": attribute.id,
                    "attribute_code": attribute.code,
                    "attribute_label": attribute.label,
                    "locale": locale,
                    "channel": channel,
                    "old_value": old_value,
                    "new_value": attr_value.value
                }
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
                Attribute.objects.filter(organization=get_user_organization(request.user)),
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
                'organization': get_user_organization(request.user)
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
            
            # Log the update event in the product history
            product = Product.objects.get(id=product_id)
            
            # Create event summary
            location_context = ""
            if locale and channel:
                location_context = f" for locale {locale} and channel {channel}"
            elif locale:
                location_context = f" for locale {locale}"
            elif channel:
                location_context = f" for channel {channel}"
            
            summary = f"Updated attribute '{attribute.label}'{location_context}"
            
            # Record the event
            record(
                product=product,
                user=request.user,
                event_type="attribute_updated",
                summary=summary,
                payload={
                    "attribute_id": attribute.id,
                    "attribute_code": attribute.code,
                    "attribute_label": attribute.label,
                    "locale": locale,
                    "channel": channel,
                    "value": existing_value.value,
                    "new_value": serializer.validated_data.get('value', existing_value.value)
                }
            )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except AttributeValue.DoesNotExist:
            # No existing value found, create a new one
            print("[DEBUG] No existing attribute value found, creating new one")
            
            # Create a new context dictionary with the attribute
            context = self.get_serializer_context()
            context['attribute'] = attribute
            
            # Create serializer with updated context
            print(f"[DEBUG] Creating serializer with attribute in context: {attribute.id}")
            serializer = self.get_serializer(data=request.data, context=context)
            
            # Validate and check for errors
            try:
                serializer.is_valid(raise_exception=True)
                print(f"[DEBUG] Serializer valid with data: {serializer.validated_data}")
                print(f"[DEBUG] Serializer initial_data: {serializer.initial_data}")
                
                # Check if attribute exists in validated data (it should be added in perform_create)
                if 'attribute' not in serializer.validated_data:
                    print(f"[DEBUG] WARNING: 'attribute' not in validated_data, we'll pass it explicitly")
            except Exception as e:
                print(f"[DEBUG] Serializer validation error: {str(e)}")
                raise
            
            # Get the product object
            product = get_object_or_404(
                Product.objects.filter(organization=get_user_organization(request.user)),
                pk=product_id
            )
            
            print(f"[DEBUG] About to save with attribute: {attribute.id}, product: {product.id}")
            print(f"[DEBUG] Attribute data: label={attribute.label}, org={attribute.organization_id}")
            print(f"[DEBUG] Product data: name={product.name}, org={product.organization_id}")
            print(f"[DEBUG] Additional data: org={get_user_organization(request.user).id}, user={request.user.id}")
            
            # Explicitly pass attribute to serializer.save()
            try:
                print(f"[DEBUG] Explicitly passing attribute to serializer.save()")
                instance = serializer.save(
                    attribute=attribute,
                    product=product,
                    organization=get_user_organization(request.user),
                    created_by=request.user,
                )
                
                print(f"[DEBUG] Successfully created attribute value directly: {instance.id}")
                output = AttributeValueDetailSerializer(instance, context=self.get_serializer_context()).data
                return Response(output, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"[DEBUG] Error creating attribute value directly: {str(e)}")
                raise
            
            # Original code - now unreachable
            # instance = serializer.save(
            #     attribute=attribute,
            #     product=product,
            #     organization=get_user_organization(request.user),
            #     created_by=request.user,
            # )
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