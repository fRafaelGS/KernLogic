from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class Product(models.Model):
    # Basic Product Information (Required)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Multi-tenant support
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    
    # Additional Product Information (Optional)
    brand = models.CharField(max_length=100, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    primary_image = models.ImageField(upload_to='products/', blank=True, null=True)
    
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
            models.Index(fields=['price']),
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
            'price': {'weight': 2, 'check': lambda: self.price is not None and self.price > 0},
            
            # Important fields (weight 1.5)
            'description': {'weight': 1.5, 'check': lambda: self.description is not None and self.description.strip() != ''},
            'category': {'weight': 1.5, 'check': lambda: self.category is not None and self.category.strip() != ''},
            
            # Optional fields (weight 1)
            'brand': {'weight': 1, 'check': lambda: self.brand is not None and self.brand.strip() != ''},
            'barcode': {'weight': 1, 'check': lambda: self.barcode is not None and self.barcode.strip() != ''},
            'primary_image': {'weight': 1, 'check': lambda: bool(self.primary_image)},
            'tags': {'weight': 1, 'check': lambda: self._check_tags_not_empty()},
            'attributes': {'weight': 1, 'check': lambda: self._check_attributes_not_empty()}
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
            
    def _check_attributes_not_empty(self):
        """Helper to safely check if attributes are not empty"""
        try:
            if not self.attributes:
                return False
            attrs = json.loads(self.attributes)
            return bool(attrs and len(attrs) > 0)
        except json.JSONDecodeError:
            return False
        except Exception:
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
        if not self.price or self.price <= 0:
            missing.append({'field': 'Price', 'weight': 2})
        if not self.description or self.description.strip() == '':
            missing.append({'field': 'Description', 'weight': 1.5})
        if not self.category or self.category.strip() == '':
            missing.append({'field': 'Category', 'weight': 1.5})
        if not self.brand or self.brand.strip() == '':
            missing.append({'field': 'Brand', 'weight': 1})
        if not self.barcode or self.barcode.strip() == '':
            missing.append({'field': 'GTIN/Barcode', 'weight': 1})
        if not self.primary_image:
            missing.append({'field': 'Product Image', 'weight': 1})
            
        # Check JSON fields safely
        try:
            if not self.tags or not json.loads(self.tags or '[]'):
                missing.append({'field': 'Tags', 'weight': 1})
        except json.JSONDecodeError:
            missing.append({'field': 'Tags', 'weight': 1})
        except Exception:
            missing.append({'field': 'Tags', 'weight': 1})
            
        try:
            if not self.attributes or not json.loads(self.attributes or '{}'):
                missing.append({'field': 'Attributes', 'weight': 1})
        except json.JSONDecodeError:
            missing.append({'field': 'Attributes', 'weight': 1})
        except Exception:
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
                
        all_fields = [
            {'field': 'Name', 'weight': 2, 'complete': bool(self.name and self.name.strip())},
            {'field': 'SKU', 'weight': 2, 'complete': bool(self.sku and self.sku.strip())},
            {'field': 'Price', 'weight': 2, 'complete': bool(self.price and self.price > 0)},
            {'field': 'Description', 'weight': 1.5, 'complete': bool(self.description and self.description.strip())},
            {'field': 'Category', 'weight': 1.5, 'complete': bool(self.category and self.category.strip())},
            {'field': 'Brand', 'weight': 1, 'complete': bool(self.brand and self.brand.strip())},
            {'field': 'GTIN/Barcode', 'weight': 1, 'complete': bool(self.barcode and self.barcode.strip())},
            {'field': 'Product Image', 'weight': 1, 'complete': bool(self.primary_image)},
            {'field': 'Tags', 'weight': 1, 'complete': safe_json_length(self.tags, '[]')},
            {'field': 'Attributes', 'weight': 1, 'complete': safe_json_length(self.attributes, '{}')}
        ]
        
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
    )
    
    company_id = models.IntegerField(db_index=True)  # Foreign key to company
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='activities'
    )
    entity = models.CharField(max_length=50)  # e.g., 'product'
    entity_id = models.IntegerField()
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company_id', 'created_at']),
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
