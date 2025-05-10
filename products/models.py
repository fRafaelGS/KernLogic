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