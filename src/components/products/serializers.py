from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'sku', 'price', 'stock',
            'category', 'created_by', 'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate_sku(self, value):
        """
        Ensure SKU is unique, but allow the same SKU on update
        if it's the current instance.
        """
        instance = getattr(self, 'instance', None)
        if instance and instance.sku == value:
            return value
        if Product.objects.filter(sku=value).exists():
            raise serializers.ValidationError(
                "A product with this SKU already exists."
            )
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value
