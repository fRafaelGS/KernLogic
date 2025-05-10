from rest_framework import serializers
from .models import Currency, PriceType, ProductPrice


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["iso_code", "symbol", "name", "decimals"]
        read_only_fields = ["iso_code"]


class PriceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceType
        fields = ["id", "code", "label"]


class ProductPriceSerializer(serializers.ModelSerializer):
    price_type_display = serializers.CharField(source="price_type.label", read_only=True)
    channel_name = serializers.CharField(source="channel.name", read_only=True)
    
    class Meta:
        model = ProductPrice
        fields = [
            "id", "price_type", "price_type_display", "currency", 
            "channel", "channel_name", "amount", "valid_from", 
            "valid_to", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"] 