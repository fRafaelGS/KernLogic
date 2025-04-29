from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, ProductImage, ProductRelation, ProductAsset
from .serializers import (
    ProductSerializer, 
    ProductImageSerializer, 
    ProductStatsSerializer,
    DashboardSummarySerializer, 
    InventoryTrendSerializer, 
    ActivitySerializer,
    ProductRelationSerializer,
    ProductAssetSerializer
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

User = get_user_model()

# Create your views here.

@method_decorator(csrf_exempt, name='dispatch')
class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product data.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'sku', 'description', 'brand', 'tags', 'barcode']
    ordering_fields = ['name', 'created_at', 'price', 'brand']
    ordering = ['-created_at']
    renderer_classes = [JSONRenderer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """
        Filter products to return only those created by the current user.
        Allow additional filtering by query parameters.
        """
        qs = Product.objects.all()
        
        # Apply user filter if not staff/admin
        if not self.request.user.is_staff:
            qs = qs.filter(created_by=self.request.user)
            
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
            
        # Always bring images in one query to avoid extra hits in serializer
        return qs.prefetch_related('images')

    def perform_create(self, serializer):
        """
        Set the created_by field to the current user when creating a product.
        """
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        """
        Permanently delete the product instead of soft deleting it
        """
        # Actually delete the product from the database
        instance.delete()

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
        # Find all products that are placeholders (name starts with "Category Placeholder:" and is_active=False)
        placeholders = Product.objects.filter(
            name__startswith="Category Placeholder:",
            is_active=False
        )
        
        count = placeholders.count()
        # Delete them physically (not just soft delete)
        placeholder_ids = list(placeholders.values_list('id', flat=True))
        placeholders.delete()
        
        return Response({
            'message': f'Successfully deleted {count} category placeholder products',
            'deleted_ids': placeholder_ids
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'])
    def tags(self, request):
        """
        GET: Return a list of unique tags from all products.
        POST: Create a new tag by adding it to a "tag repository" product or returning an existing tag.
        """
        if request.method == 'GET':
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
            
            # If tag doesn't exist, create it by adding to a special "tag repository" product
            # or just return the new tag name
            return Response(tag_name, status=status.HTTP_201_CREATED)

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
        from rest_framework import serializers
        
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
    permission_classes = [permissions.IsAuthenticated]
    
    def get_company_id(self, request):
        """
        Get company ID from user (in a real app, this would come from the auth context)
        For now, we'll use the user's ID as a proxy for company ID
        """
        print(f"DEBUG: DashboardViewSet.get_company_id() called - User: {request.user}")
        if not request.user or not request.user.is_authenticated:
            print(f"DEBUG: User not authenticated in DashboardViewSet.get_company_id()")
            return None
        return request.user.id

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
        company_id = self.get_company_id(request)
        if not company_id:
            print(f"DEBUG: No company_id found in summary()")
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get queryset of products for this company
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
        
        serializer = DashboardSummarySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
    
    @action(detail=False, methods=['get'])
    def inventory_trend(self, request):
        """
        Return inventory value trend data for a given time range
        """
        company_id = self.get_company_id(request)
        
        # Get time range from query params (default to 30 days)
        range_days = request.query_params.get('range', '30')
        try:
            range_days = int(range_days)
            if range_days not in [30, 60, 90]:
                range_days = 30  # Default to 30 if invalid
        except ValueError:
            range_days = 30
        
        # Calculate date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=range_days)
        
        # Get products for this company
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
    
    @action(detail=False, methods=['get'])
    def activity(self, request):
        """
        Return recent activity data (limit 10)
        """
        print(f"DEBUG: DashboardViewSet.activity() called - User: {request.user}, Authenticated: {request.user.is_authenticated}")
        company_id = self.get_company_id(request)
        if not company_id:
            print(f"DEBUG: No company_id found in activity()")
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get recent activities for this company
        activities = Activity.objects.filter(
            company_id=company_id
        ).select_related('user').order_by('-created_at')[:10]
        
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def incomplete_products(self, request):
        """
        Return the top 5 incomplete products
        """
        company_id = self.get_company_id(request)
        
        # Get products for this company
        queryset = Product.objects.filter(created_by=request.user)
        
        # Calculate completeness for each product
        products_with_completeness = []
        for product in queryset:
            try:
                completeness = product.get_completeness()
                if completeness < 100:  # Only include incomplete products
                    try:
                        missing_fields = product.get_missing_fields()
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

class AssetViewSet(viewsets.ModelViewSet):
    """
    Nested under /products/<product_pk>/assets/.
    Handles upload, delete, reorder and set-primary.
    """
    serializer_class = ProductAssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # Filter to the parent product
    def get_queryset(self):
        return ProductAsset.objects.filter(product_id=self.kwargs["product_pk"])
        
    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super().get_serializer_context()
        context.update({
            'product_id': self.kwargs.get('product_pk')
        })
        return context

    # Attach the FK on create
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
                
            # Save the asset
            serializer.save(product=product)
            
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
