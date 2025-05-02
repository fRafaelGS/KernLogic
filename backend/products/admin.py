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

    class AttributeValueInline(admin.TabularInline):
        model = AttributeValue
        extra = 0
        # keep tenant safety
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            if request.user.is_superuser:
                return qs
            return qs.filter(organization=request.user.profile.organization)

        fields = ('attribute', 'value', 'locale', 'channel')
        can_delete = False
        readonly_fields = ()  # make empty tuple → rows are editable
        ordering = ('attribute__label',)

    @admin.register(Product)
    class ProductAdmin(admin.ModelAdmin):
        list_display = ('name', 'sku', 'price', 'category', 'is_active', 'created_at')
        list_filter = ('is_active', 'category')
        search_fields = ('name', 'sku', 'description')
        ordering = ('-created_at',)
        inlines = [AttributeValueInline, ProductImageInline, ProductRelationInline, ProductAssetInline]
        
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
        list_display = ['id', 'code', 'label', 'data_type', 'is_localisable', 'is_scopable', 'organization', 'created_by']
        list_filter = ['data_type', 'is_localisable', 'is_scopable', 'organization']
        search_fields = ['code', 'label']
        ordering = ['code']
        readonly_fields = ('organization',)

    @admin.register(AttributeValue)
    class AttributeValueAdmin(admin.ModelAdmin):
        list_display = ['id', 'get_attribute_code', 'get_product_sku', 'locale', 'channel', 'display_value', 'organization']
        list_filter = ['attribute__data_type', 'locale', 'channel', 'organization']
        search_fields = ['attribute__code', 'attribute__label', 'product__sku']
        readonly_fields = ('organization',)
        
        def get_attribute_code(self, obj):
            return obj.attribute.code
        get_attribute_code.short_description = 'Attribute'
        get_attribute_code.admin_order_field = 'attribute__code'
        
        def get_product_sku(self, obj):
            return obj.product.sku
        get_product_sku.short_description = 'Product'
        get_product_sku.admin_order_field = 'product__sku'
        
        def display_value(self, obj):
            """Format the value nicely based on the attribute type"""
            if not obj.attribute:
                return str(obj.value)
            
            if obj.attribute.data_type == 'boolean':
                return 'Yes' if obj.value else 'No'
            elif obj.attribute.data_type == 'date':
                return obj.value
            else:
                return str(obj.value)
        display_value.short_description = 'Value'

    class AttributeGroupItemInline(admin.TabularInline):
        model = AttributeGroupItem
        extra = 1

    @admin.register(AttributeGroup)
    class AttributeGroupAdmin(admin.ModelAdmin):
        list_display = ['id', 'name', 'order', 'organization', 'item_count']
        list_filter = ['organization']
        search_fields = ['name']
        ordering = ['order', 'name']
        readonly_fields = ('organization',)
        inlines = [AttributeGroupItemInline]
        
        def item_count(self, obj):
            return obj.attributegroupitem_set.count()
        item_count.short_description = 'Attributes'
