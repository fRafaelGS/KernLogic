from django.db import models
from django.utils.text import slugify


class Currency(models.Model):
    """
    Currency model - represents a currency that can be used for prices
    """
    iso_code = models.CharField(max_length=3, primary_key=True)
    symbol = models.CharField(max_length=8)
    name = models.CharField(max_length=50)
    decimals = models.PositiveSmallIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.name} ({self.iso_code})"
    
    class Meta:
        verbose_name = "Currency"
        verbose_name_plural = "Currencies"
        ordering = ['name']


class PriceType(models.Model):
    """
    PriceType model - represents different types of prices (e.g., retail, wholesale, msrp)
    """
    code = models.SlugField(max_length=32)
    label = models.CharField(max_length=100)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.label} ({self.code})"
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = slugify(self.label)
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = "Price Type"
        verbose_name_plural = "Price Types"
        ordering = ['label']
        unique_together = ('code', 'organization')


class ProductPrice(models.Model):
    """
    ProductPrice model - represents a price for a product with a specific price type and currency
    """
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="pricing_entries")
    price_type = models.ForeignKey(PriceType, on_delete=models.PROTECT, related_name="price_entries")
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name="price_entries")
    channel = models.ForeignKey("products.SalesChannel", on_delete=models.PROTECT, null=True, blank=True, related_name="pricing_entries")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField(null=True, blank=True)
    organization = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="pricing_entries")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        channel_str = f" - {self.channel}" if self.channel else ""
        return f"{self.product} - {self.price_type.label}{channel_str}: {self.currency.symbol}{self.amount}"
    
    class Meta:
        verbose_name = "Product Price"
        verbose_name_plural = "Product Prices"
        ordering = ['-valid_from']
        unique_together = ('product', 'price_type', 'channel', 'valid_from')
        indexes = [
            models.Index(fields=['product', 'price_type']),
        ]
