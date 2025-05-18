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
    ('de_AT', 'German (Austria)'),
    ('fr_CH', 'French (Switzerland)'),
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
    # Add help text explaining how to properly set the locale
    default_locale = models.CharField(
        max_length=10,
        choices=LOCALES,
        default='en_US',
        help_text="Legacy fallback locale code. Prefer using default_locale_ref instead."
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
        
    def save(self, *args, **kwargs):
        # If using the legacy default_locale field, check that the locale exists in the database
        # and set default_locale_ref to match
        if self.default_locale:
            from products.models import Locale
            try:
                # Only run this if default_locale_ref is not already set
                if not self.default_locale_ref:
                    locale = Locale.objects.get(code=self.default_locale, organization=self)
                    self.default_locale_ref = locale
            except Locale.DoesNotExist:
                # If locale doesn't exist but is in LOCALES list, create it
                is_valid_choice = self.default_locale in [choice[0] for choice in LOCALES]
                if is_valid_choice:
                    from products.models import Locale
                    # Get the label for this locale code
                    label = next((label for code, label in LOCALES if code == self.default_locale), "")
                    # Create the locale
                    locale = Locale.objects.create(
                        organization=self,
                        code=self.default_locale,
                        label=label or self.default_locale
                    )
                    self.default_locale_ref = locale
                
        super().save(*args, **kwargs)
