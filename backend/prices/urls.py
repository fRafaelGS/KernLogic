from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import CurrencyViewSet, PriceTypeViewSet, ProductPriceViewSet
# Import the ProductViewSet for nesting
from products.views import ProductViewSet

# Main router for top-level endpoints
router = DefaultRouter()
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'price-types', PriceTypeViewSet, basename='price-type')

# Product router for nested resources
product_router = nested_routers.SimpleRouter()
product_router.register(r'products', ProductViewSet, basename='product')

# Nested router for prices under products
price_router = nested_routers.NestedSimpleRouter(product_router, r'products', lookup='product')
price_router.register(r'prices', ProductPriceViewSet, basename='product-prices')

# Combine all router URLs
urlpatterns = [
    path('', include(router.urls)),
    path('', include(product_router.urls)),
    path('', include(price_router.urls)),
] 