from django.db import models

# Create your models here.

class ReportTheme(models.Model):
    """
    A named container for a report type (e.g. Data Completeness, Readiness).
    """
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
