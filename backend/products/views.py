from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, ProductImage
from .serializers import ProductSerializer, ProductImageSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction, models
from rest_framework.renderers import JSONRenderer

# Create your views here.

@method_decorator(csrf_exempt, name='dispatch')
class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing products.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [JSONRenderer]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'sku', 'category']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser, filters.OrderingFilter]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """
        This queryset should filter products based on the request user.
        """
        # Revert to filtering by user
        user = self.request.user
        if user.is_authenticated:
            return Product.objects.filter(created_by=user)
        return Product.objects.none() # Or raise PermissionDenied

    def perform_create(self, serializer):
        """
        Set the user when creating a product.
        """
        # No need for dev mode check if IsAuthenticated is used
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        """
        Soft delete the product by setting is_active to False
        """
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Return a list of all unique categories
        """
        categories = Product.objects.filter(
            created_by=request.user
        ).values_list('category', flat=True).distinct()
        return Response(list(categories))

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Return basic stats about the user's products
        """
        queryset = self.get_queryset()
        total_products = queryset.count()
        total_value = sum(float(product.price) * product.stock for product in queryset)
        low_stock = queryset.filter(stock__lt=10).count()

        return Response({
            'total_products': total_products,
            'total_value': total_value,
            'low_stock': low_stock
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
