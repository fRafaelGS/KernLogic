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
from products.views.attribute import AttributeViewSet
from products.views.attribute_value import AttributeValueViewSet

# Define what's available when importing from this package
__all__ = [
    'ProductViewSet', 'DashboardViewSet', 'AssetViewSet', 'ProductEventViewSet', 'SkuCheckAPIView',
    'AttributeViewSet', 'AttributeValueViewSet'
] 