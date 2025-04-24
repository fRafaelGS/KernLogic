# This file IS now used for ProductViewSet routing

from django.urls import path, include
from rest_framework.routers import DefaultRouter # Uncomment
from .views import ProductViewSet # Uncomment

# Create two routers for different URL patterns
main_router = DefaultRouter()
products_router = DefaultRouter()

# Register with empty string for /api/<pk>/ format (original)
main_router.register('', ProductViewSet, basename='product')

# Register with 'products' prefix for /api/products/<pk>/ format (for image uploads)
products_router.register('products', ProductViewSet, basename='product-alt')

# Combine both router URL patterns
urlpatterns = main_router.urls + products_router.urls 