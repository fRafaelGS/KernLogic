from rest_framework import serializers
import json
from .models import Product, ProductImage, Activity, ProductRelation, ProductAsset, ProductEvent, Attribute, AttributeValue, AttributeGroupItem, AttributeGroup, SalesChannel, ProductPrice, Category, AttributeOption, AssetBundle, Family, FamilyAttributeGroup, ProductFamilyOverride
from django.db.models import Sum, F, Count, Case, When, Value, FloatField
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db.models.functions import TruncDay
from kernlogic.utils import get_user_organization
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.db import transaction
from prices.serializers import PriceTypeSlugOrIdField  # local import to avoid circular refs
from prices.models import PriceType, Currency

# --- NEW CategorySerializer ---
class CategorySerializer(serializers.ModelSerializer):
    """Serializer for hierarchical category model"""
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'children']

    def get_children(self, obj):
        return CategorySerializer(obj.get_children(), many=True).data

# Simplified CategorySerializer for nested usage
class SimpleCategorySerializer(serializers.ModelSerializer):
    """Simplified category serializer for nesting in products"""
    parent_id = serializers.PrimaryKeyRelatedField(
        source='parent',
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    parent_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'parent_id', 'parent_name']
        read_only_fields = ['parent_name']

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent else None
    
    def to_representation(self, instance):
        """Add additional error handling for parent field"""
        try:
            return super().to_representation(instance)
        except Exception as e:
            # If there's an error in serialization, return a minimal representation
            return {
                'id': instance.id,
                'name': instance.name,
                'parent_id': instance.parent_id if hasattr(instance, 'parent_id') else None,
                'parent_name': instance.parent.name if hasattr(instance, 'parent') and instance.parent else None
            }

# --- NEW SalesChannel Serializer ---
class SalesChannelSerializer(serializers.ModelSerializer):
    """Serializer for sales channels"""
    class Meta:
        model = SalesChannel
        fields = ['id', 'code', 'name', 'description', 'is_active']

# --- NEW ProductPrice Serializer ---
class ProductPriceSerializer(serializers.ModelSerializer):
    """Serializer for product prices (unified payload)"""
    # Use the slug-or-id field so that writes accept either and reads always return the code.
    price_type = PriceTypeSlugOrIdField(queryset=PriceType.objects.all())
    # Human-readable label for UI – duplicate of price_type_display for clarity
    label = serializers.CharField(source='price_type.label', read_only=True)
    price_type_display = serializers.CharField(source='price_type.label', read_only=True)  # keep for BC

    # Always expose currency as ISO code string (e.g. "USD") to match frontend formatCurrency util
    currency = serializers.SlugRelatedField(
        slug_field='iso_code',
        queryset=Currency.objects.all()
    )

    channel = SalesChannelSerializer(read_only=True)
    channel_id = serializers.PrimaryKeyRelatedField(
        queryset=SalesChannel.objects.all(),
        source='channel',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = ProductPrice
        fields = [
            'id', 'price_type', 'price_type_display', 'label',
            'channel', 'channel_id', 'currency', 'amount',
            'valid_from', 'valid_to', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'price_type_display', 'label']

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

class ProductFamilyOverrideSerializer(serializers.ModelSerializer):
    """Serializer for Product Family Override model"""
    
    class Meta:
        model = ProductFamilyOverride
        fields = ['id', 'attribute_group', 'removed']
        read_only_fields = ['id']
        
    def create(self, validated_data):
        """Create with organization and product from context"""
        request = self.context.get('request')
        product_id = self.context.get('product_id')
        
        if not product_id:
            raise serializers.ValidationError({'product': 'Product ID is required'})
            
        # Get organization from product to ensure consistency
        try:
            product = Product.objects.get(id=product_id)
            organization = product.organization
        except Product.DoesNotExist:
            raise serializers.ValidationError({'product': 'Product not found'})
        
        # Create the override
        override = ProductFamilyOverride.objects.create(
            **validated_data,
            product_id=product_id,
            organization=organization
        )
        
        return override

class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model
    """
    created_by = serializers.ReadOnlyField(source='created_by.email')
    prices = ProductPriceSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    attribute_values = serializers.SerializerMethodField(read_only=True)
    primary_image = serializers.ImageField(required=False, allow_null=True)
    primary_image_thumb = serializers.SerializerMethodField()
    primary_image_large = serializers.SerializerMethodField()
    completeness_percent = serializers.SerializerMethodField(read_only=True)
    missing_fields = serializers.SerializerMethodField(read_only=True)
    assets = serializers.SerializerMethodField(read_only=True)
    has_primary_image = serializers.SerializerMethodField(read_only=True)
    primary_image_url = serializers.SerializerMethodField(read_only=True)
    primary_asset = serializers.SerializerMethodField(read_only=True)
    category = serializers.SerializerMethodField()
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    family = serializers.PrimaryKeyRelatedField(
        queryset=Family.objects.all(),
        required=False,
        allow_null=True
    )
    family_overrides = ProductFamilyOverrideSerializer(many=True, required=False, read_only=True)
    effective_attribute_groups = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'prices', 'category', 'category_id', 'brand',
            'barcode', 'tags', 'attribute_values', 'is_active', 'is_archived', 'created_at',
            'updated_at', 'primary_image', 'completeness_percent', 'missing_fields',
            'assets', 'has_primary_image', 'primary_image_url', 'primary_asset', 'organization',
            'created_by', 'images', 'primary_image_thumb', 'primary_image_large', 'family',
            'family_overrides',
            'effective_attribute_groups',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completeness_percent', 
                           'missing_fields', 'assets', 'has_primary_image', 'primary_image_url',
                           'primary_asset', 'organization', 'created_by', 'images',
                           'primary_image_thumb', 'primary_image_large', 'attribute_values',
                           'prices', 'category', 'family_overrides', 'effective_attribute_groups']
    
    def to_representation(self, instance):
        """
        Override to ensure properly handle tags and ensure category is properly represented
        """
        representation = super().to_representation(instance)
        
        # Ensure tags are properly decoded from JSON string to list
        try:
            if instance.tags:
                if isinstance(instance.tags, str):
                    representation['tags'] = json.loads(instance.tags)
                elif not representation.get('tags'):
                    # If tags field exists but isn't populated in representation
                    representation['tags'] = instance.get_tags()
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error decoding tags for product {instance.id}: {e}")
            representation['tags'] = []
        
        # Ensure category is an array
        if 'category' not in representation:
            representation['category'] = []
            
        return representation

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

    def to_internal_value(self, data):
        """
        Convert Python objects to JSON strings for storage
        """
        # Save the tags value before validation (which might modify it)
        tags_data = data.get('tags')
        
        # First perform the basic validation
        validated_data = super().to_internal_value(data)
        
        # Handle tags - ensure they're properly stored as a JSON string
        if 'tags' in data:
            if isinstance(tags_data, list):
                # Clean up tags - make sure they're all valid strings
                cleaned_tags = [str(tag).strip() for tag in tags_data if tag]
                validated_data['tags'] = json.dumps(cleaned_tags)
            elif isinstance(tags_data, str):
                # Handle case where tags might come as a JSON string already
                try:
                    # If it's valid JSON, use it directly
                    parsed = json.loads(tags_data)
                    if isinstance(parsed, list):
                        validated_data['tags'] = tags_data
                    else:
                        # It's JSON but not a list, convert to a list with one item
                        validated_data['tags'] = json.dumps([str(parsed)])
                except json.JSONDecodeError:
                    # Not valid JSON, treat as a single tag
                    validated_data['tags'] = json.dumps([tags_data])
            elif tags_data is None:
                # Set to empty array if tags is explicitly null
                validated_data['tags'] = '[]'
        
        return validated_data

    def validate_sku(self, value):
        """
        Check that the SKU is unique within the organization
        """
        request = self.context.get('request')
        if not request:
            return value
        
        instance = getattr(self, 'instance', None)
        if instance and instance.sku == value:
            return value
            
        # Get the organization using the utility function
        try:
            organization = get_user_organization(request.user)
            
            # Check if a product with this SKU already exists in this organization
            if organization and Product.objects.filter(
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
        try:
            return obj.get_completeness()
        except Exception as e:
            print(f"ERROR: Failed to calculate completeness for product {obj.id}: {str(e)}")
            return 0

    def get_missing_fields(self, obj):
        """Return a list of missing fields for the product"""
        try:
            return obj.get_missing_fields()
        except Exception as e:
            print(f"ERROR: Failed to get missing fields for product {obj.id}: {str(e)}")
            return []

    def get_assets(self, obj):
        """Return a list of assets associated with the product"""
        try:
            assets = obj.assets.all()
            request = self.context.get('request')
            
            # Use the ProductAssetSerializer to serialize the assets
            serializer = ProductAssetSerializer(
                assets, 
                many=True, 
                context={'request': request} if request else {}
            )
            return serializer.data
        except Exception as e:
            print(f"ERROR: Failed to get assets for product {obj.id}: {str(e)}")
            return []

    def get_has_primary_image(self, obj):
        """Return whether the product has a primary image"""
        try:
            # Check if there's a primary image in the images relation
            has_primary = obj.images.filter(is_primary=True).exists()
            
            # If not, check if there's a primary asset
            if not has_primary:
                has_primary = obj.assets.filter(is_primary=True).exists()
                
            # If still not, check if there's a direct primary_image
            if not has_primary:
                has_primary = bool(obj.primary_image)
                
            return has_primary
        except Exception as e:
            print(f"ERROR: Failed to check primary image for product {obj.id}: {str(e)}")
            return False

    def get_primary_image_url(self, obj):
        """Return the URL of the primary image"""
        try:
            # First check for a primary image in the images relation
            primary_image = obj.images.filter(is_primary=True).first()
            if primary_image and primary_image.image:
                return primary_image.image.url
                
            # Then check for a primary asset
            primary_asset = obj.assets.filter(is_primary=True, asset_type='image').first()
            if primary_asset and primary_asset.file:
                return primary_asset.file.url
                
            # Finally, check for a direct primary_image
            if obj.primary_image:
                return obj.primary_image.url
                
            return None
        except Exception as e:
            print(f"ERROR: Failed to get primary image URL for product {obj.id}: {str(e)}")
            return None

    def get_primary_asset(self, obj):
        """Return the primary asset associated with the product"""
        try:
            primary_asset = obj.assets.filter(is_primary=True).first()
            if primary_asset:
                request = self.context.get('request')
                serializer = ProductAssetSerializer(
                    primary_asset, 
                    context={'request': request} if request else {}
                )
                return serializer.data
            return None
        except Exception as e:
            print(f"ERROR: Failed to get primary asset for product {obj.id}: {str(e)}")
            return None

    def get_attribute_values(self, obj):
        """Return the attribute values for this product"""
        try:
            from products.serializers import AttributeValueDetailSerializer
            attribute_values = obj.attribute_values.all()
            serializer = AttributeValueDetailSerializer(attribute_values, many=True)
            return serializer.data
        except Exception as e:
            print(f"ERROR: Failed to get attribute values for product {obj.id}: {str(e)}")
            return []

    def get_category(self, obj):
        """
        Return the full hierarchy for this product's category as an
        ordered list [root, ..., leaf], or [] if none.
        """
        if not obj.category:
            return []
        
        # Get all ancestors including self, ordered from root to leaf
        ancestors = obj.category.get_ancestors(include_self=True)
        return CategorySerializer(ancestors, many=True).data

    def validate_family(self, value):
        """
        Validate that the product has values for all required attributes in the family.
        Only runs on updates, not on creation (since attributes are added after creation).
        """
        # Skip validation for new products or when family is being removed
        instance = getattr(self, 'instance', None)
        if not instance or not value:
            return value
            
        # Get all required attribute groups for this family
        required_groups = FamilyAttributeGroup.objects.filter(
            family=value,
            required=True
        ).select_related('attribute_group')
        
        # If no required groups, return early
        if not required_groups:
            return value
            
        # Get all attributes that are in required groups
        required_attribute_ids = set()
        for family_group in required_groups:
            # Get all attributes in this group
            group_attribute_ids = AttributeGroupItem.objects.filter(
                group=family_group.attribute_group
            ).values_list('attribute_id', flat=True)
            required_attribute_ids.update(group_attribute_ids)
            
        # If no required attributes, return early
        if not required_attribute_ids:
            return value
            
        # Get all attribute values for this product
        existing_attribute_ids = set(instance.attribute_values.values_list('attribute_id', flat=True))
        
        # Find missing required attributes
        missing_attribute_ids = required_attribute_ids - existing_attribute_ids
        
        if missing_attribute_ids:
            # Get attribute details for error message
            missing_attributes = Attribute.objects.filter(id__in=missing_attribute_ids)
            missing_names = [attr.label for attr in missing_attributes]
            
            raise serializers.ValidationError(
                f"This product is missing required attributes for this family: {', '.join(missing_names)}"
            )
            
        return value

    def get_effective_attribute_groups(self, obj):
        """
        Calculate effective attribute groups for a product based on:
        1. Family's attribute groups
        2. Minus any removed via overrides
        3. Plus any added via overrides
        
        Products can ONLY have attribute groups through family inheritance and overrides,
        not through direct assignment.
        """
        # Get family groups if a family is assigned
        family_groups = []
        if obj.family:
            family_groups = obj.family.attribute_groups.all().values_list(
                'attribute_group_id', flat=True
            )
            
        # Get overrides
        removed_groups = obj.family_overrides.filter(removed=True).values_list(
            'attribute_group_id', flat=True
        )
        added_groups = obj.family_overrides.filter(removed=False).values_list(
            'attribute_group_id', flat=True
        )
        
        # Calculate effective groups - strictly based on family and overrides
        effective_group_ids = (set(family_groups) - set(removed_groups)) | set(added_groups)
        
        # Get the actual groups and serialize them
        if effective_group_ids:
            effective_groups = AttributeGroup.objects.filter(id__in=effective_group_ids)
            return AttributeGroupSerializer(effective_groups, many=True).data
        return []

    def update(self, instance, validated_data):
        """
        Update method that only persists family and handles family_overrides.
        Discards any direct attribute_groups assignments that might be in the payload.
        """
        # Extract and handle family_overrides if present
        overrides_data = self.context.get('overrides')
        
        if overrides_data is not None:
            # Get organization to maintain consistency
            organization = instance.organization
            
            # Clear existing overrides and create new ones
            with transaction.atomic():
                instance.family_overrides.all().delete()
                
                for override_data in overrides_data:
                    ProductFamilyOverride.objects.create(
                        product=instance,
                        attribute_group_id=override_data['attribute_group'],
                        removed=override_data['removed'],
                        organization=organization
                    )
        
        # Remove any attribute_groups data if present (we don't allow direct assignment)
        if 'attribute_groups' in validated_data:
            validated_data.pop('attribute_groups')
        
        # Continue with normal update
        return super().update(instance, validated_data)

class ProductRelationSerializer(serializers.ModelSerializer):
    """Serializer for product relations"""
    class Meta:
        model = ProductRelation
        fields = ['id', 'product', 'related_product', 'relationship_type', 'is_pinned', 'notes', 'created_at']
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
        fields = ['id', 'organization', 'user', 'user_name', 'entity', 'entity_id', 
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
    
    # Add attribute-related fields
    attributes_missing_count = serializers.IntegerField(required=False, default=0)
    mandatory_attributes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    
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
    tags = serializers.ListField(child=serializers.CharField(), required=False)
    
    class Meta:
        model = ProductAsset
        fields = [
            'id', 'file', 'file_url', 'asset_type', 'name', 'order', 
            'is_primary', 'content_type', 'file_size', 'file_size_formatted',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'product', 'tags'
        ]
        read_only_fields = ['product', 'uploaded_at', 'file_url', 'uploaded_by_name', 'file_size_formatted']
    
    def to_representation(self, instance):
        """Override to handle tags"""
        representation = super().to_representation(instance)
        
        # Ensure tags are returned as a list
        if instance.tags is None:
            representation['tags'] = []
            
        return representation
        
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
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductEvent
        fields = ["id", "event_type", "summary", "payload", "created_at", "created_by_name"]

    def get_created_by_name(self, obj):
        user = obj.created_by
        if user:
            # prefer full name, otherwise username
            full = user.get_full_name()
            return full if full.strip() else user.username
        # if no user, it really was the system
        return 'System'

# Add the Attribute serializers
class AttributeSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Attribute
        fields = '__all__'
        read_only_fields = ('id', 'organization', 'created_by')

    def get_options(self, obj):
        """Return the options for this attribute"""
        try:
            return AttributeOptionSerializer(obj.attributeoption_set.all(), many=True).data
        except Exception as e:
            print(f"ERROR: Failed to get options for attribute {obj.id}: {str(e)}")
            return []

class AttributeValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeValue
        fields = '__all__'
        # Make product and attribute still writable during creation but read-only for updates
        read_only_fields = ('id', 'organization', 'created_by')
        extra_kwargs = {
            'attribute': {'read_only': False},
            # When using nested product endpoints the product FK is implied by
            # the URL; therefore it must **not** be required on the payload to
            # pass serializer validation.  Still keep it writable for the
            # flat `/api/attributes/` endpoint.
            'product': {'read_only': False},
        }

    def validate(self, data):
        print(f"AttributeValueSerializer.validate called with data: {data}")
        print(f"Self instance: {getattr(self, 'instance', None)}")
        print(f"Self context: {self.context}")
        
        # Get the attribute from the context set in the view
        attr = getattr(self.instance, 'attribute', None)
        if not attr and 'attribute' in self.context:
            attr = self.context.get('attribute')
            
        print(f"Attribute from context or instance: {attr}")
            
        # If we still don't have an attribute, skip validation
        if not attr:
            print("WARNING: No attribute found in context or instance!")
            return data
            
        org = get_user_organization(self.context['request'].user)
        
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
            
            elif attr.data_type == 'rich_text':
                # Validate rich text (HTML) and sanitize it with Bleach
                import bleach
                
                if not isinstance(value, str):
                    raise serializers.ValidationError({"value": f"Rich text must be a string for attribute '{attr.label}'"})
                
                # Define allowed tags and attributes for sanitization
                allowed_tags = [
                    'a', 'abbr', 'acronym', 'b', 'blockquote', 'code', 'em', 'i', 'li', 'ol', 'p',
                    'strong', 'ul', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'br', 'hr'
                ]
                allowed_attrs = {
                    'a': ['href', 'title', 'target'],
                    'abbr': ['title'],
                    'acronym': ['title'],
                    'span': ['style'],
                }
                
                # Sanitize the HTML
                sanitized_value = bleach.clean(value, tags=allowed_tags, attributes=allowed_attrs)
                data['value'] = sanitized_value
                print(f"Sanitized rich text value: {data['value']}")
            
            elif attr.data_type == 'price':
                # Value must be a dict with amount (decimal) and currency (string)
                if not isinstance(value, dict):
                    raise serializers.ValidationError({"value": f"Price must be an object with amount and currency for attribute '{attr.label}'"})
                
                # Check required keys
                if 'amount' not in value or 'currency' not in value:
                    raise serializers.ValidationError({"value": f"Price must contain both amount and currency for attribute '{attr.label}'"})
                
                # Validate amount (must be a non-negative decimal)
                try:
                    amount = float(value['amount'])
                    if amount < 0:
                        raise serializers.ValidationError({"value": f"Price amount must be non-negative for attribute '{attr.label}'"})
                    # Store as float (frontend will format)
                    value['amount'] = amount
                except (ValueError, TypeError):
                    raise serializers.ValidationError({"value": f"Price amount must be a number for attribute '{attr.label}'"})
                
                # Validate currency (must exist in Currency table)
                from prices.models import Currency
                currency_code = str(value['currency']).upper()
                if not Currency.objects.filter(iso_code=currency_code).exists():
                    raise serializers.ValidationError({"value": f"Invalid currency code '{currency_code}' for attribute '{attr.label}'"})
                
                value['currency'] = currency_code
                data['value'] = value
                print(f"Validated price value: {data['value']}")
            
            elif attr.data_type == 'media':
                # Value must be a dict with asset_id (int)
                if not isinstance(value, dict):
                    raise serializers.ValidationError({"value": f"Media value must be an object with asset_id for attribute '{attr.label}'"})
                
                # Check required keys
                if 'asset_id' not in value:
                    raise serializers.ValidationError({"value": f"Media value must contain asset_id for attribute '{attr.label}'"})
                
                # Validate asset_id (must be an integer and exist in Asset table)
                try:
                    asset_id = int(value['asset_id'])
                    value['asset_id'] = asset_id
                except (ValueError, TypeError):
                    raise serializers.ValidationError({"value": f"Media asset_id must be an integer for attribute '{attr.label}'"})
                
                # Check if asset exists and belongs to the same organization
                from .models import ProductAsset
                if not ProductAsset.objects.filter(id=asset_id, organization=org).exists():
                    raise serializers.ValidationError({"value": f"Asset with ID {asset_id} does not exist or doesn't belong to your organization"})
                
                data['value'] = value
                print(f"Validated media value: {data['value']}")
            
            elif attr.data_type == 'measurement':
                # Value must be a dict with amount (decimal) and unit (string)
                if not isinstance(value, dict):
                    raise serializers.ValidationError({"value": f"Measurement must be an object with amount and unit for attribute '{attr.label}'"})
                
                # Check required keys
                if 'amount' not in value:
                    raise serializers.ValidationError({"value": f"Measurement must contain amount for attribute '{attr.label}'"})
                
                # Validate amount (must be a non-negative decimal)
                try:
                    amount = float(value['amount'])
                    if amount < 0:
                        raise serializers.ValidationError({"value": f"Measurement amount must be non-negative for attribute '{attr.label}'"})
                    value['amount'] = amount
                except (ValueError, TypeError):
                    raise serializers.ValidationError({"value": f"Measurement amount must be a number for attribute '{attr.label}'"})
                
                # Validate unit if present
                if 'unit' in value and value['unit']:
                    # If allowedUnits exists in the context or somewhere else, validate against it
                    allowed_units = self.context.get('allowed_units', None)
                    if allowed_units and value['unit'] not in allowed_units:
                        raise serializers.ValidationError({"value": f"Invalid measurement unit '{value['unit']}'. Allowed units: {', '.join(allowed_units)}"})
                
                data['value'] = value
                print(f"Validated measurement value: {data['value']}")
            
            elif attr.data_type == 'url':
                # Validate URL format
                from django.core.validators import URLValidator
                from django.core.exceptions import ValidationError as DjangoValidationError
                
                if not isinstance(value, str):
                    raise serializers.ValidationError({"value": f"URL must be a string for attribute '{attr.label}'"})
                
                # Validate URL
                url_validator = URLValidator()
                try:
                    url_validator(value)
                except DjangoValidationError:
                    raise serializers.ValidationError({"value": f"Invalid URL format for attribute '{attr.label}'"})
                
                data['value'] = value
                print(f"Validated URL value: {data['value']}")
            
            elif attr.data_type == 'email':
                # Validate email format
                from django.core.validators import validate_email
                from django.core.exceptions import ValidationError as DjangoValidationError
                
                if not isinstance(value, str):
                    raise serializers.ValidationError({"value": f"Email must be a string for attribute '{attr.label}'"})
                
                # Validate email
                try:
                    validate_email(value)
                except DjangoValidationError:
                    raise serializers.ValidationError({"value": f"Invalid email format for attribute '{attr.label}'"})
                
                data['value'] = value
                print(f"Validated email value: {data['value']}")
            
            elif attr.data_type == 'phone':
                # Validate phone number
                import phonenumbers
                
                if not isinstance(value, str):
                    raise serializers.ValidationError({"value": f"Phone number must be a string for attribute '{attr.label}'"})
                
                # Default region (can be configurable)
                default_region = 'US'
                
                try:
                    # Parse phone number
                    parsed_number = phonenumbers.parse(value, default_region)
                    
                    # Check if it's a valid number
                    if not phonenumbers.is_valid_number(parsed_number):
                        raise serializers.ValidationError({"value": f"Invalid phone number format for attribute '{attr.label}'"})
                    
                    # Format to E.164 (optional, for standardization)
                    data['value'] = phonenumbers.format_number(parsed_number, phonenumbers.PhoneNumberFormat.E164)
                except phonenumbers.NumberParseException:
                    raise serializers.ValidationError({"value": f"Could not parse phone number for attribute '{attr.label}'"})
                
                print(f"Validated phone value: {data['value']}")
            
        except Exception as e:
            if not isinstance(e, serializers.ValidationError):
                raise serializers.ValidationError({"value": f"Error validating value: {str(e)}"})
            raise
            
        # If attribute not in data, add it
        if 'attribute' not in data and attr:
            print(f"Adding attribute {attr.id} to validated data")
            data['attribute'] = attr
            
        return data
        
    def create(self, validated_data):
        print(f"AttributeValueSerializer.create: Creating with data: {validated_data}")
        print(f"Attribute in data: {validated_data.get('attribute', 'Not found')}")
        print(f"Product in data: {validated_data.get('product', 'Not found')}")
        print(f"Organization in data: {validated_data.get('organization', 'Not found')}")
        print(f"Created by in data: {validated_data.get('created_by', 'Not found')}")
        
        # Ensure attribute is present
        if 'attribute' not in validated_data:
            print("ERROR: attribute not in validated_data!")
            if 'attribute' in self.context:
                print(f"Adding attribute from context: {self.context['attribute'].id}")
                validated_data['attribute'] = self.context['attribute']
                
        instance = super().create(validated_data)
        print(f"Created attribute value: {instance.id}, value: {instance.value}, type: {type(instance.value)}")
        return instance
        
    def update(self, instance, validated_data):
        print(f"AttributeValueSerializer.update: Updating with data: {validated_data}")
        instance = super().update(instance, validated_data)
        print(f"Updated attribute value: {instance.id}, value: {instance.value}, type: {type(instance.value)}")
        return instance

# Add the missing AttributeValueDetailSerializer
class AttributeValueDetailSerializer(AttributeValueSerializer):
    """
    Serializer for attribute values with more detailed attribute information.
    Used for list and retrieve actions.
    """
    attribute_code = serializers.CharField(source='attribute.code', read_only=True)
    attribute_label = serializers.CharField(source='attribute.label', read_only=True)
    attribute_type = serializers.CharField(source='attribute.data_type', read_only=True)
    
    class Meta(AttributeValueSerializer.Meta):
        # Since parent's fields is '__all__', we need to explicitly list all fields
        fields = ('id', 'attribute', 'product', 'organization', 'value', 'locale', 'channel',
                'attribute_code', 'attribute_label', 'attribute_type')

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
        
        # Check if attempting to update items through PATCH
        if items_data is not None:
            raise serializers.ValidationError(
                "Use POST /api/attribute-groups/<id>/items/ to add or DELETE /api/attribute-groups/<id>/items/<item_id>/ to remove"
            )
        
        # Update basic fields
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        
        return instance

    def _sync_items(self, group, items_data):
        """
        Only order-update existing items – creation / deletion are now handled by viewset.
        """
        if not items_data:
            print("No items data provided")
            return
            
        print(f"Syncing items for group {group.id}: {len(items_data)} items")
        
        # Create id to item mapping 
        id_map = {i.get('id'): i for i in items_data if i.get('id')}
        
        # Update order of existing items
        for position, (item_id, payload) in enumerate(id_map.items()):
            AttributeGroupItem.objects.filter(id=item_id, group=group).update(
                order=payload.get('order', position)
            ) 

# Serializer for AttributeOption
class AttributeOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeOption
        fields = ['id', 'value', 'label', 'order'] 

class AssetBundleSerializer(serializers.ModelSerializer):
    asset_ids = serializers.PrimaryKeyRelatedField(queryset=ProductAsset.objects.all(), many=True, source='assets')
    class Meta:
        model = AssetBundle
        fields = ['id','name','asset_ids','created_at'] 

# --- NEW FamilyAttributeGroupSerializer ---
class FamilyAttributeGroupSerializer(serializers.ModelSerializer):
    """Serializer for the FamilyAttributeGroup pivot model"""
    attribute_group = serializers.PrimaryKeyRelatedField(queryset=AttributeGroup.objects.all())
    
    class Meta:
        model = FamilyAttributeGroup
        fields = ['id', 'attribute_group', 'required', 'order']
        read_only_fields = ['id']

    def validate(self, data):
        from kernlogic.utils import get_user_organization
        
        # Use get_user_organization instead of directly accessing user.organization
        org = get_user_organization(self.context['request'].user) if 'request' in self.context else None
        if org and data['attribute_group'].organization != org:
            raise serializers.ValidationError('Attribute group must belong to your organization.')
        return data

# --- NEW FamilySerializer ---
class FamilySerializer(serializers.ModelSerializer):
    """Serializer for Product Family model"""
    attribute_groups = FamilyAttributeGroupSerializer(many=True, required=False)
    
    class Meta:
        model = Family
        fields = ['id', 'code', 'label', 'description', 'attribute_groups', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        
    def validate_code(self, value):
        """Ensure code is unique within the organization"""
        org = get_user_organization(self.context['request'].user) if 'request' in self.context else None
        qs = Family.objects.filter(code=value)
        if org:
            qs = qs.filter(organization=org)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Family code must be unique within your organization.')
        return value
        
    def create(self, validated_data):
        """Create a new family with nested attribute groups"""
        attribute_groups_data = validated_data.pop('attribute_groups', [])
        
        # Get organization and created_by from kwargs if not in validated_data
        request = self.context.get('request')
        
        # Only set organization and created_by if they're not already in validated_data
        create_kwargs = {**validated_data}
        
        if 'organization' not in validated_data and request:
            create_kwargs['organization'] = get_user_organization(request.user)
            
        if 'created_by' not in validated_data and request:
            create_kwargs['created_by'] = request.user
            
        # Create the family
        family = Family.objects.create(**create_kwargs)
        
        # Create attribute group associations
        organization = create_kwargs.get('organization')
        for group_data in attribute_groups_data:
            FamilyAttributeGroup.objects.create(
                family=family,
                organization=organization,
                **group_data
            )
            
        return family
        
    def update(self, instance, validated_data):
        """Update a family with nested attribute groups"""
        attribute_groups_data = validated_data.pop('attribute_groups', None)
        
        # Update family fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update attribute groups if provided
        if attribute_groups_data is not None:
            # Clear existing attribute groups
            instance.attribute_groups.all().delete()
            
            # Create new attribute groups
            for group_data in attribute_groups_data:
                FamilyAttributeGroup.objects.create(
                    family=instance,
                    organization=instance.organization,
                    **group_data
                )
                
        return instance 