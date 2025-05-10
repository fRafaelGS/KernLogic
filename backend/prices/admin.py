from django.contrib import admin
from .models import Currency, PriceType, ProductPrice


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('iso_code', 'name', 'symbol', 'decimals', 'is_active', 'organization')
    list_filter = ('is_active', 'organization')
    search_fields = ('iso_code', 'name')


@admin.register(PriceType)
class PriceTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'label', 'organization')
    list_filter = ('organization',)
    search_fields = ('code', 'label')


@admin.register(ProductPrice)
class ProductPriceAdmin(admin.ModelAdmin):
    list_display = ('product', 'price_type', 'currency', 'amount', 'channel', 
                    'valid_from', 'valid_to', 'organization')
    list_filter = ('price_type', 'currency', 'channel', 'organization')
    search_fields = ('product__name', 'product__sku')
    date_hierarchy = 'valid_from'
