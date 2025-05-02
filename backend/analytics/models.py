from django.db import models
from products.models import Product, Attribute
from django.conf import settings

class DimTime(models.Model):
    """
    Dimension table for time, used for time-based analysis
    """
    id = models.AutoField(primary_key=True)
    date = models.DateField(unique=True)
    year = models.IntegerField()
    quarter = models.IntegerField()
    month = models.IntegerField()
    day = models.IntegerField()
    
    def __str__(self):
        return f"{self.date} (Y{self.year} Q{self.quarter})"
    
    class Meta:
        verbose_name = "Time Dimension"
        verbose_name_plural = "Time Dimensions"
        ordering = ['-date']

class DimProduct(models.Model):
    """
    Dimension table for products, extracted from the Product model
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, primary_key=True)
    sku = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    organization_id = models.IntegerField()
    
    def __str__(self):
        return f"{self.name} ({self.sku})"
    
    class Meta:
        verbose_name = "Product Dimension"
        verbose_name_plural = "Product Dimensions"

class DimAttribute(models.Model):
    """
    Dimension table for attributes, extracted from the Attribute model
    """
    attribute = models.OneToOneField(Attribute, on_delete=models.CASCADE, primary_key=True)
    code = models.CharField(max_length=64)
    label = models.CharField(max_length=255)
    data_type = models.CharField(max_length=16)
    organization_id = models.IntegerField()
    
    def __str__(self):
        return f"{self.label} ({self.code})"
    
    class Meta:
        verbose_name = "Attribute Dimension"
        verbose_name_plural = "Attribute Dimensions"

class DimLocale(models.Model):
    """
    Dimension table for locales (languages/regions)
    """
    code = models.CharField(max_length=10, primary_key=True)
    description = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.description} ({self.code})"
    
    class Meta:
        verbose_name = "Locale Dimension"
        verbose_name_plural = "Locale Dimensions"
        ordering = ['code']

class DimChannel(models.Model):
    """
    Dimension table for channels (sales/distribution channels)
    """
    code = models.CharField(max_length=32, primary_key=True)
    description = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.description} ({self.code})"
    
    class Meta:
        verbose_name = "Channel Dimension"
        verbose_name_plural = "Channel Dimensions"
        ordering = ['code']

class DimEditor(models.Model):
    """
    Dimension table for editors/users who made changes
    """
    user_id = models.IntegerField(primary_key=True)
    username = models.CharField(max_length=150)
    email = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return self.username
    
    class Meta:
        verbose_name = "Editor Dimension"
        verbose_name_plural = "Editor Dimensions"
        ordering = ['username']

class FactProductAttribute(models.Model):
    """
    Fact table for product attributes, with dimensions for analysis
    """
    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(DimProduct, on_delete=models.CASCADE)
    attribute = models.ForeignKey(DimAttribute, on_delete=models.CASCADE)
    time = models.ForeignKey(DimTime, on_delete=models.CASCADE)
    locale = models.ForeignKey(DimLocale, on_delete=models.CASCADE, null=True, blank=True)
    channel = models.ForeignKey(DimChannel, on_delete=models.CASCADE, null=True, blank=True)
    organization_id = models.IntegerField()
    value = models.JSONField()
    completed = models.BooleanField()
    updated_at = models.DateTimeField(auto_now=True)
    
    # Enrichment Velocity fields
    edit_count = models.IntegerField(default=0, help_text="Number of times this attribute has been edited")
    first_published_at = models.DateTimeField(null=True, blank=True, help_text="When this attribute was first published")
    last_edited_by = models.ForeignKey(DimEditor, on_delete=models.SET_NULL, null=True, blank=True, related_name='edited_attributes')
    
    # Localization Quality fields
    is_translated = models.BooleanField(default=False, help_text="Whether this attribute has been translated for the given locale")
    translated_at = models.DateTimeField(null=True, blank=True, help_text="When this attribute was last translated")

    class Meta:
        verbose_name = "Product Attribute Fact"
        verbose_name_plural = "Product Attribute Facts"
        unique_together = (
            'product', 'attribute', 'time', 'locale', 'channel',
        )
        indexes = [
            models.Index(fields=['time']),
            models.Index(fields=['attribute']),
            models.Index(fields=['product']),
            models.Index(fields=['organization_id']),
            models.Index(fields=['edit_count']),
            models.Index(fields=['first_published_at']),
            models.Index(fields=['is_translated']),
        ]
        
    def __str__(self):
        return f"{self.product} - {self.attribute} ({self.time.date})"
