from rest_framework import serializers
import json
from .models import Product, ProductImage, Activity, ProductRelation, ProductAsset
from django.db.models import Sum, F, Count, Case, When, Value, FloatField
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db.models.functions import TruncDay

# --- NEW ProductImage Serializer ---
class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images"""
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'url', 'order', 'is_primary']
    
    def get_url(self, obj):
        """Get absolute URL for the image"""
        if obj.image:
            return obj.image.url
        return None
# --- End ProductImage Serializer ---

class ProductSerializer(serializers.ModelSerializer):
    """Serializer for products with JSON fields handling"""
    created_by = serializers.ReadOnlyField(source='created_by.email')
    price = serializers.FloatField()  # Explicitly use FloatField to ensure numeric values
    images = ProductImageSerializer(many=True, read_only=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    attributes = serializers.JSONField(required=False)
    primary_image = serializers.ImageField(required=False, allow_null=True)
    primary_image_thumb = serializers.SerializerMethodField()
    primary_image_large = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'sku', 'price', 'category',
            'is_active', 'created_at', 'updated_at', 'brand',
            'barcode', 'tags', 'attributes', 'primary_image', 'primary_image_thumb', 'primary_image_large',
            'created_by', 'images'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'images']

    def get_primary_image_thumb(self, obj):
        """Return URL for primary image thumbnail"""
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image and primary_image.image:
            return primary_image.image.url
        elif obj.primary_image:
            return obj.primary_image.url
        return None

    def get_primary_image_large(self, obj):
        """Return URL for primary image large version"""
        # For now, we'll return the same URL as thumbnail
        # In production, you'd resize images or use different versions
        return self.get_primary_image_thumb(obj)

    def to_representation(self, instance):
        """
        Convert JSON string fields to Python objects during serialization
        """
        ret = super().to_representation(instance)
        
        # Handle tags
        if instance.tags:
            try:
                # Check if tags is already a list (don't try to parse again)
                if isinstance(instance.tags, list):
                    ret['tags'] = instance.tags
                else:
                    ret['tags'] = json.loads(instance.tags)
            except json.JSONDecodeError:
                ret['tags'] = []
        else:
            ret['tags'] = []
        
        # Handle attributes
        if instance.attributes:
            try:
                # Check if attributes is already a dict (don't try to parse again)
                if isinstance(instance.attributes, dict):
                    ret['attributes'] = instance.attributes
                else:
                    ret['attributes'] = json.loads(instance.attributes)
            except json.JSONDecodeError:
                ret['attributes'] = {}
        else:
            ret['attributes'] = {}
        
        return ret

    def to_internal_value(self, data):
        """
        Convert Python objects to JSON strings for storage
        """
        # First perform the basic validation
        validated_data = super().to_internal_value(data)
        
        # Handle tags
        if 'tags' in data and not isinstance(data['tags'], str):
            validated_data['tags'] = json.dumps(data['tags'])
        
        # Handle attributes
        if 'attributes' in data and not isinstance(data['attributes'], str):
            validated_data['attributes'] = json.dumps(data['attributes'])
        
        return validated_data

    def validate_sku(self, value):
        """
        Ensure SKU is unique, but allow the same SKU on update
        if it's the current instance.
        """
        request = self.context.get('request')
        if not request or not request.user:
            return value
        
        instance = getattr(self, 'instance', None)
        if instance and instance.sku == value:
            return value
        if Product.objects.filter(
            created_by=request.user,
            sku=value
        ).exclude(
            pk=instance.pk if instance else None
        ).exists():
            raise serializers.ValidationError(
                "A product with this SKU already exists."
            )
        return value

    def validate_price(self, value):
        """
        Check that the price is positive
        """
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

class ProductRelationSerializer(serializers.ModelSerializer):
    """Serializer for product relations"""
    class Meta:
        model = ProductRelation
        fields = ['id', 'product', 'related_product', 'relationship_type', 'is_pinned', 'created_at']
        read_only_fields = ['created_at', 'created_by']

    def validate(self, data):
        """Prevent self-referential relationships"""
        if data['product'] == data['related_product']:
            raise serializers.ValidationError("A product cannot be related to itself.")
        return data

class ProductStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)

class ActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Activity
        fields = ['id', 'company_id', 'user', 'user_name', 'entity', 'entity_id', 
                  'action', 'message', 'created_at']
        read_only_fields = ['created_at']

class DashboardSummarySerializer(serializers.Serializer):
    """
    Serializer for dashboard summary data including KPIs and data completeness
    """
    total_products = serializers.IntegerField()
    inventory_value = serializers.FloatField()  # Changed from DecimalField to avoid precision issues
    inactive_product_count = serializers.IntegerField()  # New field to replace low_stock_count
    team_members = serializers.IntegerField()
    data_completeness = serializers.FloatField()  # Percentage of complete product data
    
    # Adjust field definition for weighted missing fields
    most_missing_fields = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    
    # Completeness thresholds for UI
    completeness_thresholds = serializers.SerializerMethodField()
    
    active_products = serializers.IntegerField()
    inactive_products = serializers.IntegerField()
    
    def get_completeness_thresholds(self, obj):
        """Return thresholds for data completeness levels"""
        return {
            'poor': 0,
            'fair': 60,
            'good': 80,
            'excellent': 95
        }

class InventoryTrendSerializer(serializers.Serializer):
    """
    Serializer for inventory value trend data
    """
    dates = serializers.ListField(child=serializers.DateField())
    values = serializers.ListField(child=serializers.FloatField())  # Changed from DecimalField to avoid precision issues

class IncompleteProductSerializer(serializers.ModelSerializer):
    """
    Serializer for products with incomplete data
    """
    completeness = serializers.IntegerField()
    missing_fields = serializers.ListField(child=serializers.DictField())
    field_completeness = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'sku', 'completeness', 'missing_fields', 'field_completeness']
        
    def get_field_completeness(self, obj):
        """Return the detailed field completeness data"""
        return obj.get_field_completeness() if hasattr(obj, 'get_field_completeness') else []

class ProductAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAsset
        fields = "__all__" 