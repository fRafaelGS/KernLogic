import uuid
from django.db import models
from products.models import SalesChannel

# Create your models here.

# Define LOCALES manually to avoid circular import issues
LOCALES = [
    ('en_US', 'English (US)'),
    ('fr_FR', 'French'),
    ('es_ES', 'Spanish'),
    ('de_DE', 'German'),
    ('it_IT', 'Italian'),
    ('ja_JP', 'Japanese'),
    ('ko_KR', 'Korean'),
    ('pt_BR', 'Portuguese (Brazil)'),
    ('ru_RU', 'Russian'),
    ('zh_CN', 'Chinese (Simplified)'),
]

class Organization(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Kept for backwards compatibility until migration is complete
    default_locale = models.CharField(
        max_length=10,
        choices=LOCALES,
        default='en_US',
        help_text="Fallback locale for this organization"
    )
    
    # New FK relationship to Locale model
    default_locale_ref = models.ForeignKey(
        "products.Locale",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organizations',
        help_text="Fallback locale for this organization (preferred over default_locale)"
    )
    
    default_channel = models.ForeignKey(
        SalesChannel,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        help_text="Fallback sales channel for this organization"
    )
    
    def __str__(self):
        return self.name
