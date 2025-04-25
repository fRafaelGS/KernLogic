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
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional Product Information (Optional)
    brand = models.CharField(max_length=100, blank=True, null=True)
    type = models.CharField(max_length=100, blank=True, null=True)
    unit_of_measure = models.CharField(max_length=50, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)
    primary_image = models.ImageField(upload_to='products/', blank=True, null=True)
    
    # JSON fields (stored as text in SQLite)
    tags = models.TextField(blank=True, null=True)
    country_availability = models.TextField(blank=True, null=True)
    attributes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['brand']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} (SKU: {self.sku})"
        
    # Helper methods for JSON fields
    def get_tags(self):
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except json.JSONDecodeError:
            return []
        
    def set_tags(self, tags_list):
        self.tags = json.dumps(tags_list)
        
    def get_country_availability(self):
        if not self.country_availability:
            return []
        try:
            return json.loads(self.country_availability)
        except json.JSONDecodeError:
            return []
        
    def set_country_availability(self, countries_list):
        self.country_availability = json.dumps(countries_list)
        
    def get_attributes(self):
        if not self.attributes:
            return {}
        try:
            return json.loads(self.attributes)
        except json.JSONDecodeError:
            return {}
        
    def set_attributes(self, attributes_dict):
        self.attributes = json.dumps(attributes_dict)
        
    def get_completeness(self):
        """
        Calculate product data completeness as a percentage.
        Required fields: name, sku, description, price, stock, category, brand
        """
        required_fields = [
            (self.name is not None and self.name.strip() != ''),
            (self.sku is not None and self.sku.strip() != ''),
            (self.description is not None and self.description.strip() != ''),
            (self.price is not None and self.price > 0),
            (self.stock is not None),
            (self.category is not None and self.category.strip() != ''),
            (self.brand is not None and self.brand.strip() != '')
        ]
        
        completed = sum(1 for field in required_fields if field)
        return round((completed / len(required_fields)) * 100)
    
    def get_missing_fields(self):
        """
        Return a list of field names that are missing data
        """
        missing = []
        if not self.name or self.name.strip() == '':
            missing.append('Name')
        if not self.sku or self.sku.strip() == '':
            missing.append('SKU')
        if not self.description or self.description.strip() == '':
            missing.append('Description')
        if not self.price or self.price <= 0:
            missing.append('Price')
        if self.stock is None:
            missing.append('Stock')
        if not self.category or self.category.strip() == '':
            missing.append('Category')
        if not self.brand or self.brand.strip() == '':
            missing.append('Brand')
        
        return missing

class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images'
    )
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
