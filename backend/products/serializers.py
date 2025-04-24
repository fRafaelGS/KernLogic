from rest_framework import serializers
from .models import Product, ProductImage

# --- NEW ProductImage Serializer ---
class ProductImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ('id', 'product', 'image', 'url', 'order', 'is_primary', 'uploaded_at')
        read_only_fields = ('product', 'uploaded_at', 'url')  # Product link shouldn't be changed via this serializer

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        elif obj.image:
            return obj.image.url
        return None
# --- End ProductImage Serializer ---

class ProductSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.email', required=False)
    price = serializers.FloatField()  # Explicitly use FloatField to ensure numeric values
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'sku', 'price', 'stock', 
                 'category', 'created_by', 'created_at', 'updated_at', 'is_active', 'images']
        read_only_fields = ['created_at', 'updated_at', 'images']

    def validate_sku(self, value):
        """
        Check that the SKU is unique (but skip user-specific validation for development)
        """
        request = self.context.get('request')
        instance = getattr(self, 'instance', None)
        
        # Skip validation if we're updating existing instance
        if instance and instance.sku == value:
            return value
            
        # In development mode, just check that the SKU is unique globally
        if Product.objects.filter(sku=value).exists():
            # If we're in update mode and this is the same SKU, it's OK
            if instance and instance.sku == value:
                return value
            raise serializers.ValidationError("A product with this SKU already exists.")
            
        return value

    def validate_price(self, value):
        """
        Check that the price is positive
        """
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock(self, value):
        """
        Check that the stock is not negative
        """
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value 