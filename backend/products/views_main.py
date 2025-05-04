from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
import sys

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
    from .models import Product, ProductImage, ProductRelation, ProductAsset, ProductEvent
from .serializers import (
    ProductSerializer, 
    ProductImageSerializer, 
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
    ordering_fields = ['name', 'created_at', 'price', 'brand']
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
        elif self.action in ['update', 'partial_update', 'upload_image', 'manage_image', 'reorder_images', 'bulk_update']:
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
        user = self.request.user
        if not user.is_authenticated:
            return Product.objects.none()
            
        # Staff see everything
        if user.is_staff:
            qs = Product.objects.all()
        else:
            # Regular users only see their own products
            qs = Product.objects.filter(created_by=user)
            
        # Additional filters from query parameters
        category = self.request.query_params.get('category')
        brand = self.request.query_params.get('brand')
        is_active = self.request.query_params.get('is_active')
        
        if category:
            qs = qs.filter(category=category)
        if brand:
            qs = qs.filter(brand=brand)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            qs = qs.filter(is_active=is_active_bool)
        
        # Filter out archived products
        return qs.filter(is_archived=False).prefetch_related('images')

    def perform_create(self, serializer):
        """
        Set the created_by field to the current user when creating a product.
        Avoid using organization to prevent UUID conversion issues.
        """
        try:
            # Create the product with just the user
            product = serializer.save(
                created_by=self.request.user
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
                except Exception as e:
                    print(f"Error recording product creation: {str(e)}")
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            # Re-raise to let DRF handle the response
            raise

    def perform_update(self, serializer):
        """
        Record the update event when a product is updated.
        Avoid using organization to prevent UUID conversion issues.
        """
        try:
            # Get the old product before update
            old_product = self.get_object()
            old_data = {
                "name": old_product.name,
                "price": float(old_product.price),
                "sku": old_product.sku,
                "category": old_product.category,
                "is_active": old_product.is_active
            }
            
            # Save the updated product without modifying organization
            product = serializer.save()
            
            # Collect changes
            changes = {}
            if old_product.name != product.name:
                changes["name"] = {"old": old_product.name, "new": product.name}
            if float(old_product.price) != float(product.price):
                changes["price"] = {"old": float(old_product.price), "new": float(product.price)}
            if old_product.sku != product.sku:
                changes["sku"] = {"old": old_product.sku, "new": product.sku}
            if old_product.category != product.category:
                changes["category"] = {"old": old_product.category, "new": product.category}
            if old_product.is_active != product.is_active:
                changes["is_active"] = {"old": old_product.is_active, "new": product.is_active}
            
            if changes:
                try:
                    # Record product update event
                    record(
                        product=product,
                        user=self.request.user,
                        event_type="updated",
                        summary=f"Product '{product.name}' was updated",
                        payload={
                            "changes": changes,
                            "old_data": old_data,
                        }
                    )
                except Exception as e:
                    print(f"Error recording product update: {str(e)}")
        except Exception as e:
            print(f"Error in perform_update: {str(e)}")
            # Re-raise to let DRF handle the response
            raise

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
        
        total_value = queryset.aggregate(
            total=Coalesce(Sum('price'), Decimal('0.00'))
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
        POST: Create a new category by adding a product with that category.
        """
        if request.method == 'GET':
            queryset = self.get_queryset()
            categories = queryset.values_list('category', flat=True).distinct().order_by('category')
            # Filter out None values
            categories = [c for c in categories if c]
            return Response(categories)
        
        elif request.method == 'POST':
            # For POST, create a minimal product with the new category
            category_name = request.data.get('category')
            if not category_name:
                return Response(
                    {"error": "Category name is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Create a temporary product with this category
            # We generate a random SKU with timestamp to avoid conflicts
            import time
            from random import randint
            temp_sku = f"temp-cat-{int(time.time())}-{randint(1000, 9999)}"
            
            product_data = {
                "name": f"Category Placeholder: {category_name}",
                "sku": temp_sku,
                "price": 0.01,
                "category": category_name,
                "is_active": False  # Make it inactive so it doesn't appear in regular products
            }
            
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                self.perform_create(serializer)
                # Return the category name with success status
                return Response(
                    {"id": serializer.data['id'], "category": category_name},
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(
                    {"error": "Failed to create category", "details": serializer.errors},
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
            
        created_products = []
        errors = []
        
        for index, product_data in enumerate(products_data):
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                serializer.save(created_by=request.user)
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
                    # Get existing tags
                    existing_tags = []
                    if product.tags:
                        try:
                            existing_tags = json.loads(product.tags)
                            if not isinstance(existing_tags, list):
                                existing_tags = []
                        except json.JSONDecodeError:
                            existing_tags = []
                    
                    # Add new tags (avoid duplicates)
                    for tag in tags:
                        if tag not in existing_tags:
                            existing_tags.append(tag)
                    
                    # Update the product
                    product.tags = json.dumps(existing_tags)
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
                            "added_tags": tags,
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

    # --- NEW Image Upload Action ---
    @csrf_exempt
    @action(detail=True, methods=['post'], url_path='images',
            parser_classes=[MultiPartParser, FormParser]) # Specify parsers for this action
    def upload_image(self, request, pk=None):
        product = self.get_object() # Checks user permission via get_queryset
        if 'image' not in request.FILES:
            return Response({'detail': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if product.images.count() >= 10: # Example limit
            return Response({'detail': 'Maximum number of images reached (10).'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine order (append to end)
        last_order = product.images.aggregate(models.Max('order')).get('order__max')
        current_order = 0 if last_order is None else last_order + 1

        # Set first image as primary if none exists
        is_first_image = not product.images.exists()

        # Use request.data and update order/is_primary
        data = request.data.copy()
        data['order'] = current_order
        data['is_primary'] = is_first_image

        serializer = ProductImageSerializer(data=data, context=self.get_serializer_context())
        if serializer.is_valid():
            serializer.save(product=product) # Explicitly pass product instance
            # Return the full product data with updated images
            product_serializer = self.get_serializer(product)
            return Response(product_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- NEW Manage Specific Image Action ---
    @csrf_exempt
    @action(detail=True, methods=['patch', 'delete'], url_path='images/(?P<image_pk>[^/.]+)')
    def manage_image(self, request, pk=None, image_pk=None):
        product = self.get_object() # Checks permissions
        try:
            image_instance = ProductImage.objects.get(product=product, pk=image_pk)
        except ProductImage.DoesNotExist:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            # TODO: Optionally delete file from storage before deleting model instance
            # image_instance.image.delete(save=False) # Example
            image_instance.delete()
            # If the deleted image was primary, try set another one as primary
            if image_instance.is_primary:
                 first_remaining = product.images.order_by('order').first()
                 if first_remaining:
                     first_remaining.is_primary = True
                     first_remaining.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if request.method == 'PATCH':
            # Only handle setting primary for now via PATCH
            if 'is_primary' in request.data and request.data['is_primary'] is True:
                with transaction.atomic():
                    product.images.update(is_primary=False) # Unset others first
                    image_instance.is_primary = True
                    image_instance.save(update_fields=['is_primary'])
                # Return updated product data
                product_serializer = self.get_serializer(product)
                return Response(product_serializer.data)
            else:
                # If other fields need patching, use serializer:
                # serializer = ProductImageSerializer(instance=image_instance, data=request.data, partial=True, context=self.get_serializer_context())
                # if serializer.is_valid():
                #     serializer.save()
                #     return Response(serializer.data)
                # return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                 return Response({'detail': 'Only setting primary image is supported via PATCH here.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Method not allowed for this action.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    # --- NEW Reorder Images Action ---
    @csrf_exempt
    @action(detail=True, methods=['patch'], url_path='images/reorder', url_name='reorder_images')
    def reorder_images(self, request, pk=None):
        product = self.get_object()
        image_data = request.data.get('images', []) # Expecting [{id: 1, order: 0}, {id: 2, order: 1}]

        if not isinstance(image_data, list):
             return Response({'detail': 'Invalid data format. Expected a list of images.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate IDs received match existing images
        current_image_ids = set(product.images.values_list('id', flat=True))
        received_image_ids = set(item.get('id') for item in image_data if item.get('id') is not None)

        if received_image_ids != current_image_ids:
             return Response({'detail': 'Mismatch between provided image IDs and existing images.', 'provided': list(received_image_ids), 'existing': list(current_image_ids) }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic(): # Ensure all updates succeed or fail together
                for index, item in enumerate(image_data):
                    image_id = item.get('id')
                    # Update order based on the list index received from frontend
                    ProductImage.objects.filter(product=product, id=image_id).update(order=index)
            
            product.refresh_from_db() # Refetch to get updated image order
            serializer = self.get_serializer(product)
            return Response(serializer.data)
        except Exception as e:
             print(f"Error during image reorder: {e}")
             return Response({'detail': 'Failed to update image order.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                            tags = json.loads(product.tags)
                            if isinstance(tags, list):
                                all_tags.update(tags)
                        except json.JSONDecodeError:
                            pass
                        except Exception as e:
                            print(f"Error parsing tags for product {product.id}: {str(e)}")
                
                # Filter tags by search term if provided
                search_term = request.query_params.get('search', '').lower()
                if search_term:
                    filtered_tags = [tag for tag in all_tags if search_term in tag.lower()]
                    return Response(sorted(filtered_tags))
                
                return Response(sorted(all_tags))
            
            elif request.method == 'POST':
                # Get the tag name from request data
                tag_name = request.data.get('name')
                if not tag_name:
                    return Response(
                        {"error": "Tag name is required"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # First check if this tag already exists in any product
                queryset = self.get_queryset()
                for product in queryset:
                    if product.tags:
                        try:
                            tags = json.loads(product.tags)
                            if isinstance(tags, list) and tag_name in tags:
                                # Tag already exists, return it
                                return Response(tag_name, status=status.HTTP_200_OK)
                        except json.JSONDecodeError:
                            pass
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

    @action(detail=True, methods=['get'], url_path='related-list')
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
        if product.category and product.category.strip():
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
                
            # If we still need more, try case-insensitive search
            if len(combined_products) < 5:
                # Look for more products with case-insensitive category
                case_insensitive_matches = base_queryset.filter(
                    category__iexact=product.category,
                    is_active=True
                ).exclude(pk__in=[p.id for p in combined_products])
                
                # Add to our list, up to 5 total
                combined_products.extend(case_insensitive_matches[:5-len(combined_products)])
                
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
                fields = ['id', 'related_product_id', 'relationship_type', 'is_pinned', 'created_at']
                
        serializer = RelationSerializer(relations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-primary')
    def set_asset_primary(self, request, pk=None, product_pk=None):
        """
        Set an asset as primary
        """
        try:
            product = Product.objects.get(pk=product_pk)
            
            try:
                asset_id = request.data.get('asset_id')
                if not asset_id:
                    return Response({'detail': 'Asset ID is required'}, status=status.HTTP_400_BAD_REQUEST)
                
                asset = ProductAsset.objects.get(pk=asset_id, product=product)
                
                # First, unset primary for all other assets
                ProductAsset.objects.filter(product=product, is_primary=True).update(is_primary=False)
                
                # Set this asset as primary
                asset.is_primary = True
                asset.save()
                
                return Response({'detail': 'Asset set as primary successfully'}, status=status.HTTP_200_OK)
                
            except ProductAsset.DoesNotExist:
                return Response({'detail': 'Asset not found'}, status=status.HTTP_404_NOT_FOUND)
            except ValueError:
                return Response({'detail': 'Invalid asset ID format'}, status=status.HTTP_400_BAD_REQUEST)
            
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            
            # Calculate inventory value without using stock
            inventory_value = queryset.aggregate(
                total=Coalesce(Sum('price'), Decimal('0.00'))
            )['total']
            
            # Convert Decimal to float to avoid serialization issues
            inventory_value = float(inventory_value)
            
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
                'inventory_value': inventory_value,
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
            current_value = queryset.aggregate(
                total=Coalesce(Sum('price'), Decimal('0.00'))
            )['total']
            
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
    
    def get_permissions(self):
        """
        Return permissions based on the action:
        - list, retrieve: product.view permission
        - create, update, destroy: product.change permission
        """
        from .permissions import HasProductViewPermission, HasProductChangePermission
        
        if self.action in ['list', 'retrieve']:
            return [HasProductViewPermission()]
        else:
            return [HasProductChangePermission()]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(product_id=self.kwargs.get('product_pk'))
        
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context.update({
            'product_id': self.kwargs.get('product_pk')
        })
        return context

    def perform_create(self, serializer):
        try:
            product = Product.objects.get(pk=self.kwargs["product_pk"])
            
            # Check if file field exists in request
            if 'file' not in self.request.data and 'file' not in self.request.FILES:
                raise ValidationError({"file": "No file was submitted"})
            
            # Check if file is empty
            file_data = self.request.data.get('file') or self.request.FILES.get('file')
            if not file_data:
                raise ValidationError({"file": "The submitted file is empty"})
            
            # Save the asset without organization reference
            asset = serializer.save(
                product=product,
                uploaded_by=self.request.user
            )
            
            # Record asset creation event
            record(
                product=product,
                user=self.request.user,
                event_type="asset_added",
                summary=f"Asset '{file_data.name if hasattr(file_data, 'name') else 'file'}' was added to product '{product.name}'",
                payload={
                    "asset_id": asset.id,
                    "asset_type": asset.asset_type,
                    "file_name": file_data.name if hasattr(file_data, 'name') else "unknown"
                }
            )
            
        except Product.DoesNotExist:
            raise ValidationError({"product": f"Product with ID {self.kwargs.get('product_pk')} does not exist"})
        except Exception as e:
            if hasattr(e, '__class__') and e.__class__.__name__ == 'ValidationError':
                raise  # Re-raise ValidationError as is
            raise ValidationError({"detail": str(e)})

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
        # First update the is_primary status in all assets
        ProductAsset.objects.filter(product_id=product_pk).update(is_primary=False)
        
        # Get the asset that's being set as primary
        try:
            asset = ProductAsset.objects.get(pk=pk, product_id=product_pk)
            
            # Update this asset as primary
            asset.is_primary = True
            asset.save()
            
            # Now update the parent Product model with this asset's file
            if asset.file:
                product = Product.objects.get(pk=product_pk)
                
                # Update just the primary_image field
                product.primary_image = asset.file
                product.save()
                
                # Log success message
                print(f"Updated product {product_pk} primary image to: {asset.file.url if hasattr(asset.file, 'url') else str(asset.file)}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except ProductAsset.DoesNotExist:
            return Response(
                {"error": f"Asset with ID {pk} does not exist for product {product_pk}"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Product.DoesNotExist:
            return Response(
                {"error": f"Product with ID {product_pk} does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to set primary asset: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        qs = super().get_queryset()
        return qs.filter(product_id=self.kwargs.get('product_pk'))

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
