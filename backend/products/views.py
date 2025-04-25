from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, ProductImage
from .serializers import ProductSerializer, ProductImageSerializer, ProductStatsSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction, models
from rest_framework.renderers import JSONRenderer
from django.db.models import Sum, F, Q, Count
from django.db.models.functions import Coalesce
from decimal import Decimal
from .pagination import StandardResultsSetPagination

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
    ordering_fields = ['name', 'created_at', 'price', 'stock', 'brand']
    ordering = ['-created_at']
    renderer_classes = [JSONRenderer]
    parser_classes = [MultiPartParser, FormParser, filters.OrderingFilter]
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
        low_stock = self.request.query_params.get('low_stock')
        
        if category:
            queryset = queryset.filter(category=category)
        if brand:
            queryset = queryset.filter(brand=brand)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        if low_stock is not None:
            threshold = int(self.request.query_params.get('threshold', 10))
            queryset = queryset.filter(stock__lt=threshold)
            
        return queryset

    def perform_create(self, serializer):
        """
        Set the created_by field to the current user when creating a product.
        """
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        """
        Soft delete the product by setting is_active to False
        """
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return statistics about products for the dashboard:
        - Total number of products
        - Total value of inventory
        - Number of products with low stock
        """
        queryset = self.get_queryset()
        
        # Calculate stats
        total_products = queryset.count()
        total_value = queryset.aggregate(
            total=Coalesce(Sum(F('price') * F('stock')), Decimal('0.00'))
        )['total']
        
        # Low stock count (less than 10 items)
        low_stock_threshold = int(request.query_params.get('threshold', 10))
        low_stock_count = queryset.filter(stock__lt=low_stock_threshold).count()
        
        serializer = ProductStatsSerializer(data={
            'total_products': total_products,
            'total_value': total_value,
            'low_stock_count': low_stock_count
        })
        
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)
        
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Return a list of unique categories for dropdown menus.
        """
        queryset = self.get_queryset()
        categories = queryset.values_list('category', flat=True).distinct().order_by('category')
        # Filter out None values
        categories = [c for c in categories if c]
        return Response(categories)
        
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
