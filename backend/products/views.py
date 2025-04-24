from django.shortcuts import render
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# Create your views here.

@method_decorator(csrf_exempt, name='dispatch')
class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing products.
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]  # Temporarily allow any access for development
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'sku', 'category']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch', 'delete']  # Explicitly allow POST method

    def get_queryset(self):
        """
        Return all products regardless of user (development mode bypass)
        """
        print("================================")
        print("GET QUERYSET CALLED")
        print("User:", self.request.user)
        print("Is authenticated:", getattr(self.request.user, 'is_authenticated', False))
        print("Auth header:", self.request.META.get('HTTP_AUTHORIZATION', 'None'))
        
        # Print all request headers for debugging
        print("All request headers:")
        for header, value in self.request.META.items():
            if header.startswith('HTTP_'):
                print(f"  {header}: {value}")
        
        # Try to manually validate the token if available
        auth_header = self.request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            from rest_framework_simplejwt.tokens import AccessToken
            from rest_framework_simplejwt.exceptions import TokenError
            from rest_framework_simplejwt.authentication import JWTAuthentication
            
            try:
                token = auth_header.split(' ')[1]
                print(f"Attempting to validate token: {token[:10]}...")
                
                # Try using the JWT Authentication class directly
                jwt_auth = JWTAuthentication()
                try:
                    validated_token = jwt_auth.get_validated_token(token)
                    user = jwt_auth.get_user(validated_token)
                    print(f"JWT Auth validation: Token is valid")
                    print(f"JWT Auth user: {user}")
                except Exception as jwt_ex:
                    print(f"JWT Auth validation error: {str(jwt_ex)}")
                
                # Also try with AccessToken class
                token_instance = AccessToken(token)
                print(f"AccessToken validation: Token is valid")
                print(f"Token payload: {token_instance.payload}")
            except TokenError as e:
                print(f"Token validation error: {str(e)}")
            except Exception as e:
                print(f"Unexpected token error: {str(e)}")
        
        print("================================")
        
        # Always return all products in development mode
        return Product.objects.all()

    def perform_create(self, serializer):
        """
        Set the user when creating a product (if authenticated)
        """
        print("Perform create called")
        print("User:", self.request.user)
        print("Is authenticated:", getattr(self.request.user, 'is_authenticated', False))
        
        # In development mode, don't require a user
        if hasattr(self.request.user, 'is_authenticated') and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            print("Creating product without user (development mode)")
            serializer.save(created_by=None)  # Don't set created_by if no authenticated user

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
