from django.contrib import admin
from .models import (
    DimTime, 
    DimProduct, 
    DimAttribute, 
    DimLocale, 
    DimChannel,
    DimEditor,
    FactProductAttribute
)

@admin.register(DimTime)
class DimTimeAdmin(admin.ModelAdmin):
    list_display = ('date', 'year', 'quarter', 'month', 'day')
    search_fields = ('date', 'year')
    list_filter = ('year', 'quarter', 'month')
    ordering = ('-date',)

@admin.register(DimProduct)
class DimProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'organization_id')
    search_fields = ('sku', 'name')
    list_filter = ('organization_id',)

@admin.register(DimAttribute)
class DimAttributeAdmin(admin.ModelAdmin):
    list_display = ('code', 'label', 'data_type', 'organization_id')
    search_fields = ('code', 'label')
    list_filter = ('data_type', 'organization_id')

@admin.register(DimLocale)
class DimLocaleAdmin(admin.ModelAdmin):
    list_display = ('code', 'description')
    search_fields = ('code', 'description')

@admin.register(DimChannel)
class DimChannelAdmin(admin.ModelAdmin):
    list_display = ('code', 'description')
    search_fields = ('code', 'description')

@admin.register(DimEditor)
class DimEditorAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'username', 'email')
    search_fields = ('username', 'email')

@admin.register(FactProductAttribute)
class FactProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'attribute', 'time', 'locale', 'channel', 'completed', 'edit_count', 'is_translated')
    list_filter = ('completed', 'is_translated', 'time', 'organization_id')
    search_fields = ('product__sku', 'product__name', 'attribute__code')
    date_hierarchy = 'updated_at'
