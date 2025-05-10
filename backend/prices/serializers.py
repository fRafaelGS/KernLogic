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


class PriceTypeSlugOrIdField(serializers.RelatedField):
    """Custom field that accepts either the PriceType ID or code (slug)"""
    
    def to_representation(self, value):
        """Return the code (slug) for the price type"""
        return value.code
    
    def to_internal_value(self, data):
        """Accept either an ID (integer) or code (string)"""
        try:
            # First, try to interpret as an integer (ID)
            if isinstance(data, str) and data.isdigit():
                price_type = PriceType.objects.get(id=int(data))
                return price_type
            elif isinstance(data, int):
                price_type = PriceType.objects.get(id=data)
                return price_type
                
            # If that fails, try as a code (string)
            price_type = PriceType.objects.get(code=data)
            return price_type
        except (PriceType.DoesNotExist, ValueError):
            raise serializers.ValidationError(f"PriceType with ID/code '{data}' does not exist")


class ProductPriceSerializer(serializers.ModelSerializer):
    price_type = PriceTypeSlugOrIdField(queryset=PriceType.objects.all())
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