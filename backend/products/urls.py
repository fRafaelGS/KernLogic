# This file IS now used for ProductViewSet routing

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedSimpleRouter
# Import from the views package, where we've properly set up the imports
from products.views import ProductViewSet, DashboardViewSet, AssetViewSet, ProductEventViewSet, SkuCheckAPIView

# /api/products/…
router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"products/(?P<product_pk>\d+)/history", ProductEventViewSet, basename="product-history")

# /api/products/<product_pk>/assets/…
assets_router = NestedSimpleRouter(router, r"products", lookup="product")
assets_router.register(r"assets", AssetViewSet, basename="product-assets")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(assets_router.urls)),
    path("products/sku-check/", SkuCheckAPIView.as_view(), name="products-sku-check"),
] 