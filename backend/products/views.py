from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, ProductImage
from .serializers import (
    ProductSerializer, 
    ProductImageSerializer, 
    ProductStatsSerializer,
    DashboardSummarySerializer, 
    InventoryTrendSerializer, 
    ActivitySerializer
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
        queryset = Product.objects.all()
        
        # Apply user filter if not staff/admin
        if not self.request.user.is_staff:
            queryset = queryset.filter(created_by=self.request.user)
            
        # Additional filters from query parameters
        category = self.request.query_params.get('category')
        brand = self.request.query_params.get('brand')
        is_active = self.request.query_params.get('is_active')
        
        if category:
            queryset = queryset.filter(category=category)
        if brand:
            queryset = queryset.filter(brand=brand)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            
        return queryset

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
                "stock": 0,
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
        image_file = request.FILES.get('image')

        if not image_file:
            return Response({'detail': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic validation (can add more: size, type)
        if product.images.count() >= 10: # Example limit
             return Response({'detail': 'Maximum number of images reached (10).'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine order (append to end)
        last_order = product.images.aggregate(models.Max('order')).get('order__max')
        current_order = 0 if last_order is None else last_order + 1

        # Set first image as primary if none exists
        is_first_image = not product.images.exists()

        image_data = {
            'product': product.id,
            'image': image_file,
            'order': current_order,
            'is_primary': is_first_image
        }
        
        # Use context to pass request for absolute URL generation
        serializer = ProductImageSerializer(data=image_data, context=self.get_serializer_context())
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
        
        # Calculate completeness
        if total_products > 0:
            # Get completeness for each product
            completeness_values = [p.get_completeness() for p in queryset]
            avg_completeness = sum(completeness_values) / len(completeness_values)
        else:
            avg_completeness = 0
        
        # Get most missing fields
        missing_fields_count = {}
        for product in queryset:
            for field in product.get_missing_fields():
                if field in missing_fields_count:
                    missing_fields_count[field] += 1
                else:
                    missing_fields_count[field] = 1
        
        # Sort missing fields by count and take top 3
        most_missing = [
            {"field": field, "count": count}
            for field, count in sorted(
                missing_fields_count.items(), 
                key=lambda x: x[1], 
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
            completeness = product.get_completeness()
            if completeness < 100:  # Only include incomplete products
                missing_fields = product.get_missing_fields()
                products_with_completeness.append({
                    'product': product,
                    'completeness': completeness,
                    'missing_fields': missing_fields
                })
        
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
                'missing_fields': item['missing_fields']
            }
            serializer_data.append(data)
        
        return Response(serializer_data)
