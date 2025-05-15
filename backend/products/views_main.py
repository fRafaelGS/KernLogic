from django.shortcuts import render
from django.http import HttpResponse, Http404
from django.conf import settings
from django.db.models import Sum, Count, F, Q, Subquery, OuterRef, Prefetch
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import os
import json
import re
import logging
from datetime import datetime, timedelta

from rest_framework import viewsets, status, permissions, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.renderers import JSONRenderer
from rest_framework.generics import get_object_or_404

from .models import (    Product, Activity, ProductRelation,     ProductAsset, ProductEvent, Attribute, AttributeValue,    AttributeGroup, AttributeGroupItem, ProductPrice, SalesChannel, Category, AssetBundle)
from .serializers import (
    ProductSerializer, ActivitySerializer, 
    ProductRelationSerializer, ProductStatsSerializer, IncompleteProductSerializer,
    ProductAssetSerializer, ProductEventSerializer, AttributeValueSerializer,
    AttributeValueDetailSerializer, AttributeGroupSerializer, AttributeGroupItemSerializer,
    ProductPriceSerializer, SalesChannelSerializer, SimpleCategorySerializer, CategorySerializer,
    AssetBundleSerializer
)
from django_filters.rest_framework import DjangoFilterBackend
import sys
import zipfile
import io

# Import the models, but don't import them during migration
# Create placeholders if we're in a migration
if 'makemigrations' in sys.argv or 'migrate' in sys.argv:
    class MockManager:
        def all(self):
            return []
        def filter(self, *args, **kwargs):
            return self.all()
    
    # Create placeholder classes for migrations
    class Product:
        objects = MockManager()
    class ProductImage:
        pass
    class ProductRelation:
        pass
    class ProductAsset:
        objects = MockManager()
    class ProductEvent:
        objects = MockManager()
else:
    # Normal imports for runtime
    from .models import Product, ProductRelation, ProductAsset, ProductEvent

from .serializers import (
    ProductSerializer, 
    ProductStatsSerializer,
    DashboardSummarySerializer, 
    InventoryTrendSerializer, 
    ActivitySerializer,
    ProductRelationSerializer,
    ProductAssetSerializer,
    ProductEventSerializer
)
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction, models
from rest_framework.renderers import JSONRenderer
from django.db.models import Sum, F, Q, Count
from django.db.models.functions import Coalesce
from decimal import Decimal
from .pagination import StandardResultsSetPagination
from datetime import datetime, timedelta
from django.utils import timezone
import json
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.conf import settings
from .models import Activity
from rest_framework import mixins
from rest_framework.pagination import PageNumberPagination
from .events import record
from rest_framework.views import APIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from kernlogic.org_queryset import OrganizationQuerySetMixin
from kernlogic.utils import get_user_organization
from rest_framework.exceptions import NotFound
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models.fields.files import FieldFile
from django.db.models import Model

User = get_user_model()

# Create your views here.

@method_decorator(csrf_exempt, name='dispatch')
class ProductViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    API endpoint for managing product data.
    """
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'description', 'brand', 'tags', 'barcode']
    ordering_fields = ['name', 'created_at', 'brand']
    ordering = ['-created_at']
    renderer_classes = [JSONRenderer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    queryset = Product.objects.all()  # Add base queryset for OrganizationQuerySetMixin to use
    
    def get_permissions(self):
        """
        Return permissions based on the action:
        - list, retrieve: product.view permission
        - create: product.add permission
        - update, partial_update: product.change permission
        - destroy: product.delete permission
        """
        from .permissions import (
            HasProductViewPermission, 
            HasProductAddPermission, 
            HasProductChangePermission, 
            HasProductDeletePermission
        )
        
        if self.action in ['list', 'retrieve', 'brands', 'categories', 'tags', 'stats', 'related_products']:
            return [HasProductViewPermission()]
        elif self.action in ['create', 'bulk_create']:
            return [HasProductAddPermission()]
        elif self.action in ['update', 'partial_update', 'bulk_update']:
            return [HasProductChangePermission()]
        elif self.action in ['destroy', 'bulk_delete']:
            return [HasProductDeletePermission()]
        # Default to requiring view permission
        return [HasProductViewPermission()]

    def get_queryset(self):
        """
        Filter products to return only those created by the current user.
        Allow additional filtering by query parameters.
        """
        from django.db.models import Prefetch
        from prices.models import ProductPrice
        
        user = self.request.user
        if not user.is_authenticated:
            return Product.objects.none()
            
        # Staff see everything
        if user.is_staff:
            qs = Product.objects.all()
        else:
            # Regular users only see their own products
            qs = Product.objects.filter(created_by=user)
            
        # Prefetch all prices for efficient access
        qs = qs.prefetch_related(
            Prefetch(
                'prices',
                queryset=ProductPrice.objects.all(),
                to_attr='all_prices'
            )
        )
            
        # Additional filters from query parameters
        category_id = self.request.query_params.get('category_id')
        category_name = self.request.query_params.get('category')  # For backwards compatibility
        brand = self.request.query_params.get('brand')
        is_active = self.request.query_params.get('is_active')
        
        if category_id:
            # Direct filter by category ID
            qs = qs.filter(category_id=category_id)
        elif category_name:
            # For backwards compatibility - find category by name
            from .models import Category
            try:
                category = Category.objects.filter(
                    name=category_name,
                    organization=get_user_organization(user)
                ).first()
                
                if category:
                    qs = qs.filter(category=category)
            except Exception:
                # If there's an error, just continue without this filter
                pass
                
        if brand:
            qs = qs.filter(brand=brand)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            qs = qs.filter(is_active=is_active_bool)
        
        # Filter out archived products
        return qs.filter(is_archived=False)

    def perform_create(self, serializer):
        """
        Set the created_by field and organization when creating a product.
        Also add the primary image to assets collection if present.
        """
        try:
            # Get the user's organization
            organization = get_user_organization(self.request.user)
            
            if not organization:
                raise ValidationError({"error": "User must belong to an organization to create products"})
                
            # Create the product with user and organization
            product = serializer.save(
                created_by=self.request.user,
                organization=organization
            )
                
            # Record product creation event
            if product:
                try:
                    record(
                        product=product,
                        user=self.request.user,
                        event_type="created",
                        summary=f"Product '{product.name}' was created",
                        payload={"product_id": product.id, "sku": product.sku, "name": product.name}
                    )
                    
                    # Check if primary_image exists and add it to assets collection
                    if hasattr(product, 'primary_image') and product.primary_image:
                        try:
                            # Create an asset from the primary image
                            from .models import ProductAsset
                            asset = ProductAsset.objects.create(
                                product=product,
                                organization=organization,
                                uploaded_by=self.request.user,
                                asset_type='image',
                                file=product.primary_image,
                                name=f"{product.name} - Primary Image",
                                is_primary=True
                            )
                            print(f"Created asset {asset.id} from product's primary image")
                        except Exception as e:
                            print(f"Error creating asset from primary image: {str(e)}")
                    
                except Exception as e:
                    print(f"Error recording product creation: {str(e)}")
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            # Re-raise to let DRF handle the response
            raise

    def perform_update(self, serializer):
        from .models import AttributeValue, Attribute

        # 1) Snapshot old product fields
        old_product = self.get_object()
        old_values = {
            f.name: serialize_field(getattr(old_product, f.name))
            for f in Product._meta.concrete_fields
            if f.name not in ('id', 'created_at', 'updated_at')
        }
        for key in ('tags', 'attributes'):
            old_values[key] = getattr(old_product, key)

        # 1b) Snapshot old attribute values
        old_attr_qs = AttributeValue.objects.filter(product=old_product)
        old_attrs = {av.attribute_id: av.value for av in old_attr_qs}

        # 2) Save the updated product
        product = serializer.save()

        # 3) Snapshot new attribute values
        new_attr_qs = AttributeValue.objects.filter(product=product)
        new_attrs = {av.attribute_id: av.value for av in new_attr_qs}

        # 4) Build changes for product fields
        new_values = {field: serialize_field(getattr(product, field)) for field in old_values}
        for key in ('tags', 'attributes'):
            new_values[key] = getattr(product, key)
        changes = {
            field: {'old': old_values[field], 'new': new_values[field]}
            for field in old_values
            if old_values[field] != new_values[field]
        }
        old_data = old_values.copy()

        # 5) Diff attributes and add to changes
        for attr_id in set(old_attrs) | set(new_attrs):
            old_val = old_attrs.get(attr_id)
            new_val = new_attrs.get(attr_id)
            if old_val != new_val:
                try:
                    attr_obj = Attribute.objects.get(pk=attr_id)
                    attr_label = attr_obj.label
                except Attribute.DoesNotExist:
                    attr_label = str(attr_id)
                changes[f'attribute:{attr_label}'] = {'old': old_val, 'new': new_val}

        print(f"[DEBUG] perform_update: old_values={old_values}")
        print(f"[DEBUG] perform_update: new_values={new_values}")
        print(f"[DEBUG] perform_update: changes={changes}")

        if changes:
            try:
                record(
                    product=product,
                    user=self.request.user,
                    event_type='updated',
                    summary=f"Product '{product.name}' was updated",
                    payload={'changes': changes, 'old_data': old_data}
                )
            except Exception:
                pass

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete by setting is_archived=True or permanently delete if requested
        """
        instance = self.get_object()
        
        hard = request.query_params.get("hard") == "true"
        if hard and request.user.is_staff:  # only staff can hard-delete
            # Record product deletion event before deleting
            record(
                product=instance,
                user=request.user,
                event_type="deleted",
                summary=f"Product '{instance.name}' was permanently deleted",
                payload={"product_id": instance.id, "sku": instance.sku, "name": instance.name}
            )
            
            # Actually delete the product from the database
            instance.delete()
        else:
            # Record product archiving event
            record(
                product=instance,
                user=request.user,
                event_type="archived",
                summary=f"Product '{instance.name}' was archived",
                payload={"product_id": instance.id, "sku": instance.sku, "name": instance.name}
            )
            
            # Soft delete by setting is_archived flag
            instance.is_archived = True
            instance.save(update_fields=["is_archived"])
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return basic statistics about products
        """
        queryset = self.get_queryset()
        
        total_products = queryset.count()
        
        # Calculate total value using pricing table instead of legacy price field
        # First, get all base prices for the products
        from django.db.models import Sum, F, DecimalField
        from django.db.models.functions import Coalesce
        
        # Get all products with their base prices
        product_ids = queryset.values_list('id', flat=True)
        
        # Calculate total from prices table
        from products.models import ProductPrice
        total_value = ProductPrice.objects.filter(
            product_id__in=product_ids,
            price_type__code='base'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0.00'))
        )['total']
        
        data = {
            'total_products': total_products,
            'total_value': total_value
        }
        
        serializer = ProductStatsSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
        
    @action(detail=False, methods=['get', 'post'])
    def categories(self, request):
        """
        GET: Return a list of unique categories for dropdown menus.
        POST: Create a new category by adding it directly to the Category model.
        
        This is a legacy endpoint maintained for backward compatibility.
        New clients should use the dedicated CategoryViewSet instead.
        """
        if request.method == 'GET':
            try:
                # Get categories for current organization
                categories = Category.objects.filter(
                    organization=get_user_organization(request.user)
                ).order_by('name')
                
                # Return serialized categories with full hierarchical structure
                serializer = CategorySerializer(categories, many=True)
                return Response(serializer.data)
            except Exception as e:
                # Log the error
                print(f"Error in ProductViewSet.categories: {str(e)}")
                return Response(
                    {"error": "Failed to retrieve categories. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        elif request.method == 'POST':
            # For POST, create a new category
            category_name = request.data.get('name')
            parent_id = request.data.get('parent')
            
            if not category_name:
                return Response(
                    {"error": "Category name is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create new category
            try:
                # Check if we have a parent category
                parent = None
                if parent_id:
                    try:
                        parent = Category.objects.get(
                            pk=parent_id,
                            organization=get_user_organization(request.user)
                        )
                    except Category.DoesNotExist:
                        return Response(
                            {"error": f"Parent category with ID {parent_id} not found"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Create the category
                category = Category.objects.create(
                    name=category_name,
                    parent=parent,
                    organization=get_user_organization(request.user)
                )
                
                # Return the new category
                serializer = CategorySerializer(category)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {"error": f"Failed to create category: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['get'])
    def brands(self, request):
        """
        Return a list of unique brands for dropdown menus.
        """
        queryset = self.get_queryset()
        brands = queryset.values_list('brand', flat=True).distinct().order_by('brand')
        # Filter out None values
        brands = [b for b in brands if b]
        return Response(brands)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Create multiple products at once from a CSV upload or bulk input.
        """
        products_data = request.data
        
        if not isinstance(products_data, list):
            return Response(
                {"error": "Expected a list of products"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the user's organization for bulk creation    
        organization = get_user_organization(request.user)
        if not organization:
            return Response(
                {"error": "User must belong to an organization to create products"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        created_products = []
        errors = []
        
        for index, product_data in enumerate(products_data):
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                serializer.save(
                    created_by=request.user,
                    organization=organization
                )
                created_products.append(serializer.data)
            else:
                errors.append({
                    "index": index,
                    "data": product_data,
                    "errors": serializer.errors
                })
                
        result = {
            "created_count": len(created_products),
            "total_count": len(products_data),
            "created_products": created_products
        }
        
        if errors:
            result["errors"] = errors
            return Response(result, status=status.HTTP_207_MULTI_STATUS)
            
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Permanently delete multiple products at once.
        Expects: ids (list of product IDs)
        """
        # Get the IDs from the request
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response(
                {"error": "No product IDs provided for deletion"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Ensure we only delete products the user has permission for
        products = self.get_queryset().filter(pk__in=ids)
        
        if not products.exists():
            return Response(
                {"error": "No valid products found with the provided IDs"},
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get product details for logging before deletion
        products_to_delete = []
        for product in products:
            products_to_delete.append({
                'id': product.id,
                'name': product.name,
                'sku': product.sku
            })
        
        # Perform the permanent deletion
        deleted_count, _ = products.delete()
        
        # Log the deletion event (we can't use the product model as it's deleted)
        for product_data in products_to_delete:
            try:
                # Create an event record manually since the product is gone
                ProductEvent.objects.create(
                    event_type="bulk_deleted",
                    summary=f"Product '{product_data['name']}' was permanently deleted in bulk",
                    payload={
                        "product_id": product_data['id'],
                        "name": product_data['name'],
                        "sku": product_data['sku'],
                        "bulk_operation": True
                    },
                    created_by=request.user
                )
            except Exception as e:
                print(f"Error recording deletion event for product {product_data['id']}: {str(e)}")
        
        return Response({
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Permanently deleted {deleted_count} products"
        })

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Update a field for multiple products at once.
        Expects: ids (list of product IDs), field (string), and the value to set.
        For tags, expects 'tags' array instead of a single value.
        """
        # Get the IDs, field from the request
        ids = request.data.get('ids', [])
        field = request.data.get('field')
        
        if not ids or not field:
            return Response(
                {"error": "Missing required fields: ids and field"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Ensure we only update products the user has permission for
        products = self.get_queryset().filter(pk__in=ids)
        
        if not products.exists():
            return Response(
                {"error": "No valid products found with the provided IDs"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Special handling for different fields
        if field == 'tags':
            # For tags field, expect an array of tags
            tags = request.data.get('tags', [])
            
            if not tags:
                return Response(
                    {"error": "No tags provided for update"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            updated_count = 0
            
            # Update each product's tags individually to handle JSON properly
            for product in products:
                try:
                    # Get existing tags using the product method
                    existing_tags = product.get_tags()
                    
                    # Clean new tags
                    clean_tags = [str(tag).strip() for tag in tags if tag]
                    
                    # Add new tags (avoid duplicates)
                    for tag in clean_tags:
                        if tag not in existing_tags:
                            existing_tags.append(tag)
                    
                    # Update the product using the set_tags method
                    product.set_tags(existing_tags)
                    product.save(update_fields=['tags'])
                    updated_count += 1
                    
                    # Record the update event
                    record(
                        product=product,
                        user=request.user,
                        event_type="bulk_updated",
                        summary=f"Tags were added to product '{product.name}' in bulk",
                        payload={
                            "field": field,
                            "added_tags": clean_tags,
                            "bulk_operation": True
                        }
                    )
                except Exception as e:
                    print(f"Error updating tags for product {product.id}: {str(e)}")
            
            return Response({
                "success": True,
                "updated_count": updated_count,
                "message": f"Added tags to {updated_count} products"
            })
        elif field == 'is_active':
            value = request.data.get('value')
            
            if value is None:
                return Response(
                    {"error": f"Missing value for field '{field}'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Perform the update
            update_data = {field: value}
            updated_count = products.update(**update_data)
            
            # Record event based on value
            event_type = "bulk_deleted" if value is False else "bulk_updated"
            summary_text = "soft deleted" if value is False else "updated"
            
            # Record a bulk update event for each product
            for product in products:
                record(
                    product=product,
                    user=request.user,
                    event_type=event_type,
                    summary=f"Product '{product.name}' was {summary_text} in bulk",
                    payload={
                        "field": field,
                        "value": value,
                        "bulk_operation": True
                    }
                )
                
            action_text = "Deleted" if value is False else "Updated is_active to"
            return Response({
                "success": True,
                "updated_count": updated_count,
                "message": f"{action_text} {updated_count} products"
            })
        else:
            # For other fields like category, use the simple approach
            value = request.data.get('category')  # Initially support category, can be extended
            
            if value is None:
                return Response(
                    {"error": f"Missing value for field '{field}'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Perform the update
            update_data = {field: value}
            updated_count = products.update(**update_data)
            
            # Record a bulk update event for each product
            for product in products:
                record(
                    product=product,
                    user=request.user,
                    event_type="bulk_updated",
                    summary=f"Product '{product.name}' was updated in bulk",
                    payload={
                        "field": field,
                        "value": value,
                        "bulk_operation": True
                    }
                )
                
            return Response({
                "success": True,
                "updated_count": updated_count,
                "message": f"Updated {field} to '{value}' for {updated_count} products"
            })

    def create(self, request, *args, **kwargs):
        """
        Create a new product
        """
        print("Received create request with data:", request.data)
        print("Request method:", request.method)
        print("Request user:", request.user)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            print("Data is valid, creating product")
            self.perform_create(serializer)
            print("Product created successfully")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print("Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['post'])
    def cleanup_category_placeholders(self, request):
        """
        Remove all category placeholder products (created when adding categories)
        """
        try:
            # Find all products that are placeholders using just the user filter
            placeholders = Product.objects.filter(
                name__startswith="Category Placeholder:",
                is_active=False,
                created_by=request.user
            )
            
            count = placeholders.count()
            # Delete them physically (not just soft delete)
            placeholder_ids = list(placeholders.values_list('id', flat=True))
            placeholders.delete()
            
            return Response({
                'message': f'Successfully deleted {count} category placeholder products',
                'deleted_ids': placeholder_ids
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in cleanup_category_placeholders: {str(e)}")
            return Response({
                'error': f'Failed to delete category placeholders: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get', 'post'])
    def tags(self, request):
        """
        GET: Return a list of unique tags from all products.
        POST: Create a new tag by adding it to a "tag repository" product or returning an existing tag.
        """
        try:
            if request.method == 'GET':
                # Using the queryset from get_queryset() which is already filtered by organization
                queryset = self.get_queryset()
                all_tags = set()
                
                # Extract tags from all products
                for product in queryset:
                    if product.tags:
                        try:
                            # Use the product's get_tags method which handles errors
                            tags = product.get_tags()
                            if isinstance(tags, list):
                                # Sanitize tags before adding to the set
                                clean_tags = [str(tag).strip() for tag in tags if tag]
                                all_tags.update(clean_tags)
                        except Exception as e:
                            print(f"Error extracting tags for product {product.id}: {str(e)}")
                
                # Filter tags by search term if provided
                search_term = request.query_params.get('search', '').lower()
                if search_term:
                    filtered_tags = [tag for tag in all_tags if search_term in tag.lower()]
                    return Response(sorted(filtered_tags))
                
                return Response(sorted(all_tags))
            
            elif request.method == 'POST':
                # Get the tag name from request data and sanitize it
                tag_data = request.data.get('name')
                if not tag_data:
                    return Response(
                        {"error": "Tag name is required"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Sanitize the tag
                tag_name = str(tag_data).strip()
                if not tag_name:
                    return Response(
                        {"error": "Tag name cannot be empty"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # First check if this tag already exists in any product
                queryset = self.get_queryset()
                for product in queryset:
                    try:
                        # Use the product's get_tags method
                        tags = product.get_tags()
                        if isinstance(tags, list) and any(str(t).strip() == tag_name for t in tags):
                            # Tag already exists, return it
                            return Response(tag_name, status=status.HTTP_200_OK)
                    except Exception as e:
                        print(f"Error checking tags for product {product.id}: {str(e)}")
                
                # If tag doesn't exist, just return the new tag name
                return Response(tag_name, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Error in tags action: {str(e)}")
            # For GET requests return empty list, for POST return error
            if request.method == 'GET':
                return Response([])
            else:
                return Response({"error": f"Failed to process tag: {str(e)}"}, 
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def related_products(self, request, pk=None):
        """
        Return a list of related products based on the same category.
        Excludes the source product from the results.
        """
        # Get the current product
        product = self.get_object()
        
        # Get explicitly related products from the ProductRelation model
        relation_queryset = ProductRelation.objects.filter(
            product=product
        ).select_related('related_product')
        
        explicit_related_products = [relation.related_product for relation in relation_queryset]
        explicit_related_product_ids = [p.id for p in explicit_related_products]
        
        # Base queryset excluding current product and already explicitly related products
        base_queryset = self.get_queryset().exclude(
            pk__in=[product.pk] + explicit_related_product_ids
        )
        
        # If we have enough explicit relations, just return those
        if len(explicit_related_products) >= 5:
            serializer = self.get_serializer(explicit_related_products, many=True)
            return Response(serializer.data)
        
        # Otherwise, supplement with category-based recommendations
        if product.category:
            # Get products in the same category
            category_matches = base_queryset.filter(
                category=product.category,
                is_active=True
            )[:5-len(explicit_related_products)]
            
            # Combine explicit relations with category matches
            combined_products = explicit_related_products + list(category_matches)
            
            # If we found enough related products, return them
            if len(combined_products) >= 3:
                serializer = self.get_serializer(combined_products, many=True)
                return Response(serializer.data)
                
            # If we still need more, try descendants of the category
            if len(combined_products) < 5:
                # Get all descendant categories
                descendant_categories = product.category.get_descendants()
                if descendant_categories:
                    descendant_ids = [cat.id for cat in descendant_categories]
                    descendant_matches = base_queryset.filter(
                        category_id__in=descendant_ids,
                        is_active=True
                    ).exclude(
                        pk__in=[p.id for p in combined_products]
                    )[:5-len(combined_products)]
                    
                    combined_products.extend(descendant_matches)
                
            # If we still need more, try without the is_active filter
            if len(combined_products) < 5:
                inactive_matches = base_queryset.filter(
                    category=product.category
                ).exclude(
                    pk__in=[p.id for p in combined_products]
                )[:5-len(combined_products)]
                
                combined_products.extend(inactive_matches)
            
            # Return the combined result    
            serializer = self.get_serializer(combined_products, many=True)
            return Response(serializer.data)
        
        # If no category or explicit relations, return newest products (excluding current)
        fallback_products = explicit_related_products + list(base_queryset.filter(
            is_active=True
        ).order_by('-created_at')[:5-len(explicit_related_products)])
        
        serializer = self.get_serializer(fallback_products, many=True)
        return Response(serializer.data)
        
    # Add an alias for related_products with the URL path that the frontend is using
    @action(detail=True, methods=['get'], url_path='related-list')
    def related_list(self, request, pk=None):
        """
        Alias for related_products action to maintain compatibility with frontend.
        """
        return self.related_products(request, pk)

    @action(detail=True, methods=['post'], url_path='related-add')
    def add_related_product(self, request, pk=None):
        """
        Add a related product to this product
        """
        product = self.get_object()
        
        # Validate the related product ID
        related_product_id = request.data.get('related_product_id')
        is_pinned = request.data.get('is_pinned', False)
        relationship_type = request.data.get('relationship_type', 'related')
        notes = request.data.get('notes', '')
        
        if not related_product_id:
            return Response(
                {"error": "Related product ID is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            related_product = Product.objects.get(pk=related_product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Related product not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Prevent self-reference
        if product.id == related_product.id:
            return Response(
                {"error": "A product cannot be related to itself"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create or update the relation
        relation, created = ProductRelation.objects.update_or_create(
            product=product,
            related_product=related_product,
            defaults={
                'is_pinned': is_pinned,
                'relationship_type': relationship_type,
                'notes': notes,
                'created_by': request.user
            }
        )
        
        serializer = ProductRelationSerializer(relation)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
        
    @action(detail=True, methods=['patch', 'delete'], url_path='related/(?P<related_id>[^/.]+)')
    def manage_related_product(self, request, pk=None, related_id=None):
        """
        Update or delete a related product relationship
        """
        product = self.get_object()
        
        # Get the relation
        try:
            relation = ProductRelation.objects.get(
                product=product,
                related_product_id=related_id
            )
        except ProductRelation.DoesNotExist:
            return Response(
                {"error": "Related product relationship not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        if request.method == 'DELETE':
            # Delete the relation
            relation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        elif request.method == 'PATCH':
            # Update the relation
            serializer = ProductRelationSerializer(
                relation, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(
            {"error": "Method not allowed"}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['get'], url_path='explicit-relations')
    def explicit_relations(self, request, pk=None):
        """
        Return only the explicitly related products through ProductRelation model.
        Does not include category matches.
        """
        # Get the current product
        product = self.get_object()
        
        # Get only explicit relations from the ProductRelation model
        relations = ProductRelation.objects.filter(
            product=product
        ).select_related('related_product')
        
        # Serialize the relations
        class RelationSerializer(serializers.ModelSerializer):
            class Meta:
                model = ProductRelation
                fields = ['id', 'related_product_id', 'relationship_type', 'is_pinned', 'notes', 'created_at']
                
        serializer = RelationSerializer(relations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None, product_pk=None):
        try:
            with transaction.atomic():
                # Unset all current primary assets
                ProductAsset.objects.filter(product_id=product_pk).update(is_primary=False)

                # Set this asset as primary
                asset = (
                    ProductAsset.objects
                    .select_for_update()
                    .get(pk=pk, product_id=product_pk)
                )
                asset.is_primary = True
                asset.save(update_fields=['is_primary'])

                # Return the full updated product with assets
                product = Product.objects.get(pk=product_pk)
                serializer = ProductSerializer(product, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

        except ProductAsset.DoesNotExist:
            return Response(
                {"detail": f"Asset {pk} not found for product {product_pk}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # New action for managing prices for a product
    @action(detail=True, methods=['get', 'post'], url_path='prices')
    def prices(self, request, pk=None):
        """
        GET: List prices for a product
        POST: Create a new price for a product
        """
        # Import the canonical price model and serializer
        from prices.models import ProductPrice
        from prices.serializers import ProductPriceSerializer
        
        product = self.get_object()
        
        if request.method == 'GET':
            # Filter prices for this product
            prices = ProductPrice.objects.filter(product=product)
            
            # Apply organization filter
            organization = get_user_organization(request.user)
            if organization:
                prices = prices.filter(organization=organization)
                
            # Apply optional filters
            channel_id = request.query_params.get('channel_id')
            currency = request.query_params.get('currency')
            valid_only = request.query_params.get('valid_only')
            
            if channel_id:
                prices = prices.filter(channel_id=channel_id)
            if currency:
                prices = prices.filter(currency=currency)
            if valid_only and valid_only.lower() == 'true':
                now = timezone.now()
                prices = prices.filter(
                    Q(valid_from__lte=now) & 
                    (Q(valid_to__isnull=True) | Q(valid_to__gte=now))
                )
                
            serializer = ProductPriceSerializer(prices, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Set the product automatically
            data = request.data.copy()
            
            # Validate the price data
            serializer = ProductPriceSerializer(data=data)
            if serializer.is_valid():
                # Create the price with the correct product
                price = serializer.save(
                    product=product,
                    organization=get_user_organization(request.user)
                )
                
                # Build diff payload with old values for price_created
                old_amount = None
                old_currency = None
                old_price_type = None
                
                changes = {
                    "amount": {"old": old_amount, "new": str(price.amount)},
                    "currency": {"old": old_currency, "new": price.currency.iso_code},
                    "price_type": {"old": old_price_type, "new": price.price_type.code},
                }
                
                old_data = {
                    "amount": old_amount,
                    "currency": old_currency,
                    "price_type": old_price_type,
                }
                
                # Record the price creation event
                record(
                    product=product,
                    user=request.user,
                    event_type="price_created",
                    summary=f"Added {price.price_type.label} price of {price.currency.iso_code} {price.amount}",
                    payload={
                        "price_id": price.id,
                        "changes": changes,
                        "old_data": old_data
                    }
                )
                
                return Response(
                    ProductPriceSerializer(price).data,
                    status=status.HTTP_201_CREATED
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    # Action for managing individual prices
    @action(detail=True, methods=['get', 'patch', 'delete'], url_path='prices/(?P<price_id>[^/.]+)')
    def manage_price(self, request, pk=None, price_id=None):
        """
        GET, PATCH, DELETE operations for a specific price
        """
        # Import the canonical price model and serializer
        from prices.models import ProductPrice
        from prices.serializers import ProductPriceSerializer
        
        product = self.get_object()
        
        # Make sure the price exists and belongs to this product
        try:
            # Apply organization filter
            organization = get_user_organization(request.user)
            price_query = ProductPrice.objects.filter(id=price_id, product=product)
            if organization:
                price_query = price_query.filter(organization=organization)
                
            price = price_query.get()
        except ProductPrice.DoesNotExist:
            return Response(
                {"error": "Price not found for this product"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = ProductPriceSerializer(price)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = ProductPriceSerializer(price, data=request.data, partial=True)
            if serializer.is_valid():
                # Capture original values BEFORE applying update
                original_amount = str(price.amount) if price.amount is not None else None
                original_currency = price.currency.iso_code if price.currency else None
                original_price_type = price.price_type.code if price.price_type else None
                
                # Apply the update
                updated_price = serializer.save()
                
                # Build diff payload with actual changes
                changes = {
                    "amount": {
                        "old": original_amount,
                        "new": str(updated_price.amount)
                    },
                    "currency": {
                        "old": original_currency,
                        "new": updated_price.currency.iso_code
                    },
                    "price_type": {
                        "old": original_price_type,
                        "new": updated_price.price_type.code
                    }
                }
                
                # Only include fields that actually changed in the diff
                changes = {k: v for k, v in changes.items() if v["old"] != v["new"]}
                
                # Include full old_data snapshot
                old_data = {
                    "amount": original_amount,
                    "currency": original_currency,
                    "price_type": original_price_type,
                }
                
                # Record the price update event
                record(
                    product=product,
                    user=request.user,
                    event_type="price_updated",
                    summary=f"Updated {updated_price.price_type.label} price to {updated_price.currency.iso_code} {updated_price.amount}",
                    payload={
                        "price_id": updated_price.id,
                        "changes": changes,
                        "old_data": old_data
                    }
                )
                
                return Response(serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            # Optional: Instead of deleting, you could set an end date
            price_type = price.price_type.label
            price_amount = f"{price.currency.iso_code} {price.amount}"
            
            # Build diff payload for price_deleted
            old_amount = str(price.amount)
            old_currency = price.currency.iso_code
            old_price_type = price.price_type.code
            
            changes = {
                "amount": {"old": old_amount, "new": None},
                "currency": {"old": old_currency, "new": None},
                "price_type": {"old": old_price_type, "new": None},
            }
            
            old_data = {
                "amount": old_amount,
                "currency": old_currency,
                "price_type": old_price_type,
            }
            
            # Delete the price
            price.delete()
            
            # Record the deletion
            record(
                product=product,
                user=request.user,
                event_type="price_deleted",
                summary=f"Deleted {price_type} price of {price_amount}",
                payload={
                    "price_id": price_id,
                    "changes": changes,
                    "old_data": old_data
                }
            )
            
            return Response(status=status.HTTP_204_NO_CONTENT)

    # Action to get sales channels
    @action(detail=False, methods=['get', 'post'], url_path='sales-channels')
    def sales_channels(self, request):
        """
        GET: List all sales channels
        POST: Create a new sales channel
        """
        if request.method == 'GET':
            channels = SalesChannel.objects.filter(
                organization=get_user_organization(request.user)
            )
            serializer = SalesChannelSerializer(channels, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = SalesChannelSerializer(data=request.data)
            if serializer.is_valid():
                channel = serializer.save(
                    organization=get_user_organization(request.user)
                )
                return Response(
                    SalesChannelSerializer(channel).data,
                    status=status.HTTP_201_CREATED
                )
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Add endpoints for dashboard data
class DashboardViewSet(viewsets.ViewSet):
    """
    API endpoints for dashboard data
    """
    def get_permissions(self):
        """
        Return dashboard.view permission for all dashboard actions
        """
        from teams.permissions import HasDashboardViewPermission
        return [HasDashboardViewPermission()]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Return dashboard summary data:
        - KPI numbers (total products, inventory value, inactive products, team members)
        - Data completeness percentage
        - Most missing fields
        - Product status counts
        """
        print(f"DEBUG: DashboardViewSet.summary() called - User: {request.user}, Authenticated: {request.user.is_authenticated}")
        
        if not request.user.is_authenticated:
            print(f"DEBUG: User not authenticated in DashboardViewSet.summary()")
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Get queryset of products using only created_by filter
            if request.user.is_staff:
                queryset = Product.objects.all()
            else:
                queryset = Product.objects.filter(created_by=request.user)
            
            # Calculate KPIs
            total_products = queryset.count()
            
            # Calculate inventory value using the new pricing model instead of the old price field
            from prices.models import ProductPrice
            
            # Calculate current inventory value using the base price from ProductPrice table
            current_value = Decimal('0.00')
            for product in queryset:
                try:
                    # Get the base price for this product
                    base_price = product.prices.filter(price_type__code='base').first()
                    if base_price:
                        current_value += base_price.amount
                except Exception as e:
                    print(f"Error calculating inventory value for product {product.id}: {str(e)}")
                    continue
            
            # Count inactive products instead of low stock
            inactive_product_count = queryset.filter(is_active=False).count()
            
            # Get team members count (in a real app, this would be users in the same company)
            # For now, we'll return a fixed number or the admin user
            team_members = User.objects.filter(is_staff=True).count() or 1
            
            # Calculate completeness with error handling
            avg_completeness = 0
            if total_products > 0:
                # Get completeness for each product
                completeness_values = []
                for product in queryset:
                    try:
                        completeness_values.append(product.get_completeness())
                    except json.JSONDecodeError:
                        # Handle invalid JSON in product fields
                        print(f"WARNING: JSON decode error for product {product.id} during completeness calculation")
                        completeness_values.append(0)  # Default to 0% complete for products with invalid JSON
                    except Exception as e:
                        print(f"ERROR: Failed to calculate completeness for product {product.id}: {str(e)}")
                        completeness_values.append(0)
                
                if completeness_values:
                    avg_completeness = sum(completeness_values) / len(completeness_values)
            
            # Get most missing fields with weights and error handling
            missing_fields_count = {}
            for product in queryset:
                try:
                    for missing_field in product.get_missing_fields():
                        field_name = missing_field['field'] 
                        weight = missing_field['weight']
                        if field_name in missing_fields_count:
                            missing_fields_count[field_name]['count'] += 1
                            # Keep track of total weight for prioritization
                            missing_fields_count[field_name]['weight'] = weight
                        else:
                            missing_fields_count[field_name] = {
                                'count': 1,
                                'weight': weight
                            }
                except json.JSONDecodeError:
                    print(f"WARNING: JSON decode error for product {product.id} during missing fields calculation")
                    continue
                except Exception as e:
                    print(f"ERROR: Failed to calculate missing fields for product {product.id}: {str(e)}")
                    continue
            
            # Sort missing fields by count and weight and take top 3
            most_missing = [
                {
                    "field": field,
                    "count": data['count'],
                    "weight": data['weight']
                }
                for field, data in sorted(
                    missing_fields_count.items(), 
                    key=lambda x: (x[1]['count'], x[1]['weight']), 
                    reverse=True
                )[:3]
            ]
            
            # Get active/inactive counts
            active_count = queryset.filter(is_active=True).count()
            inactive_count = queryset.filter(is_active=False).count()
            
            # Prepare response data
            data = {
                'total_products': total_products,
                'inventory_value': current_value,
                'inactive_product_count': inactive_product_count,
                'team_members': team_members,
                'data_completeness': round(avg_completeness, 1),
                'most_missing_fields': most_missing,
                'active_products': active_count,
                'inactive_products': inactive_count
            }
            
            # Get attribute-related completeness data
            try:
                # Import the models directly from products
                from products.models import Attribute
                
                # Get organization from the utility function
                organization = get_user_organization(request.user)
                
                if organization:
                    # Get all attributes for this organization
                    attributes = Attribute.objects.filter(organization=organization)
                    attribute_names = [f"{attr.label} ({attr.code})" for attr in attributes]
                    
                    # Count products with missing attribute values
                    attributes_missing_count = 0
                    
                    for product in queryset:
                        # Use the new method to check attribute completeness
                        if not product._check_attribute_values_complete():
                            attributes_missing_count += 1
                    
                    # Add attribute data to the response
                    data['attributes_missing_count'] = attributes_missing_count
                    data['mandatory_attributes'] = attribute_names
                else:
                    # No organization found
                    data['attributes_missing_count'] = 0
                    data['mandatory_attributes'] = []
                
            except ImportError:
                # Attributes might not be properly configured
                data['attributes_missing_count'] = 0
                data['mandatory_attributes'] = []
            except Exception as e:
                print(f"Error calculating attribute completeness: {str(e)}")
                data['attributes_missing_count'] = 0
                data['mandatory_attributes'] = []
            
            serializer = DashboardSummarySerializer(data=data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data)
        except Exception as e:
            print(f"Exception in DashboardViewSet: {str(e)}")
            # Return empty data with zeros instead of error
            data = {
                'total_products': 0,
                'inventory_value': 0.0,
                'inactive_product_count': 0,
                'team_members': 1,
                'data_completeness': 0.0,
                'most_missing_fields': [],
                'active_products': 0,
                'inactive_products': 0,
                'attributes_missing_count': 0,
                'mandatory_attributes': []
            }
            serializer = DashboardSummarySerializer(data=data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data)
    
    @action(detail=False, methods=['get'], url_path='inventory-trend')
    def inventory_trend(self, request):
        """
        Return inventory value trend data for the specified time range
        """
        try:
            # Get range from query param (default to 30 days)
            try:
                range_days = int(request.query_params.get('range', 30))
            except ValueError:
                range_days = 30
            
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=range_days)
            
            # Get organization using utility function
            try:
                organization = get_user_organization(request.user)
                if organization:
                    queryset = Product.objects.filter(organization=organization)
                else:
                    # Fallback to user filter if no organization
                    print(f"WARNING: No organization found for user {request.user}. Falling back to user filter.")
                    queryset = Product.objects.filter(created_by=request.user)
            except Exception as e:
                print(f"ERROR: Failed to get organization: {str(e)}. Falling back to user filter.")
                if request.user.is_staff:
                    queryset = Product.objects.all()
                else:
                    queryset = Product.objects.filter(created_by=request.user)
            
            # In a real app, we would use historical data for accurate trends
            # For now, we'll generate synthetic data based on current inventory value
            from prices.models import ProductPrice
            
            # Calculate current inventory value using the base price from ProductPrice table
            current_value = Decimal('0.00')
            for product in queryset:
                try:
                    # Get the base price for this product
                    base_price = product.prices.filter(price_type__code='base').first()
                    if base_price:
                        current_value += base_price.amount
                except Exception as e:
                    print(f"Error calculating inventory value for product {product.id}: {str(e)}")
                    continue
            
            # Generate date range
            dates = []
            values = []
            date = start_date
            while date <= end_date:
                dates.append(date)
                
                # Generate a value with slight variation (+/- 5%)
                # In a real app, this would come from historical data
                day_offset = (date - start_date).days
                ratio = 0.8 + (day_offset / range_days * 0.4)  # Trend upward from 80% to 120%
                
                # Add some randomness
                import random
                ratio += random.uniform(-0.05, 0.05)
                
                value = current_value * Decimal(ratio)
                # Convert decimal to float
                values.append(float(value.quantize(Decimal('0.01'))))
                
                date += timedelta(days=1)
            
            data = {
                'dates': dates,
                'values': values
            }
            
            serializer = InventoryTrendSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data)
        except Exception as e:
            print(f"Exception in DashboardViewSet inventory_trend: {str(e)}")
            # Return empty data instead of error
            data = {
                'dates': [timezone.now().date() - timedelta(days=i) for i in range(30, 0, -1)],
                'values': [0.0] * 30
            }
            serializer = InventoryTrendSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data)
    
    @action(detail=False, methods=['get'])
    def activity(self, request):
        """
        Return recent activity data (limit 10)
        """
        try:
            print(f"DEBUG: DashboardViewSet.activity() called - User: {request.user}, Authenticated: {request.user.is_authenticated}")
            
            # Get organization using utility function
            try:
                organization = get_user_organization(request.user)
                if organization:
                    activities = Activity.objects.filter(
                        organization=organization
                    ).order_by('-created_at')[:10]
                else:
                    # Fallback to user filter if no organization
                    print(f"WARNING: No organization found for user {request.user}. Falling back to user filter.")
                    activities = Activity.objects.filter(
                        user=request.user
                    ).order_by('-created_at')[:10]
            except Exception as e:
                print(f"Exception in activity organization lookup: {str(e)}")
                # Fallback to user filter
                activities = Activity.objects.filter(
                    user=request.user
                ).order_by('-created_at')[:10]
            
            serializer = ActivitySerializer(activities, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Exception in DashboardViewSet activity: {str(e)}")
            # Return empty array instead of error
            return Response([])
    
    @action(detail=False, methods=['get'], url_path='incomplete-products')
    def incomplete_products(self, request):
        """
        Return the top 5 incomplete products
        """
        try:
            # Get organization using utility function
            try:
                organization = get_user_organization(request.user)
                if organization:
                    queryset = Product.objects.filter(organization=organization)
                else:
                    # Fallback to user filter if no organization
                    print(f"WARNING: No organization found for user {request.user}. Falling back to user filter.")
                    if request.user.is_staff:
                        queryset = Product.objects.all()
                    else:
                        queryset = Product.objects.filter(created_by=request.user)
            except Exception as e:
                print(f"ERROR: Failed to get organization: {str(e)}. Falling back to user filter.")
                if request.user.is_staff:
                    queryset = Product.objects.all()
                else:
                    queryset = Product.objects.filter(created_by=request.user)
            
            # Get all attributes for this organization for detailed missing attribute information
            try:
                from products.models import Attribute
                if organization:
                    all_attributes = {attr.id: attr for attr in Attribute.objects.filter(organization=organization)}
                else:
                    all_attributes = {}
            except Exception as e:
                print(f"ERROR: Failed to get attributes: {str(e)}")
                all_attributes = {}
            
            # Calculate completeness for each product
            products_with_completeness = []
            for product in queryset:
                try:
                    completeness = product.get_completeness()
                    if completeness < 100:  # Only include incomplete products
                        try:
                            missing_fields = product.get_missing_fields()
                            
                            # Add attribute details to missing fields
                            for field in missing_fields:
                                if 'attribute_id' in field and field['attribute_id'] in all_attributes:
                                    attr = all_attributes[field['attribute_id']]
                                    field['attribute_code'] = attr.code
                                    field['attribute_type'] = attr.data_type
                            
                            field_completeness = product.get_field_completeness()
                            products_with_completeness.append({
                                'product': product,
                                'completeness': completeness,
                                'missing_fields': missing_fields,
                                'field_completeness': field_completeness
                            })
                        except json.JSONDecodeError:
                            print(f"WARNING: JSON decode error for product {product.id} during missing fields calculation")
                            # Add product with minimal data
                            products_with_completeness.append({
                                'product': product,
                                'completeness': completeness,
                                'missing_fields': [{'field': 'Invalid data format', 'weight': 1}],
                                'field_completeness': []
                            })
                        except Exception as e:
                            print(f"ERROR: Failed to get field data for product {product.id}: {str(e)}")
                except json.JSONDecodeError:
                    print(f"WARNING: JSON decode error for product {product.id} during completeness calculation")
                except Exception as e:
                    print(f"ERROR: Failed to calculate completeness for product {product.id}: {str(e)}")
            
            # Sort by completeness (ascending) and take top 5
            products_with_completeness.sort(key=lambda x: x['completeness'])
            incomplete_products = products_with_completeness[:5]
            
            # Prepare serializer data
            serializer_data = []
            for item in incomplete_products:
                data = {
                    'id': item['product'].id,
                    'name': item['product'].name,
                    'sku': item['product'].sku,
                    'completeness': item['completeness'],
                    'missing_fields': item['missing_fields'],
                    'field_completeness': item['field_completeness']
                }
                serializer_data.append(data)
            
            return Response(serializer_data)
        except Exception as e:
            print(f"Exception in DashboardViewSet incomplete_products: {str(e)}")
            # Return empty array instead of error
            return Response([])

class AssetViewSet(OrganizationQuerySetMixin, viewsets.ModelViewSet):
    """
    Nested under /products/<product_pk>/assets/.
    Handles upload, delete, reorder and set-primary.
    """
    serializer_class = ProductAssetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = ProductAsset.objects.all()
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Always filter by product, auto-filtered for org by OrganizationQuerySetMixin
        return super().get_queryset().filter(product_id=self.kwargs.get("product_pk"))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["product_pk"] = self.kwargs.get("product_pk")
        return context

    def perform_create(self, serializer):
        try:
            # Get the product
            product = Product.objects.get(pk=self.kwargs.get('product_pk'))
            
            # Check if file is empty
            file_data = self.request.data.get('file') or self.request.FILES.get('file')
            if not file_data:
                raise ValidationError({"file": "The submitted file is empty"})
            
            # Use the centralized asset type service for detection
            from .utils.asset_type_service import asset_type_service
            
            # Check asset type (auto-detect if not provided)
            asset_type = self.request.data.get('asset_type')
            if not asset_type:
                # Use the shared service to detect asset type
                asset_type = asset_type_service.detect_type(file_data)
                # Convert 'model' type to '3d' for backward compatibility
                if asset_type == 'model':
                    asset_type = '3d'
            
            # Handle tags from the request
            tags = self.request.data.get('tags', [])
            
            # Save Asset with user
            instance = serializer.save(
                product=product,
                uploaded_by=self.request.user,
                organization=product.organization,
                asset_type=asset_type,
                tags=tags
            )
            
            return instance
        except Exception as e:
            raise ValidationError({"error": str(e)})

    def perform_update(self, serializer):
        """Update an asset, handling tags if they're provided"""
        # Get the existing tags if not provided
        if 'tags' not in serializer.validated_data:
            instance = serializer.instance
            serializer.save(tags=instance.tags)
        else:
            serializer.save()
            
        instance = serializer.instance
        was_archived = instance.is_archived
        updated_instance = serializer.save()
        # If asset is now archived and wasn't before, delete any bundles containing it
        if not was_archived and updated_instance.is_archived:
            from .models import AssetBundle
            bundles = AssetBundle.objects.filter(assets=updated_instance)
            bundles_deleted = bundles.count()
            bundles.delete()
            if bundles_deleted:
                print(f"Deleted {bundles_deleted} asset bundle(s) because asset {updated_instance.id} was archived.")
        return updated_instance

    def perform_destroy(self, instance):
        """Record event and delete asset"""
        try:
            product = Product.objects.get(pk=self.kwargs["product_pk"])
            
            # Record asset deletion event
            record(
                product=product,
                user=self.request.user,
                event_type="asset_removed",
                summary=f"Asset '{instance.name or 'file'}' was removed from product '{product.name}'",
                payload={
                    "asset_id": instance.id,
                    "asset_type": instance.asset_type,
                    "file_name": instance.name or "unknown"
                }
            )
            
            # Then proceed with deletion
            super().perform_destroy(instance)
        except Exception as e:
            raise ValidationError({"detail": f"Error deleting asset: {str(e)}"})

    # -------- custom actions ---------------------------------

    @action(detail=False, methods=["post"])
    def reorder(self, request, product_pk=None):
        """POST body: [{id: 3, order: 1}, …]"""
        for item in request.data:
            ProductAsset.objects.filter(pk=item["id"], product_id=product_pk)\
                                .update(order=item["order"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def set_primary(self, request, pk=None, product_pk=None):
        try:
            with transaction.atomic():
                # Unset all current primary assets
                ProductAsset.objects.filter(product_id=product_pk).update(is_primary=False)

                # Set this asset as primary
                asset = (
                    ProductAsset.objects
                    .select_for_update()
                    .get(pk=pk, product_id=product_pk)
                )
                asset.is_primary = True
                asset.save(update_fields=['is_primary'])

                # Return the full updated product with assets
                product = Product.objects.get(pk=product_pk)
                serializer = ProductSerializer(product, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)

        except ProductAsset.DoesNotExist:
            return Response(
                {"detail": f"Asset {pk} not found for product {product_pk}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request, product_pk=None):
        asset_ids = request.data.get('asset_ids', [])
        is_archived = request.data.get('is_archived', None)
        content_types = request.data.get('content_types', [])
        if not isinstance(asset_ids, list) or is_archived is None:
            return Response({'error': 'asset_ids (list) and is_archived (bool) are required.'}, status=400)
        assets = ProductAsset.objects.filter(product_id=product_pk, id__in=asset_ids)
        for i, asset in enumerate(assets):
            asset.is_archived = is_archived
            if content_types and i < len(content_types):
                asset.content_type = content_types[i]
            asset.save(update_fields=['is_archived', 'content_type'])
        return Response({'updated': len(assets)}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, product_pk=None, pk=None):
        from django.http import FileResponse, StreamingHttpResponse, Http404
        import os, io, zipfile, hashlib
        from django.utils.http import http_date
        from django.shortcuts import get_object_or_404
        from .models import Product, AssetBundle, ProductAsset
        from rest_framework.response import Response
        from rest_framework import status

        # Defensive: handle missing user
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)

        # Try ProductAsset first (single asset download)
        asset = ProductAsset.objects.filter(pk=pk, product_id=product_pk).first()
        if asset:
            product = asset.product
            if not (request.user.is_staff or product.created_by == request.user):
                return Response({'detail': 'Forbidden'}, status=403)
            file_handle = asset.file.open('rb')
            response = FileResponse(file_handle, content_type=asset.content_type or 'application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{asset.name or asset.file.name}"'
            return response

        # Try AssetBundle (bundle download)
        product = get_object_or_404(Product, pk=product_pk)
        bundle = AssetBundle.objects.filter(pk=pk, product=product).first()
        if bundle:
            if not (request.user.is_staff or product.created_by == request.user):
                return Response({'detail': 'Forbidden'}, status=403)
            bundle_file = getattr(bundle, 'file', None)
            if bundle_file and hasattr(bundle_file, 'path') and os.path.exists(bundle_file.path):
                file_path = bundle_file.path
                stat = os.stat(file_path)
                etag = hashlib.md5(f'{stat.st_mtime}-{stat.st_size}'.encode()).hexdigest()
                last_modified = http_date(stat.st_mtime)
                if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
                if_modified_since = request.META.get('HTTP_IF_MODIFIED_SINCE')
                if if_none_match == etag or (if_modified_since and if_modified_since == last_modified):
                    return Response(status=304)
                range_header = request.META.get('HTTP_RANGE')
                response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=os.path.basename(file_path))
                response['Content-Type'] = 'application/zip'
                response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                response['ETag'] = etag
                response['Last-Modified'] = last_modified
                if range_header:
                    try:
                        start, end = 0, stat.st_size - 1
                        units, rng = range_header.split('=')
                        if units == 'bytes':
                            start_end = rng.split('-')
                            if start_end[0]:
                                start = int(start_end[0])
                            if len(start_end) > 1 and start_end[1]:
                                end = int(start_end[1])
                            length = end - start + 1
                            response.status_code = 206
                            response['Content-Range'] = f'bytes {start}-{end}/{stat.st_size}'
                            response['Content-Length'] = str(length)
                            response.streaming_content = (open(file_path, 'rb').read()[start:end+1] for _ in range(1))
                    except Exception:
                        pass
                return response
            # Otherwise, generate ZIP on the fly from assets
            assets = bundle.assets.all()
            if not assets:
                return Response({'detail': 'No assets in bundle'}, status=404)
            def zip_generator():
                with io.BytesIO() as mem_zip:
                    with zipfile.ZipFile(mem_zip, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
                        for asset in assets:
                            file_field = asset.file
                            if not file_field or not file_field.name:
                                continue
                            file_path = file_field.path
                            if not os.path.exists(file_path):
                                continue
                            arcname = asset.name or os.path.basename(file_path)
                            try:
                                with open(file_path, 'rb') as f:
                                    zf.writestr(arcname, f.read())
                            except Exception:
                                continue
                    mem_zip.seek(0)
                    while True:
                        chunk = mem_zip.read(8192)
                        if not chunk:
                            break
                        yield chunk
            zip_filename = f'bundle-{bundle.id}-assets.zip'
            response = StreamingHttpResponse(zip_generator(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            if hasattr(bundle, 'updated_at'):
                response['Last-Modified'] = http_date(bundle.updated_at.timestamp())
                response['ETag'] = hashlib.md5(f'{bundle.updated_at.timestamp()}-{bundle.id}'.encode()).hexdigest()
            return response

        # If neither asset nor bundle found
        return Response({'detail': 'Not found'}, status=404)

    @action(detail=True, methods=['get'], url_path='download-asset')
    def download_asset(self, request, product_pk=None, pk=None):
        from django.http import FileResponse, Http404
        from .models import ProductAsset
        from rest_framework.response import Response

        # Defensive: handle missing user
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)

        # Fetch the asset directly, including archived if needed
        asset = get_object_or_404(ProductAsset, pk=pk, product_id=product_pk)

        # Optional: check permissions here (e.g., only owner or staff)
        product = asset.product
        if not (request.user.is_staff or product.created_by == request.user):
            return Response({'detail': 'Forbidden'}, status=403)

        file_handle = asset.file.open('rb')
        response = FileResponse(file_handle, content_type=asset.content_type or 'application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{asset.name or asset.file.name}"'
        return response

    @action(detail=False, methods=['post'], url_path='bulk-download')
    def bulk_download(self, request, product_pk=None):
        from django.http import StreamingHttpResponse
        import io, zipfile, os
        from rest_framework.response import Response
        from rest_framework import status
        from .models import ProductAsset, Product
        from django.utils.http import http_date
        import hashlib

        # Defensive: handle missing user
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            return Response({'detail': 'Authentication required'}, status=401)

        asset_ids = request.data.get('asset_ids')
        if not isinstance(asset_ids, list) or not all(isinstance(i, int) for i in asset_ids):
            return Response({'detail': 'asset_ids (list of ints) required'}, status=400)

        # Fetch assets, including archived if needed
        assets = ProductAsset.objects.filter(product_id=product_pk, pk__in=asset_ids)
        if not assets.exists():
            return Response({'detail': 'No assets found'}, status=404)

        # Permission: all assets must belong to the product and user must own the product or be staff
        product = assets.first().product
        if not (request.user.is_staff or product.created_by == request.user):
            return Response({'detail': 'Forbidden'}, status=403)

        def zip_generator():
            with io.BytesIO() as mem_zip:
                with zipfile.ZipFile(mem_zip, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
                    for asset in assets:
                        file_field = asset.file
                        if not file_field or not file_field.name:
                            continue
                        file_path = file_field.path
                        if not os.path.exists(file_path):
                            continue
                        arcname = asset.name or os.path.basename(file_path)
                        try:
                            with open(file_path, 'rb') as f:
                                zf.writestr(arcname, f.read())
                        except Exception:
                            continue
                mem_zip.seek(0)
                while True:
                    chunk = mem_zip.read(8192)
                    if not chunk:
                        break
                    yield chunk
        zip_filename = f'assets-bulk-download-{product_pk}.zip'
        response = StreamingHttpResponse(zip_generator(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
        response['Last-Modified'] = http_date(product.updated_at.timestamp()) if hasattr(product, 'updated_at') else http_date(product.created_at.timestamp())
        response['ETag'] = hashlib.md5(f'{product_pk}-{len(asset_ids)}-{zip_filename}'.encode()).hexdigest()
        return response

class ProductEventViewSet(OrganizationQuerySetMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ProductEventSerializer
    pagination_class = PageNumberPagination
    queryset = ProductEvent.objects.all()
    
    def get_permissions(self):
        """
        Only need product.view permission to see product events
        """
        from .permissions import HasProductViewPermission
        return [HasProductViewPermission()]

    def get_queryset(self):
        from django.utils.dateparse import parse_date
        
        # Get base queryset from parent and filter by product
        qs = super().get_queryset().filter(product_id=self.kwargs.get('product_pk'))
        
        # Ensure we bring in the user record
        qs = qs.select_related('created_by')
        
        # Get query parameters
        p = self.request.query_params
        
        # 1) Filter by event_type
        if et := p.get('event_type'):
            qs = qs.filter(event_type=et)
            
        # 2) Filter by who changed it
        if cb := p.get('created_by'):
            qs = qs.filter(created_by_id=cb)
            
        # 3) Date range on the date part of created_at
        if df := p.get('date_from'):
            if d := parse_date(df):
                qs = qs.filter(created_at__date__gte=d)
                
        if dt := p.get('date_to'):
            if d := parse_date(dt):
                qs = qs.filter(created_at__date__lte=d)
                
        # Return events ordered by most recent first
        return qs.order_by('-created_at')
        
    @action(detail=True, methods=['post'], url_path='rollback')
    def rollback(self, request, product_pk=None, pk=None):
        """
        Rollback a specific product field to its previous value from a history event.
        
        Expects a JSON payload with a 'field' parameter specifying which field to rollback.
        Returns the updated product after the rollback operation.
        
        Example:
            POST /api/products/42/history/123/rollback/
            Body: { "field": "price" }
        """
        from .events import record
        from .serializers import ProductSerializer
        from decimal import Decimal
        
        # Get the event to roll back from
        try:
            event = self.get_object()
        except ProductEvent.DoesNotExist:
            return Response(
                {"error": "Event not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get the field to rollback from the request
        field = request.data.get('field')
        if not field:
            return Response(
                {"error": "Missing 'field' parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate the event payload has changes for the specified field
        if not event.payload or not isinstance(event.payload, dict):
            return Response(
                {"error": "Event has no valid payload"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        changes = event.payload.get('changes', {})
        if field not in changes or not isinstance(changes[field], dict):
            return Response(
                {"error": f"No changes found for field '{field}' in this event"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if 'old' not in changes[field]:
            return Response(
                {"error": f"No previous value found for field '{field}'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the product
        try:
            product = Product.objects.get(pk=product_pk)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get the old value to restore
        old_value = changes[field]['old']
        current_value = getattr(product, field, None)
        
        # Handle type conversions for different field types
        try:
            if field == 'price':
                # Handle price rollback - find the base price from pricing table
                from .models import ProductPrice
                base_price = product.prices.filter(price_type__code='base').first()
                if base_price:
                    # Convert old price value to Decimal
                    if isinstance(old_value, (int, float)):
                        old_decimal = Decimal(str(old_value))
                    else:
                        old_decimal = Decimal(old_value)
                    
                    # Update the price
                    base_price.amount = old_decimal
                    base_price.save()
                    
                    # Create a new event for the rollback
                    record(
                        product=product,
                        user=request.user,
                        event_type="rollback",
                        summary=f"Rolled back price to {old_value}",
                        payload={
                            "restored_field": field,
                            "restored_from_event": event.id,
                            "old": float(base_price.amount),  # Current value before rollback
                            "new": float(old_decimal)  # Restored value
                        }
                    )
                else:
                    return Response(
                        {"error": "No base price found for this product"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif field == 'category':
                # Handle category rollback - need to restore the Category object
                from .models import Category
                
                # Skip if the values are already the same
                if str(current_value) == str(old_value):
                    return Response(
                        {"error": f"Field '{field}' already has the value '{old_value}'"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # If old_value is None or empty, set to None
                if old_value is None or old_value == '':
                    category = None
                else:
                    # Try to find the category by ID or name
                    try:
                        # First try by ID
                        if isinstance(old_value, int) or (isinstance(old_value, str) and old_value.isdigit()):
                            category = Category.objects.filter(
                                organization=product.organization, 
                                id=int(old_value)
                            ).first()
                        else:
                            # Then try by name
                            category = Category.objects.filter(
                                organization=product.organization, 
                                name=old_value
                            ).first()
                            
                        if not category:
                            return Response(
                                {"error": f"Category '{old_value}' not found"}, 
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    except (ValueError, TypeError) as e:
                        return Response(
                            {"error": f"Invalid category value: {str(e)}"}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Set the category
                setattr(product, field, category)
                product.save(update_fields=[field])
                
                # Create a new event for the rollback
                record(
                    product=product,
                    user=request.user,
                    event_type="rollback",
                    summary=f"Rolled back category to {old_value}",
                    payload={
                        "restored_field": field,
                        "restored_from_event": event.id,
                        "old": str(current_value),
                        "new": str(old_value)
                    }
                )
            elif field == 'is_active':
                # Handle boolean fields
                if isinstance(old_value, str):
                    old_bool = old_value.lower() in ('true', 't', 'yes', 'y', '1')
                else:
                    old_bool = bool(old_value)
                    
                # Skip if the values are already the same
                if current_value == old_bool:
                    return Response(
                        {"error": f"Field '{field}' already has the value '{old_value}'"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set the field value
                setattr(product, field, old_bool)
                product.save(update_fields=[field])
                
                # Create a new event for the rollback
                record(
                    product=product,
                    user=request.user,
                    event_type="rollback",
                    summary=f"Rolled back {field} to {old_bool}",
                    payload={
                        "restored_field": field,
                        "restored_from_event": event.id,
                        "old": current_value,
                        "new": old_bool
                    }
                )
            # Handle nested price properties (amount, currency, price_type)
            elif field in ("amount", "currency", "price_type"):
                from prices.models import ProductPrice, Currency, PriceType
                
                # Find the base price record
                base_price = ProductPrice.objects.filter(product=product, price_type__code="base").first()
                if not base_price:
                    return Response({"error":"No base price record to rollback"}, status=status.HTTP_400_BAD_REQUEST)
                
                # Extract the old value from the event payload
                old_val = changes[field]["old"]
                
                # Apply the old value to the appropriate attribute
                if field == "amount":
                    base_price.amount = Decimal(str(old_val))
                elif field == "currency":
                    base_price.currency = Currency.objects.get(iso_code=old_val)
                else:  # price_type
                    base_price.price_type = PriceType.objects.get(code=old_val)
                
                base_price.save()
                
                # Record a rollback event for this nested change
                record(
                    product=product,
                    user=request.user,
                    event_type="rollback",
                    summary=f"Rolled back price.{field} to {old_val}",
                    payload={
                        "restored_field": field,
                        "restored_from_event": event.id,
                        "old": changes[field]["new"],
                        "new": old_val
                    }
                )
                
                product.refresh_from_db()
                serializer = ProductSerializer(product, context={"request":request})
                return Response(serializer.data)
            else:
                # Handle general fields
                # Skip if the values are already the same
                if current_value == old_value:
                    return Response(
                        {"error": f"Field '{field}' already has the value '{old_value}'"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set the field value
                setattr(product, field, old_value)
                product.save(update_fields=[field])
                
                # Create a new event for the rollback
                record(
                    product=product,
                    user=request.user,
                    event_type="rollback",
                    summary=f"Rolled back {field} to {old_value}",
                    payload={
                        "restored_field": field,
                        "restored_from_event": event.id,
                        "old": current_value,
                        "new": old_value
                    }
                )
                
            # Refresh the product to get the updated data
            product.refresh_from_db()
            
            # Return the updated product
            serializer = ProductSerializer(product, context={'request': request})
            return Response(serializer.data)
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error during rollback: {str(e)}", exc_info=True)
            return Response(
                {"error": f"Failed to rollback: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# SKU Check API View - Added to solve the duplicate SKU issue
class SkuCheckAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    class _Input(serializers.Serializer):
        skus = serializers.ListField(
            child=serializers.CharField(max_length=50), allow_empty=False
        )

    def post(self, request, *args, **kwargs):
        try:
            # Validate input data
            data = self._Input(data=request.data)
            data.is_valid(raise_exception=True)
            
            uploaded_skus = list(set(data.validated_data["skus"]))
            
            # Filter by user instead of organization
            existing = (
                Product.objects
                .filter(created_by=request.user, sku__in=uploaded_skus)
                .values_list("sku", flat=True)
            )
                
            return Response({"duplicates": list(existing)})
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in SkuCheckAPIView.post: {str(e)}", exc_info=True)
            return Response(
                {"duplicates": [], "error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def get(self, request, *args, **kwargs):
        try:
            # Check for skus parameter
            skus_param = request.query_params.get('skus', None)
            if not skus_param:
                return Response(
                    {"error": "Missing 'skus' parameter"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Parse the skus parameter (could be comma-separated or a list)
            if isinstance(skus_param, list):
                uploaded_skus = skus_param
            else:
                uploaded_skus = [sku.strip() for sku in skus_param.split(',')]
                
            if not uploaded_skus:
                return Response(
                    {"error": "Empty 'skus' parameter"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Filter by user instead of organization
            existing = (
                Product.objects
                .filter(created_by=request.user, sku__in=uploaded_skus)
                .values_list("sku", flat=True)
            )
                
            return Response({"duplicates": list(existing)})
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in SkuCheckAPIView.get: {str(e)}", exc_info=True)
            return Response(
                {"duplicates": [], "error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AssetBundleViewSet(viewsets.ModelViewSet):
    serializer_class = AssetBundleSerializer

    def get_queryset(self):
        return AssetBundle.objects.filter(product_id=self.kwargs['product_pk'])

    def perform_create(self, serializer):
        # Attach product from URL
        product_id = self.kwargs['product_pk']
        serializer.save(product_id=product_id)

    @action(detail=True, methods=['get'])
    def download(self, request, product_pk=None, pk=None):
        from django.http import StreamingHttpResponse
        import io, zipfile, os, hashlib
        from django.utils.http import http_date
        bundle = self.get_object()
        assets = bundle.assets.all()
        if not assets:
            return Response({'detail': 'No assets in bundle'}, status=404)
        def zip_generator():
            with io.BytesIO() as mem_zip:
                with zipfile.ZipFile(mem_zip, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
                    for asset in assets:
                        file_field = asset.file
                        if not file_field or not file_field.name:
                            continue
                        file_path = file_field.path
                        if not os.path.exists(file_path):
                            continue
                        arcname = asset.name or os.path.basename(file_path)
                        try:
                            with open(file_path, 'rb') as f:
                                zf.writestr(arcname, f.read())
                        except Exception:
                            continue
                mem_zip.seek(0)
                while True:
                    chunk = mem_zip.read(8192)
                    if not chunk:
                        break
                    yield chunk
        zip_filename = f'bundle-{bundle.id}-assets.zip'
        response = StreamingHttpResponse(zip_generator(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
        if hasattr(bundle, 'updated_at'):
            response['Last-Modified'] = http_date(bundle.updated_at.timestamp())
            response['ETag'] = hashlib.md5(f'{bundle.updated_at.timestamp()}-{bundle.id}'.encode()).hexdigest()
        return response

    def destroy(self, request, *args, **kwargs):
        bundle = self.get_object()
        bundle.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

def serialize_field(value):
    # Protect against empty FileFields
    try:
        if hasattr(value, 'url'):
            return value.url
    except ValueError:
        # no file associated
        return None

    # Model instances → use their .name (or str())
    from django.db.models import Model
    if isinstance(value, Model):
        return getattr(value, 'name', str(value))

    # Dicts (e.g. your nested serializers)
    if isinstance(value, dict):
        return value.get('name') or value.get('title') or str(value)

    # Everything else (primitives)
    return value
