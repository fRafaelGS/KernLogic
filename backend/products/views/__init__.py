"""
This module makes views a proper package.
"""
import sys
import os

# Add the backend directory to the path so imports work properly
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Now we can import from views.py
from products.views_main import ProductViewSet, DashboardViewSet, AssetViewSet, ProductEventViewSet, SkuCheckAPIView
from .attribute import AttributeViewSet
from .attribute_value import AttributeValueViewSet
from .sku_check import SkuCheckAPIView
from .attribute_group import AttributeGroupViewSet, ProductAttributeGroupViewSet
from .locale import LocaleViewSet

# Define what's available when importing from this package
__all__ = [
    'ProductViewSet', 'DashboardViewSet', 'AssetViewSet', 'ProductEventViewSet', 'SkuCheckAPIView',
    'AttributeViewSet', 'AttributeValueViewSet', 'AttributeGroupViewSet', 'ProductAttributeGroupViewSet',
    'LocaleViewSet',
]

# This file ensures the views directory is recognized as a Python package 