# This file IS now used for ProductViewSet routing

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedSimpleRouter
# Import from the views package, where we've properly set up the imports
from products.views import (
    ProductViewSet, DashboardViewSet, AssetViewSet, ProductEventViewSet, SkuCheckAPIView,
    AttributeViewSet, AttributeValueViewSet, AttributeGroupViewSet, ProductAttributeGroupViewSet,
    LocaleViewSet
)
from products.views_readonly import (
    ActivityViewSet,
    # PriceHistoryViewSet,  # Deprecated - Use /history/ endpoint instead
    # VersionViewSet,  # Deprecated - Use /history/ endpoint instead
    AttributeSetViewSet,
)
# Import the new CategoryViewSet
from products.views_category import CategoryViewSet
# Import the PDF export view
from products.views.pdf_export import generate_product_pdf
from .views_main import AssetBundleViewSet
# Import family views
from products.views.family import FamilyViewSet
from products.views.attribute_group_override import override_attribute_group, ProductFamilyOverrideViewSet
# Import the SalesChannelViewSet
from products.views.channel import SalesChannelViewSet

# /api/products/…
router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"products/(?P<product_pk>\d+)/history", ProductEventViewSet, basename="product-history")
router.register(r"attribute-sets", AttributeSetViewSet, basename="attribute-set")
# Add top-level attributes route
router.register(r"attributes", AttributeViewSet, basename="attribute")
# Add top-level attribute-groups route
router.register(r"attribute-groups", AttributeGroupViewSet, basename="attribute-group")
# Register the new CategoryViewSet
router.register(r"categories", CategoryViewSet, basename="category")
# Register the new FamilyViewSet
router.register(r"families", FamilyViewSet, basename="family")
# Register the LocaleViewSet
router.register(r"locales", LocaleViewSet, basename="locale")
# Register the SalesChannelViewSet
router.register(r"channels", SalesChannelViewSet, basename="channel")

# /api/products/<product_pk>/assets/…
assets_router = NestedSimpleRouter(router, r"products", lookup="product")
assets_router.register(r"assets", AssetViewSet, basename="product-assets")
assets_router.register(r"asset-bundles", AssetBundleViewSet, basename="asset-bundles")

# /api/products/<product_pk>/family-overrides/…
family_overrides_router = NestedSimpleRouter(router, r"products", lookup="product")
family_overrides_router.register(
    r"family-overrides", 
    ProductFamilyOverrideViewSet, 
    basename="product-family-overrides"
)

# 🆕  nested router for the four read-only sub-resources
details_router = NestedSimpleRouter(router, r"products", lookup="product")
details_router.register(r"attributes", AttributeValueViewSet, basename="product-attributes")
details_router.register(r"attribute-groups", ProductAttributeGroupViewSet, basename="product-attribute-groups")
details_router.register(r"activities", ActivityViewSet, basename="product-activities")
# DEPRECATED: Use /history/ endpoint instead
# details_router.register(r"price-history", PriceHistoryViewSet, basename="product-price-history")
# details_router.register(r"versions", VersionViewSet, basename="product-versions")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(assets_router.urls)),
    path("", include(details_router.urls)),
    path("", include(family_overrides_router.urls)),
    path("products/sku-check/", SkuCheckAPIView.as_view(), name="products-sku-check"),
    # Add PDF export endpoint
    path("products/<int:product_id>/pdf/", generate_product_pdf, name="product-pdf-export"),
    # Add attribute group override endpoint
    path("products/<int:product_id>/override-group/", override_attribute_group, name="product-override-group"),
] 