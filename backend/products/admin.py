from django.contrib import admin
from .models import Product, ProductImage, ProductAsset, ProductEvent, Activity, ProductRelation

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'price', 'category', 'is_active', 'is_archived', 'organization')
    list_filter = ('is_active', 'is_archived', 'category', 'organization')
    search_fields = ('name', 'sku', 'description', 'brand')
    readonly_fields = ('created_at', 'updated_at', 'organization')
    fieldsets = (
        (None, {
            'fields': ('name', 'sku', 'description', 'price', 'category', 'brand', 'barcode', 'organization')
        }),
        ('Status', {
            'fields': ('is_active', 'is_archived', 'created_by', 'created_at', 'updated_at')
        }),
        ('Additional Info', {
            'fields': ('tags', 'attributes', 'primary_image')
        })
    )
    
@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'image', 'order', 'is_primary', 'organization')
    list_filter = ('is_primary', 'organization')
    search_fields = ('product__name', 'product__sku')
    readonly_fields = ('organization',)

@admin.register(ProductAsset)
class ProductAssetAdmin(admin.ModelAdmin):
    list_display = ('product', 'asset_type', 'name', 'is_primary', 'uploaded_at', 'organization')
    list_filter = ('asset_type', 'is_primary', 'is_archived', 'organization')
    search_fields = ('product__name', 'product__sku', 'name')
    readonly_fields = ('uploaded_at', 'organization',)
    
@admin.register(ProductEvent)
class ProductEventAdmin(admin.ModelAdmin):
    list_display = ('product', 'event_type', 'summary', 'created_at', 'created_by', 'organization')
    list_filter = ('event_type', 'organization')
    search_fields = ('product__name', 'product__sku', 'summary')
    readonly_fields = ('created_at', 'organization')

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('entity', 'entity_id', 'action', 'user', 'created_at', 'organization')
    list_filter = ('action', 'entity', 'organization')
    search_fields = ('message', 'entity', 'entity_id')
    readonly_fields = ('created_at', 'organization')
    
@admin.register(ProductRelation)
class ProductRelationAdmin(admin.ModelAdmin):
    list_display = ('product', 'related_product', 'relationship_type', 'is_pinned', 'created_at', 'organization')
    list_filter = ('relationship_type', 'is_pinned', 'organization')
    search_fields = ('product__name', 'product__sku', 'related_product__name', 'related_product__sku')
    readonly_fields = ('created_at', 'organization')
