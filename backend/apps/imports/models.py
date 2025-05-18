from django.db import models
from django.conf import settings


class ImportTask(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('partial_success', 'Partial Success'),
        ('error', 'Error'),
    ]
    
    DUPLICATE_STRATEGY_CHOICES = [
        ('skip', 'Skip'),
        ('overwrite', 'Overwrite'),
        ('abort', 'Abort'),
    ]
    
    csv_file     = models.FileField(upload_to="imports/")
    mapping      = models.JSONField()      # {"SKU": "sku", "Name": "name", ...}
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT, db_index=True, null=True)
    duplicate_strategy = models.CharField(
        max_length=10,
        default="skip",
        choices=DUPLICATE_STRATEGY_CHOICES,
        help_text="Strategy for handling duplicate SKUs"
    )
    status       = models.CharField(
        max_length=15, 
        default="queued",
        choices=STATUS_CHOICES
    )
    processed    = models.PositiveIntegerField(default=0)
    total_rows   = models.PositiveIntegerField(null=True)
    error_file   = models.FileField(null=True, upload_to="imports/errors/")
    error_count  = models.PositiveIntegerField(default=0, help_text="Number of errors encountered during import")
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    execution_time = models.FloatField(null=True, blank=True, help_text="Execution time in seconds")

    class Meta:
        ordering = ["-created_at"]
        
    def __str__(self):
        return f"Import {self.id} ({self.status}): {self.processed}/{self.total_rows or '?'} rows"
        
    @property
    def progress_percentage(self):
        """Return the progress as a percentage."""
        if not self.total_rows or self.total_rows == 0:
            return 0
        return min(100, int((self.processed / self.total_rows) * 100))
        
    @property
    def is_completed(self):
        """Return True if the task is in a terminal state."""
        return self.status in ('success', 'partial_success', 'error') 