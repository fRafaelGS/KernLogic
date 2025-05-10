from django.contrib import admin
import sys
from kernlogic.utils import get_user_organization

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
            organization = get_user_organization(request.user)
            return qs.filter(organization=organization)

        fields = ('attribute', 'value', 'locale', 'channel')
        can_delete = False
        readonly_fields = ()  # make empty tuple → rows are editable
        ordering = ('attribute__label',)

    @admin.register(Product)
    class ProductAdmin(admin.ModelAdmin):
        list_display = ('id', 'name', 'sku', 'default_price', 'organization', 'is_active', 'created_at')
        list_filter = ('is_active', 'created_at', 'organization')
        search_fields = ('name', 'sku', 'description')
        readonly_fields = ('created_at', 'updated_at', 'created_by')
        inlines = [AttributeValueInline, ProductImageInline, ProductRelationInline, ProductAssetInline]
        
        def default_price(self, obj):
            """Get the default price from the ProductPrice model"""
            base_price = obj.prices.filter(price_type__code='base').first()
            if base_price:
                return f"{base_price.currency} {base_price.amount}"
            return "N/A"
        default_price.short_description = "Price"
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs
        
        def save_model(self, request, obj, form, change):
            if not obj.created_by:
                obj.created_by = request.user
            if not obj.organization:
                obj.organization = get_user_organization(request.user)
            obj.save()

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
        list_display = ('id', 'product', 'name', 'asset_type', 'is_primary', 'uploaded_at')
        list_filter = ('asset_type', 'is_primary', 'organization')
        search_fields = ('name', 'product__name', 'product__sku')
        raw_id_fields = ('product',)
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs

    @admin.register(ProductEvent)
    class ProductEventAdmin(admin.ModelAdmin):
        list_display = ('product', 'event_type', 'summary', 'created_at', 'created_by')
        list_filter = ('event_type',)
        search_fields = ('product__name', 'product__sku', 'summary')
        ordering = ('-created_at',)
        
        readonly_fields = ('organization',)

    @admin.register(Attribute)
    class AttributeAdmin(admin.ModelAdmin):
        list_display = ('id', 'code', 'label', 'data_type', 'organization')
        list_filter = ('data_type', 'is_localisable', 'organization')
        search_fields = ('code', 'label')
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs

    @admin.register(AttributeValue)
    class AttributeValueAdmin(admin.ModelAdmin):
        list_display = ('id', 'attribute', 'product', 'value', 'organization')
        list_filter = ('attribute', 'organization')
        raw_id_fields = ('product', 'attribute')
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs

    class AttributeGroupItemInline(admin.TabularInline):
        model = AttributeGroupItem
        extra = 1

    @admin.register(AttributeGroup)
    class AttributeGroupAdmin(admin.ModelAdmin):
        list_display = ('id', 'name', 'order', 'organization')
        list_filter = ('organization',)
        search_fields = ('name',)
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs
        inlines = [AttributeGroupItemInline]
        
        def item_count(self, obj):
            return obj.attributegroupitem_set.count()
        item_count.short_description = 'Attributes'

    @admin.register(AttributeGroupItem)
    class AttributeGroupItemAdmin(admin.ModelAdmin):
        list_display = ('id', 'group', 'attribute', 'order')
        list_filter = ('group', 'attribute')
        raw_id_fields = ('group', 'attribute')

    @admin.register(Activity)
    class ActivityAdmin(admin.ModelAdmin):
        list_display = ('id', 'user', 'entity', 'entity_id', 'action', 'created_at')
        list_filter = ('action', 'created_at', 'organization')
        search_fields = ('entity', 'entity_id', 'message')
        
        def get_queryset(self, request):
            qs = super().get_queryset(request)
            # If not superuser, limit to user's organization
            if not request.user.is_superuser:
                organization = get_user_organization(request.user)
                return qs.filter(organization=organization)
            return qs
