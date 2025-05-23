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

    # price range - updated to use ProductPrice relationship
    min_price = filters.NumberFilter(method='filter_min_price')
    max_price = filters.NumberFilter(method='filter_max_price')

    # date range filters
    created_at_from = filters.DateFilter(field_name="created_at", lookup_expr="gte")
    created_at_to = filters.DateFilter(field_name="created_at", lookup_expr="lte") 
    updated_at_from = filters.DateFilter(field_name="updated_at", lookup_expr="gte")
    updated_at_to = filters.DateFilter(field_name="updated_at", lookup_expr="lte")

    # tags filter (handles JSON field)
    tags = filters.CharFilter(method='filter_tags')
    
    def filter_min_price(self, queryset, name, value):
        """
        Filter products by minimum price using the ProductPrice relationship
        """
        if value is not None:
            return queryset.filter(prices__amount__gte=value).distinct()
        return queryset
    
    def filter_max_price(self, queryset, name, value):
        """
        Filter products by maximum price using the ProductPrice relationship
        """
        if value is not None:
            return queryset.filter(prices__amount__lte=value).distinct()
        return queryset
    
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
            "created_at_from",
            "created_at_to",
            "updated_at_from",
            "updated_at_to",
            "tags",
        ] 