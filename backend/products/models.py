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
