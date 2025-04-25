# This file IS now used for ProductViewSet routing

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, DashboardViewSet

# Create two routers for different URL patterns
main_router = DefaultRouter()
products_router = DefaultRouter()
dashboard_router = DefaultRouter()

# Register with empty string for /api/<pk>/ format (original)
main_router.register('', ProductViewSet, basename='product')

# Register with 'products' prefix for /api/products/<pk>/ format (for image uploads)
products_router.register('products', ProductViewSet, basename='product-alt')

# Register dashboard viewset
dashboard_router.register('dashboard', DashboardViewSet, basename='dashboard')

# Combine all router URL patterns
urlpatterns = main_router.urls + products_router.urls + dashboard_router.urls 