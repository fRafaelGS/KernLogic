from django.contrib import admin
from .models import Product, ProductImage, Activity

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'price', 'category', 'is_active', 'created_at')
    list_filter = ('is_active', 'category', 'created_at')
    search_fields = ('name', 'sku', 'description')
    date_hierarchy = 'created_at'
    inlines = [ProductImageInline]

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('action', 'entity', 'entity_id', 'user', 'created_at')
    list_filter = ('action', 'entity', 'created_at')
    search_fields = ('entity', 'entity_id', 'message')
    date_hierarchy = 'created_at'
