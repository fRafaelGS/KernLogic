from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
import json
from mptt.models import MPTTModel, TreeForeignKey

User = get_user_model()

# New Locale model for dynamic, per-organization locales
class Locale(models.Model):
    """
    Represents a language/locale that can be used by an organization.
    """
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    code = models.CharField(max_length=10)
    label = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Locale"
        verbose_name_plural = "Locales"
        ordering = ['code']
        unique_together = [('organization', 'code')]
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.label} ({self.code})"

# New SalesChannel model
class SalesChannel(models.Model):
    """
    Represents a sales channel (e.g., website, marketplace, retail store)
    """
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        verbose_name = "Sales Channel"
        verbose_name_plural = "Sales Channels"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['organization']),
        ]

# New hierarchical Category model
class Category(MPTTModel):
    """
    Hierarchical category model for products
    """
    name = models.CharField(max_length=100)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class MPTTMeta:
        order_insertion_by = ['name']

    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        unique_together = [('name', 'parent', 'organization')]

class Family(models.Model):
    """
    Represents a product family that can have associated attribute groups
    """
    code = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name = "Product Family"
        verbose_name_plural = "Product Families"
        ordering = ['code']
        indexes = [
            models.Index(fields=['organization']),
        ]

    def __str__(self):
        return self.label

class Product(models.Model):
    # Basic Product Information (Required)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50)
    category = TreeForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)  # Updated to use Category model
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Multi-tenant support
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    
    # Product family
    family = models.ForeignKey("products.Family", on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    
    # Additional Product Information (Optional)
    brand = models.CharField(max_length=100, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    
    # JSON fields (stored as text in SQLite)
    tags = models.TextField(blank=True, null=True)
    attributes = models.TextField(blank=True, null=True)
    
    class Meta:
        """Meta options for Product"""
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['-created_at']
        # Add a unique_together constraint for organization and sku
        unique_together = [('organization', 'sku')]
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['category']),
            models.Index(fields=['brand']),
            models.Index(fields=['organization']),
            models.Index(fields=['organization', 'sku']),
        ]

    def __str__(self):
        return f"{self.name} (SKU: {self.sku})"
        
    # Helper methods for JSON fields
    def get_tags(self):
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in tags for product {self.id}: {e}")
            return []
        except Exception as e:
            print(f"ERROR: Failed to parse tags for product {self.id}: {e}")
            return []
        
    def set_tags(self, tags_list):
        try:
            self.tags = json.dumps(tags_list)
        except Exception as e:
            print(f"ERROR: Failed to serialize tags for product {self.id}: {e}")
            self.tags = "[]"  # Set a valid empty JSON array as fallback
        
    def get_attributes(self):
        if not self.attributes:
            return {}
        try:
            return json.loads(self.attributes)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in attributes for product {self.id}: {e}")
            return {}
        except Exception as e:
            print(f"ERROR: Failed to parse attributes for product {self.id}: {e}")
            return {}
        
    def set_attributes(self, attributes_dict):
        try:
            self.attributes = json.dumps(attributes_dict)
        except Exception as e:
            print(f"ERROR: Failed to serialize attributes for product {self.id}: {e}")
            self.attributes = "{}"  # Set a valid empty JSON object as fallback
        
    def get_completeness(self):
        """
        Calculate product data completeness as a percentage with weighted fields.
        Includes all visible fields with different weights for required vs optional fields.
        """
        # Define field weights: required fields (2x), optional fields (1x)
        field_weights = {
            # Required fields (weight 2)
            'name': {'weight': 2, 'check': lambda: self.name is not None and self.name.strip() != ''},
            'sku': {'weight': 2, 'check': lambda: self.sku is not None and self.sku.strip() != ''},
            
            # Important fields (weight 1.5)
            'description': {'weight': 1.5, 'check': lambda: self.description is not None and self.description.strip() != ''},
            'category': {'weight': 1.5, 'check': lambda: self.category is not None},
            
            # Optional fields (weight 1)
            'brand': {'weight': 1, 'check': lambda: self.brand is not None and self.brand.strip() != ''},
            'barcode': {'weight': 1, 'check': lambda: self.barcode is not None and self.barcode.strip() != ''},
            'tags': {'weight': 1, 'check': lambda: self._check_tags_not_empty()},
            'attributes': {'weight': 1, 'check': lambda: self._check_attribute_values_complete()},
        }
        
        # Calculate weighted completeness
        total_weight = sum(field['weight'] for field in field_weights.values())
        completed_weight = sum(
            field['weight'] for field in field_weights.values() 
            if self._safely_check_field(field['check'])
        )
        
        if total_weight == 0:
            return 0
            
        return round((completed_weight / total_weight) * 100)
    
    def _safely_check_field(self, check_function):
        """Helper to safely check field conditions with error handling"""
        try:
            return check_function()
        except Exception as e:
            print(f"ERROR: Field check failed for product {self.id}: {e}")
            return False
            
    def _check_tags_not_empty(self):
        """Helper to safely check if tags are not empty"""
        try:
            if not self.tags:
                return False
            tags = json.loads(self.tags)
            return bool(tags and len(tags) > 0)
        except json.JSONDecodeError:
            return False
        except Exception:
            return False
            
    def _check_attribute_values_not_empty(self):
        """Helper to check if attribute values exist for this product"""
        try:
            # Focus exclusively on the AttributeValue entries in the database 
            # instead of checking the legacy attributes JSON field
            from django.db.models import Count
            attr_count = self.attribute_values.count()
            return attr_count > 0
        except Exception as e:
            print(f"ERROR: Attribute values check failed for product {self.id}: {e}")
            return False

    def _check_attribute_values_complete(self):
        """
        Check if the product has values for all attributes defined for its organization.
        Returns True if all attributes have values, False otherwise.
        """
        try:
            # Get all attribute IDs that should exist for this organization
            all_attr_ids = set(Attribute.objects
                .filter(organization=self.organization)
                .values_list('id', flat=True)
            )
            
            # If there are no attributes defined, consider it complete
            if not all_attr_ids:
                return True
            
            # Get the attribute IDs that actually have values for this product
            filled_ids = set(self.attribute_values
                .values_list('attribute_id', flat=True)
            )
            
            # If the sets are equal, all attributes have values
            return all_attr_ids == filled_ids
        except Exception as e:
            print(f"ERROR: Attribute completeness check failed for product {self.id}: {e}")
            return False

    def get_missing_fields(self):
        """
        Return a list of field names that are missing data along with their weights
        """
        missing = []
        
        # Check individual fields
        if not self.name or self.name.strip() == '':
            missing.append({'field': 'Name', 'weight': 2})
        if not self.sku or self.sku.strip() == '':
            missing.append({'field': 'SKU', 'weight': 2})
        if not self.description or self.description.strip() == '':
            missing.append({'field': 'Description', 'weight': 1.5})
        if not self.category:
            missing.append({'field': 'Category', 'weight': 1.5})
        if not self.brand or self.brand.strip() == '':
            missing.append({'field': 'Brand', 'weight': 1})
        if not self.barcode or self.barcode.strip() == '':
            missing.append({'field': 'GTIN/Barcode', 'weight': 1})
            
        # Check JSON fields safely
        try:
            if not self.tags or not json.loads(self.tags or '[]'):
                missing.append({'field': 'Tags', 'weight': 1})
        except json.JSONDecodeError:
            missing.append({'field': 'Tags', 'weight': 1})
        except Exception:
            missing.append({'field': 'Tags', 'weight': 1})
            
        # Check attribute values for completeness
        try:
            # Get all attribute IDs that should exist for this organization
            all_attr_ids = set(Attribute.objects
                .filter(organization=self.organization)
                .values_list('id', flat=True)
            )
            
            # If there are attributes defined
            if all_attr_ids:
                # Get the attribute IDs that actually have values for this product
                filled_ids = set(self.attribute_values
                    .values_list('attribute_id', flat=True)
                )
                
                # Find missing attribute IDs
                missing_attr_ids = all_attr_ids - filled_ids
                
                # If there are missing attributes, add them to the missing fields list
                if missing_attr_ids:
                    # Get details of the missing attributes
                    missing_attrs = Attribute.objects.filter(id__in=missing_attr_ids)
                    for attr in missing_attrs:
                        missing.append({
                            'field': f'Attribute: {attr.label}', 
                            'weight': 1,
                            'attribute_id': attr.id
                        })
        except Exception as e:
            print(f"ERROR: Failed to check missing attributes for product {self.id}: {e}")
            missing.append({'field': 'Attributes', 'weight': 1})
            
        return missing
        
    def get_field_completeness(self):
        """
        Return detailed information about field completeness
        """
        # Helper to safely load JSON
        def safe_json_length(json_str, default='[]'):
            try:
                data = json.loads(json_str or default)
                return len(data) > 0
            except (json.JSONDecodeError, TypeError, Exception):
                return False
                
        # Check attribute completeness using the new method
        attributes_complete = self._check_attribute_values_complete()
            
        all_fields = [
            {'field': 'Name', 'weight': 2, 'complete': bool(self.name and self.name.strip())},
            {'field': 'SKU', 'weight': 2, 'complete': bool(self.sku and self.sku.strip())},
            {'field': 'Description', 'weight': 1.5, 'complete': bool(self.description and self.description.strip())},
            {'field': 'Category', 'weight': 1.5, 'complete': bool(self.category)},
            {'field': 'Brand', 'weight': 1, 'complete': bool(self.brand and self.brand.strip())},
            {'field': 'GTIN/Barcode', 'weight': 1, 'complete': bool(self.barcode and self.barcode.strip())},
            {'field': 'Tags', 'weight': 1, 'complete': safe_json_length(self.tags, '[]')},
            {'field': 'Attributes', 'weight': 1, 'complete': attributes_complete}
        ]
        
        # Add detailed attribute completeness information
        try:
            # Get all attribute IDs that should exist for this organization
            all_attr_ids = set(Attribute.objects
                .filter(organization=self.organization)
                .values_list('id', flat=True)
            )
            
            # If there are attributes defined
            if all_attr_ids:
                # Get the attribute IDs that actually have values for this product
                filled_ids = set(self.attribute_values
                    .values_list('attribute_id', flat=True)
                )
                
                # Get details of all attributes
                all_attributes = Attribute.objects.filter(id__in=all_attr_ids)
                
                # Add each individual attribute as a separate item in the field completeness list
                for attr in all_attributes:
                    is_complete = attr.id in filled_ids
                    all_fields.append({
                        'field': f'Attribute: {attr.label}',
                        'weight': 1,
                        'complete': is_complete,
                        'attribute_id': attr.id,
                        'attribute_code': attr.code,
                        'attribute_type': attr.data_type
                    })
        except Exception as e:
            print(f"ERROR: Failed to add attribute details to field completeness for product {self.id}: {str(e)}")
        
        return all_fields

class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    image = models.ImageField(
        upload_to='product_images/'
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which images are displayed"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Is this the main image for the product?"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Image for {self.product.name} (Order: {self.order})"

class ProductRelation(models.Model):
    """
    Stores relationships between products (e.g., related products, accessories)
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='relations'
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    related_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='related_to'
    )
    relationship_type = models.CharField(
        max_length=50,
        default='related',
        help_text="Type of relationship (e.g., 'related', 'accessory', 'alternative')"
    )
    is_pinned = models.BooleanField(
        default=False,
        help_text="Whether this related product should be highlighted"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="Additional notes about the relationship between these products"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_product_relations'
    )

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        # Prevent duplicate relationships between the same products
        unique_together = ['product', 'related_product']

    def __str__(self):
        return f"{self.product.name} → {self.related_product.name} ({self.relationship_type})"

class Activity(models.Model):
    """
    Activity log for tracking user actions on products
    """
    ACTION_CHOICES = (
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('archived', 'Archived'),
    )
    
    # Remove integer company_id, rely only on organization UUID
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='activities'
    )
    entity = models.CharField(max_length=50)  # e.g., 'product'
    entity_id = models.CharField(max_length=40)  # Changed to CharField to support both int and UUID
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'created_at']),
            models.Index(fields=['entity', 'entity_id']),
        ]
        verbose_name_plural = 'Activities'
    
    def __str__(self):
        return f"{self.action} {self.entity} {self.entity_id} by {self.user}"

class ProductAsset(models.Model):
    """
    Stores product assets (images, documents, etc.)
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='assets'
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    file = models.FileField(
        upload_to='product_assets/'
    )
    asset_type = models.CharField(
        max_length=20,
        default='image',
        help_text="Type of asset (image, video, document, etc.)"
    )
    name = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which assets are displayed"
    )
    is_primary = models.BooleanField(
        default=False,
        help_text="Is this the main asset for the product?"
    )
    content_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="MIME type of the file"
    )
    file_size = models.PositiveIntegerField(
        default=0,
        help_text="Size of the file in bytes"
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="List of tags associated with this asset"
    )
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_assets'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Product Assets'

    def __str__(self):
        return f"{self.asset_type.capitalize()} for {self.product.name} (Order: {self.order})"

class ProductEvent(models.Model):
    product      = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="events")
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    event_type   = models.CharField(max_length=50)               # e.g. "created", "price_changed"
    summary      = models.CharField(max_length=255)              # short sentence for cards
    payload      = models.JSONField(null=True, blank=True)       # diff or extra data for power-users
    created_at   = models.DateTimeField(auto_now_add=True)
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-created_at"]

# Attribute models for product attributes
class Attribute(models.Model):
    """
    Model representing product attribute definitions.
    """
    DATA_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('boolean', 'Boolean'),
        ('date', 'Date'),
        ('select', 'Select'),
        ('rich_text', 'Rich Text'),
        ('price', 'Price'),
        ('media', 'Media'),
        ('measurement', 'Measurement'),
        ('url', 'URL'),
        ('email', 'Email'),
        ('phone', 'Phone'),
    ]

    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    code = models.CharField(max_length=64, help_text="Slug-like unique identifier per organization")
    label = models.CharField(max_length=255)
    data_type = models.CharField(max_length=16, choices=DATA_TYPE_CHOICES)
    is_localisable = models.BooleanField(default=False)
    is_scopable = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        unique_together = [('organization', 'code')]
        index_together = [('organization', 'data_type')]
        
    def __str__(self):
        return f"{self.label} ({self.code})"

class AttributeValue(models.Model):
    """
    Model representing product attribute values.
    """
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attribute_values')
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    locale = models.ForeignKey(
        "products.Locale", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='attribute_values',
        help_text="The locale for this attribute value"
    )
    locale_code = models.CharField(max_length=10, null=True, blank=True, 
                                  help_text="Legacy locale code field, use 'locale' instead")
    channel = models.CharField(max_length=32, null=True, blank=True)
    value = models.JSONField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, editable=False)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['organization','product','attribute'],
                condition=models.Q(locale__isnull=True, channel__isnull=True),
                name='uniq_attr_global'
            ),
            models.UniqueConstraint(
                fields=['organization','product','attribute','locale'],
                condition=models.Q(channel__isnull=True),
                name='uniq_attr_locale'
            ),
            models.UniqueConstraint(
                fields=['organization','product','attribute','channel'],
                condition=models.Q(locale__isnull=True),
                name='uniq_attr_channel'
            ),
            models.UniqueConstraint(
                fields=['organization','product','attribute','locale','channel'],
                name='uniq_attr_locale_channel'
            ),
        ]
        
    def __str__(self):
        attr_code = self.attribute.code if self.attribute else 'unknown'
        locale_info = f" ({self.locale.code})" if self.locale else ""
        return f"{attr_code}{locale_info}: {self.value} (Product: {self.product_id})"

class AttributeGroup(models.Model):
    """
    Model representing groups of related attributes.
    """
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    order = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL,
                                  on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        unique_together = ('organization', 'name')
        ordering = ('order', 'id')
        
    def __str__(self):
        return f"{self.name} (Organization: {self.organization_id})"

class AttributeGroupItem(models.Model):
    """
    Through-table connecting attributes to groups with ordering.
    """
    group = models.ForeignKey(AttributeGroup, on_delete=models.CASCADE)
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    order = models.PositiveSmallIntegerField(default=0)
    
    class Meta:
        unique_together = ('group', 'attribute')
        ordering = ('order',)
        
    def __str__(self):
        return f"{self.attribute.code} in {self.group.name} (Order: {self.order})"

# New ProductPrice model for multiple price types
class ProductPrice(models.Model):
    """
    Represents different types of prices for a product across sales channels
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="prices")
    price_type = models.ForeignKey('prices.PriceType', on_delete=models.PROTECT, related_name="product_app_prices", db_column='price_type_id')
    channel = models.ForeignKey(SalesChannel, on_delete=models.SET_NULL, null=True, blank=True)
    currency = models.ForeignKey('prices.Currency', on_delete=models.PROTECT, related_name="product_app_prices", to_field='iso_code', db_column='currency_id')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.price_type.label} for {self.product.name}: {self.currency.symbol}{self.amount}"
    
    class Meta:
        verbose_name = "Product Price"
        verbose_name_plural = "Product Prices"
        ordering = ['-created_at']
        unique_together = [('product', 'price_type', 'channel', 'currency')]
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['price_type']),
            models.Index(fields=['channel']),
            models.Index(fields=['organization']),
            models.Index(fields=['valid_from', 'valid_to']),
        ]

# Option model for select attributes
class AttributeOption(models.Model):
    attribute = models.ForeignKey('Attribute', on_delete=models.CASCADE, related_name='options')
    value = models.CharField(max_length=100)
    label = models.CharField(max_length=255)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ('attribute', 'value')
        ordering = ['attribute', 'order', 'id']

    def __str__(self):
        return f'{self.label} ({self.value}) for {self.attribute.code}'

class AssetBundle(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='bundles')
    name = models.CharField(max_length=255)
    assets = models.ManyToManyField('ProductAsset', related_name='bundles')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Product: {self.product_id})"

class FamilyAttributeGroup(models.Model):
    """
    Junction table to associate attribute groups with product families
    and define order and requirement status
    """
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='attribute_groups')
    attribute_group = models.ForeignKey(AttributeGroup, on_delete=models.CASCADE, related_name='families')
    required = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('family', 'attribute_group')
        ordering = ('order',)
        verbose_name = "Family Attribute Group"
        verbose_name_plural = "Family Attribute Groups"
        indexes = [
            models.Index(fields=['family']),
            models.Index(fields=['attribute_group']),
            models.Index(fields=['organization']),
        ]

    def __str__(self):
        return f"{self.family.code} - {self.attribute_group.name}"

class ProductFamilyOverride(models.Model):
    """
    Represents a family-level override for a product.
    
    This allows a product to override which attribute_groups it inherits from its family.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='family_overrides')
    attribute_group = models.ForeignKey(AttributeGroup, on_delete=models.CASCADE)
    removed = models.BooleanField(default=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('product', 'attribute_group')
        
    def __str__(self):
        return f"{self.product.name} - {self.attribute_group.name} - {'Removed' if self.removed else 'Added'}"

class ProductAttributeOverride(models.Model):
    """
    Represents an attribute-level override for a product.
    
    This allows a product to override specific attributes within an attribute group.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attribute_overrides')
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    removed = models.BooleanField(default=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('product', 'attribute')
        
    def __str__(self):
        return f"{self.product.name} - {self.attribute.label} - {'Removed' if self.removed else 'Added'}"
