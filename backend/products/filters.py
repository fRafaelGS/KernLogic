from django_filters import rest_framework as filters
from .models import Product, Category, Family
from django.db.models import Q

class ProductFilter(filters.FilterSet):
    # text fields – case-insensitive contains
    sku     = filters.CharFilter(field_name="sku", lookup_expr="icontains")
    name    = filters.CharFilter(field_name="name", lookup_expr="icontains")
    brand   = filters.CharFilter(field_name="brand", lookup_expr="icontains")
    barcode = filters.CharFilter(field_name="barcode", lookup_expr="icontains")

    # foreign keys (expect integer IDs from the UI)
    category = filters.NumberFilter(field_name="category_id")
    family   = filters.NumberFilter(field_name="family_id")

    # bool
    is_active = filters.BooleanFilter(field_name="is_active")

    # price range
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")

    # tags filter (handles JSON field)
    tags = filters.CharFilter(method='filter_tags')
    
    def filter_tags(self, queryset, name, value):
        """
        Filter products by tag
        
        The tags field is stored as a JSON string in the database.
        This method searches for products that have the specified tag in their tags list.
        """
        # Split the comma-separated tags
        tag_values = value.split(',')
        
        # Build a query that checks if each tag is in the JSON tags field
        query = None
        for tag in tag_values:
            tag_filter = Q(tags__icontains=f'"{tag.strip()}"')
            if query is None:
                query = tag_filter
            else:
                query |= tag_filter
                
        return queryset.filter(query) if query else queryset

    class Meta:
        model = Product
        # list every param we want to expose
        fields = [
            "sku",
            "name",
            "brand",
            "barcode",
            "category",
            "family",
            "is_active",
            "min_price",
            "max_price",
            "tags",
        ] 