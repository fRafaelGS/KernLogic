from rest_framework import serializers
import json
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
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    country_availability = serializers.ListField(child=serializers.CharField(), required=False)
    attributes = serializers.JSONField(required=False)
    primary_image = serializers.ImageField(required=False, allow_null=True)
    primary_image_thumb = serializers.SerializerMethodField()
    primary_image_large = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'sku', 'price', 'stock', 'category',
            'is_active', 'created_at', 'updated_at', 'brand', 'type',
            'unit_of_measure', 'barcode', 'tags', 'country_availability',
            'attributes', 'primary_image', 'primary_image_thumb', 'primary_image_large',
            'created_by', 'images'
        ]
        read_only_fields = ['created_at', 'updated_at', 'images', 'created_by']

    def get_primary_image_thumb(self, obj):
        if obj.primary_image:
            return obj.primary_image.url
        return None

    def get_primary_image_large(self, obj):
        if obj.primary_image:
            return obj.primary_image.url
        return None

    def to_representation(self, instance):
        """
        Convert JSON string fields to Python objects during serialization
        """
        ret = super().to_representation(instance)
        
        # Handle tags
        try:
            if instance.tags:
                ret['tags'] = json.loads(instance.tags)
            else:
                ret['tags'] = []
        except (TypeError, json.JSONDecodeError):
            ret['tags'] = []
        
        # Handle country_availability
        try:
            if instance.country_availability:
                ret['country_availability'] = json.loads(instance.country_availability)
            else:
                ret['country_availability'] = []
        except (TypeError, json.JSONDecodeError):
            ret['country_availability'] = []
        
        # Handle attributes
        try:
            if instance.attributes:
                ret['attributes'] = json.loads(instance.attributes)
            else:
                ret['attributes'] = {}
        except (TypeError, json.JSONDecodeError):
            ret['attributes'] = {}
        
        return ret

    def to_internal_value(self, data):
        """
        Convert Python objects to JSON strings for storage
        """
        # Handle incoming JSON data that might be strings already
        if 'tags' in data and not isinstance(data['tags'], str):
            data = data.copy()  # Make a mutable copy
            data['tags'] = json.dumps(data['tags'])
            
        if 'country_availability' in data and not isinstance(data['country_availability'], str):
            data = data.copy() if isinstance(data, dict) else data
            data['country_availability'] = json.dumps(data['country_availability'])
            
        if 'attributes' in data and not isinstance(data['attributes'], str):
            data = data.copy() if isinstance(data, dict) else data
            data['attributes'] = json.dumps(data['attributes'])
        
        return super().to_internal_value(data)

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

class ProductStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    low_stock_count = serializers.IntegerField() 