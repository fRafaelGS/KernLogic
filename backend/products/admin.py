from django.contrib import admin
import sys

# Separate imports to avoid circular dependencies
if 'makemigrations' not in sys.argv and 'migrate' not in sys.argv:
    # Import all models from models.py
    from products.models import (
        Product, ProductImage, ProductAsset, ProductEvent, Activity, ProductRelation,
        Attribute, AttributeValue, AttributeGroup, AttributeGroupItem
    )

    class ProductImageInline(admin.TabularInline):
        model = ProductImage
        extra = 1

    class ProductRelationInline(admin.TabularInline):
        model = ProductRelation
        extra = 1
        fk_name = 'product'

    class ProductAssetInline(admin.TabularInline):
        model = ProductAsset
        extra = 1

    @admin.register(Product)
    class ProductAdmin(admin.ModelAdmin):
        list_display = ('name', 'sku', 'price', 'category', 'is_active', 'created_at')
        list_filter = ('is_active', 'category')
        search_fields = ('name', 'sku', 'description')
        ordering = ('-created_at',)
        inlines = [ProductImageInline, ProductRelationInline, ProductAssetInline]
        
        readonly_fields = ('organization',)
        
        def get_queryset(self, request):
            # Add prefetch for related models to optimize admin performance
            return super().get_queryset(request).select_related('created_by')

    @admin.register(ProductImage)
    class ProductImageAdmin(admin.ModelAdmin):
        list_display = ('product', 'image', 'order', 'is_primary', 'uploaded_at')
        list_filter = ('is_primary',)
        search_fields = ('product__name', 'product__sku')
        ordering = ('product', 'order')
        
        readonly_fields = ('organization',)

    @admin.register(ProductRelation)
    class ProductRelationAdmin(admin.ModelAdmin):
        list_display = ('product', 'related_product', 'relationship_type', 'is_pinned', 'created_at')
        list_filter = ('relationship_type', 'is_pinned')
        search_fields = ('product__name', 'related_product__name')
        ordering = ('-created_at',)
        
        readonly_fields = ('organization',)

    @admin.register(ProductAsset)
    class ProductAssetAdmin(admin.ModelAdmin):
        list_display = ('product', 'name', 'asset_type', 'file', 'order', 'is_primary', 'uploaded_at')
        list_filter = ('asset_type', 'is_primary')
        search_fields = ('product__name', 'name')
        ordering = ('product', 'order')
        
        readonly_fields = ('organization',)

    @admin.register(ProductEvent)
    class ProductEventAdmin(admin.ModelAdmin):
        list_display = ('product', 'event_type', 'summary', 'created_at', 'created_by')
        list_filter = ('event_type',)
        search_fields = ('product__name', 'product__sku', 'summary')
        ordering = ('-created_at',)
        
        readonly_fields = ('organization',)

    @admin.register(Attribute)
    class AttributeAdmin(admin.ModelAdmin):
        list_display = ('code', 'label', 'data_type', 'is_localisable', 'is_scopable', 'organization')
        list_filter = ('data_type', 'is_localisable', 'is_scopable')
        search_fields = ('code', 'label')
        
        readonly_fields = ('organization',)

    @admin.register(AttributeValue)
    class AttributeValueAdmin(admin.ModelAdmin):
        list_display = ('attribute', 'product', 'locale', 'channel', 'value', 'organization')
        list_filter = ('attribute', 'locale', 'channel')
        search_fields = ('product__name', 'product__sku', 'attribute__code')
        
        readonly_fields = ('organization',)

    class AttributeGroupItemInline(admin.TabularInline):
        model = AttributeGroupItem
        extra = 1

    @admin.register(AttributeGroup)
    class AttributeGroupAdmin(admin.ModelAdmin):
        list_display = ('name', 'order', 'organization')
        list_filter = ('organization',)
        search_fields = ('name',)
        ordering = ('order', 'name')
        inlines = [AttributeGroupItemInline]
        
        readonly_fields = ('organization',)
