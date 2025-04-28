# This file IS now used for ProductViewSet routing

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedSimpleRouter
from .views import ProductViewSet, DashboardViewSet, AssetViewSet

# /api/products/…
router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")

# /api/products/<product_pk>/assets/…
assets_router = NestedSimpleRouter(router, r"products", lookup="product")
assets_router.register(r"assets", AssetViewSet, basename="product-assets")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(assets_router.urls)),
] 