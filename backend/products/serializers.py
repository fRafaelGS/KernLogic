from rest_framework import serializers
import json
from .models import Product, ProductImage, Activity, ProductRelation, ProductAsset, ProductEvent, Attribute, AttributeValue, AttributeGroupItem, AttributeGroup
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
    """
    Serializer for Product model
    """
    created_by = serializers.ReadOnlyField(source='created_by.email')
    price = serializers.FloatField()  # Explicitly use FloatField to ensure numeric values
    images = ProductImageSerializer(many=True, read_only=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    attributes = serializers.JSONField(required=False)
    primary_image = serializers.ImageField(required=False, allow_null=True)
    primary_image_thumb = serializers.SerializerMethodField()
    primary_image_large = serializers.SerializerMethodField()
    completeness_percent = serializers.SerializerMethodField(read_only=True)
    missing_fields = serializers.SerializerMethodField(read_only=True)
    assets = serializers.SerializerMethodField(read_only=True)
    has_primary_image = serializers.SerializerMethodField(read_only=True)
    primary_image_url = serializers.SerializerMethodField(read_only=True)
    primary_asset = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'price', 'category', 'brand',
            'barcode', 'tags', 'attributes', 'is_active', 'is_archived', 'created_at',
            'updated_at', 'primary_image', 'completeness_percent', 'missing_fields',
            'assets', 'has_primary_image', 'primary_image_url', 'primary_asset', 'organization',
            'created_by', 'images', 'primary_image_thumb', 'primary_image_large'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completeness_percent', 
                           'missing_fields', 'assets', 'has_primary_image', 'primary_image_url',
                           'primary_asset', 'organization', 'created_by', 'images',
                           'primary_image_thumb', 'primary_image_large']

    def get_primary_image_thumb(self, obj):
        """
        Return URL for the primary image thumbnail (or None).
        Handles the case where no images exist or images are not prefetched.
        """
        # If 'images' was prefetched this is a cached RelatedManager;
        # if not, the ORM will still handle .filter() safely.
        primary_image = obj.images.filter(is_primary=True).first()
        if primary_image and primary_image.image:
            return primary_image.image.url

        # Fallback: use standalone primary_image field if set
        if obj.primary_image:
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
        Ensure SKU is unique within the organization, but allow the same SKU on update
        if it's the current instance.
        """
        request = self.context.get('request')
        if not request or not request.user:
            return value
        
        instance = getattr(self, 'instance', None)
        if instance and instance.sku == value:
            return value
            
        # Get the organization from the user's profile
        try:
            organization = request.user.profile.organization
            
            # Check if a product with this SKU already exists in this organization
            if Product.objects.filter(
                created_by=request.user,
                organization=organization,
                sku=value
            ).exclude(
                pk=instance.pk if instance else None
            ).exists():
                raise serializers.ValidationError(
                    "A product with this SKU already exists in your organization."
                )
        except Exception as e:
            # If there's an error getting the organization, log it and use the old check
            print(f"Error during SKU validation: {str(e)}")
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

    def get_completeness_percent(self, obj):
        """Return the completeness percentage of the product"""
        # Implement the logic to calculate completeness percentage
        # This is a placeholder and should be replaced with actual implementation
        return 80  # Placeholder value, actual implementation needed

    def get_missing_fields(self, obj):
        """Return a list of missing fields for the product"""
        # Implement the logic to identify missing fields
        # This is a placeholder and should be replaced with actual implementation
        return []  # Placeholder value, actual implementation needed

    def get_assets(self, obj):
        """Return a list of assets associated with the product"""
        # Implement the logic to retrieve assets
        # This is a placeholder and should be replaced with actual implementation
        return []  # Placeholder value, actual implementation needed

    def get_has_primary_image(self, obj):
        """Return whether the product has a primary image"""
        # Implement the logic to check if the product has a primary image
        # This is a placeholder and should be replaced with actual implementation
        return False  # Placeholder value, actual implementation needed

    def get_primary_image_url(self, obj):
        """Return the URL of the primary image"""
        # Implement the logic to retrieve the URL of the primary image
        # This is a placeholder and should be replaced with actual implementation
        return None  # Placeholder value, actual implementation needed

    def get_primary_asset(self, obj):
        """Return the primary asset associated with the product"""
        # Implement the logic to retrieve the primary asset
        # This is a placeholder and should be replaced with actual implementation
        return None  # Placeholder value, actual implementation needed

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
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    file_size_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductAsset
        fields = [
            'id', 'file', 'file_url', 'asset_type', 'name', 'order', 
            'is_primary', 'content_type', 'file_size', 'file_size_formatted',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'product'
        ]
        read_only_fields = ['product', 'uploaded_at', 'file_url', 'uploaded_by_name', 'file_size_formatted']
    
    def get_file_url(self, obj):
        """Return absolute URL for the file"""
        if obj.file:
            return self.context['request'].build_absolute_uri(obj.file.url) if 'request' in self.context else obj.file.url
        return None
    
    def get_uploaded_by_name(self, obj):
        """Return user name who uploaded the asset"""
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None
    
    def get_file_size_formatted(self, obj):
        """Return formatted file size (KB, MB, etc.)"""
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size/1024:.1f} KB"
        else:
            return f"{size/(1024*1024):.1f} MB"

class ProductEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.first_name", read_only=True)

    class Meta:
        model = ProductEvent
        fields = ["id", "event_type", "summary", "payload", "created_at", "created_by_name"]

# Add the Attribute serializers
class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = '__all__'
        read_only_fields = ('id', 'organization', 'created_by')

class AttributeValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeValue
        fields = '__all__'
        read_only_fields = ('id', 'organization', 'product', 'attribute')

    def validate(self, data):
        # Get the attribute from the context set in the view
        attr = getattr(self.instance, 'attribute', None)
        if not attr and 'attribute' in self.context:
            attr = self.context.get('attribute')
            
        # If we still don't have an attribute, skip validation
        if not attr:
            return data
            
        org = self.context['request'].user.profile.organization
        
        # Debug log the incoming value
        print(f"AttributeValueSerializer.validate: Validating value for attr {attr.id} ({attr.label}): {data.get('value')}, type: {type(data.get('value'))}")
        
        # Check organization matches
        if attr.organization_id != org.id:
            raise serializers.ValidationError("Attribute belongs to a different organization")
        
        # Validate and coerce value based on attribute data_type
        try:
            value = data.get('value')
            if attr.data_type == 'number':
                # Ensure value is numeric
                try:
                    # Convert to float for validation, but use the raw value in the data
                    # This preserves integers vs. floats distinction
                    float_val = float(value)
                    # If it's a whole number, convert to int
                    if float_val.is_integer():
                        data['value'] = int(float_val)
                    else:
                        data['value'] = float_val
                    print(f"Converted number value: {data['value']} (type: {type(data['value'])})")
                except (ValueError, TypeError):
                    raise serializers.ValidationError({"value": f"Value must be a number for attribute '{attr.label}'"})
            
            elif attr.data_type == 'boolean':
                # Convert string representations to boolean
                if isinstance(value, str):
                    if value.lower() in ('true', 't', 'yes', 'y', '1'):
                        data['value'] = True
                    elif value.lower() in ('false', 'f', 'no', 'n', '0'):
                        data['value'] = False
                    else:
                        raise serializers.ValidationError({"value": f"Invalid boolean value for attribute '{attr.label}'"})
                else:
                    # Ensure it's a proper boolean
                    data['value'] = bool(value)
                print(f"Converted boolean value: {data['value']} (type: {type(data['value'])})")
            
            elif attr.data_type == 'date':
                # Validate date format - strictly enforce ISO-8601 (YYYY-MM-DD)
                from datetime import datetime
                import re
                
                # ISO-8601 date format regex (YYYY-MM-DD)
                iso_date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')
                
                if not isinstance(value, str):
                    raise serializers.ValidationError(
                        {"value": f"Date must be a string in ISO-8601 format (YYYY-MM-DD) for attribute '{attr.label}'"}
                    )
                
                if not iso_date_pattern.match(value):
                    raise serializers.ValidationError(
                        {"value": f"Date must be in ISO-8601 format (YYYY-MM-DD) for attribute '{attr.label}'. Got: '{value}'"}
                    )
                
                # Try parsing the date to validate it's a proper date
                try:
                    datetime.strptime(value, '%Y-%m-%d')
                except ValueError:
                    raise serializers.ValidationError(
                        {"value": f"Invalid date value for attribute '{attr.label}'. Must be a valid date in ISO-8601 format (YYYY-MM-DD)"}
                    )
                print(f"Validated date value: {data['value']}")
            
        except Exception as e:
            if not isinstance(e, serializers.ValidationError):
                raise serializers.ValidationError({"value": f"Error validating value: {str(e)}"})
            raise
            
        return data
        
    def create(self, validated_data):
        print(f"AttributeValueSerializer.create: Creating with data: {validated_data}")
        instance = super().create(validated_data)
        print(f"Created attribute value: {instance.id}, value: {instance.value}, type: {type(instance.value)}")
        return instance
        
    def update(self, instance, validated_data):
        print(f"AttributeValueSerializer.update: Updating with data: {validated_data}")
        instance = super().update(instance, validated_data)
        print(f"Updated attribute value: {instance.id}, value: {instance.value}, type: {type(instance.value)}")
        return instance

class AttributeGroupItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeGroupItem
        fields = ('id', 'attribute', 'order')

class AttributeGroupSerializer(serializers.ModelSerializer):
    items = AttributeGroupItemSerializer(source='attributegroupitem_set',
                                         many=True, required=False)
    class Meta:
        model = AttributeGroup
        fields = ('id', 'name', 'order', 'items')
        read_only_fields = ('id',)

    def create(self, validated_data):
        items_data = validated_data.pop('attributegroupitem_set', [])
        
        # Create the group first without items
        group = AttributeGroup.objects.create(**validated_data)
        
        # Add items if any
        if items_data:
            self._sync_items(group, items_data)
            
        return group

    def update(self, instance, validated_data):
        items_data = validated_data.pop('attributegroupitem_set', None)
        
        # Update basic fields
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            self._sync_items(instance, items_data)
            
        return instance

    def _sync_items(self, group, items_data):
        """
        Sync the group items based on the provided data.
        Creates, updates, or deletes items as needed.
        """
        if not items_data:
            print("No items data provided")
            return
            
        print(f"Syncing items for group {group.id}: {len(items_data)} items")
        
        # Get current items for comparison
        current_items = AttributeGroupItem.objects.filter(group=group)
        seen_ids = []
        
        # Process each item from the incoming data
        for position, item_data in enumerate(items_data):
            item_id = item_data.get('id')
            raw_attr = item_data.get('attribute')
            
            # Accept either an int or an Attribute instance
            if isinstance(raw_attr, int):
                attribute_id = raw_attr
            elif hasattr(raw_attr, 'pk'):
                attribute_id = raw_attr.pk
            else:
                raise serializers.ValidationError("attribute must be ID")
            
            print(f"Processing item at position {position}: id={item_id}, attribute={attribute_id}")
            
            # Update existing item's order if it exists
            if item_id:
                try:
                    item = AttributeGroupItem.objects.get(id=item_id)
                    item.order = position
                    item.save()
                    seen_ids.append(item.id)
                    print(f"Updated existing item {item.id}")
                except AttributeGroupItem.DoesNotExist:
                    print(f"Item with id {item_id} not found")
            
            # Create new item if it's not an existing one
            elif attribute_id is not None:
                print(f"Creating new item for attribute {attribute_id}")
                try:
                    # now attribute_id is guaranteed to be int
                    item = AttributeGroupItem.objects.create(
                        group=group,
                        attribute_id=attribute_id,
                        order=position
                    )
                    seen_ids.append(item.id)
                    print(f"Created new item {item.id}")
                except Exception as e:
                    print(f"Error creating item: {e}")
        
        # Delete items not in the incoming data
        items_to_delete = current_items.exclude(id__in=seen_ids)
        if items_to_delete.exists():
            print(f"Deleting items: {list(items_to_delete.values_list('id', flat=True))}")
            items_to_delete.delete() 