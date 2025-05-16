from django.db import migrations


# Frontend locale data defined in src/config/locales.ts
FRONTEND_LOCALES = [
    {'code': 'en_US', 'label': 'English (US)'},
    {'code': 'fr_FR', 'label': 'French'},
    {'code': 'es_ES', 'label': 'Spanish'},
    {'code': 'de_DE', 'label': 'German'},
    {'code': 'it_IT', 'label': 'Italian'},
    {'code': 'ja_JP', 'label': 'Japanese'},
    {'code': 'ko_KR', 'label': 'Korean'},
    {'code': 'pt_BR', 'label': 'Portuguese (Brazil)'},
    {'code': 'ru_RU', 'label': 'Russian'},
    {'code': 'zh_CN', 'label': 'Chinese (Simplified)'}
]


def seed_locales_for_organization(apps, schema_editor, organization):
    """
    Create locale records for a given organization based on the frontend config.
    Return the first locale created (typically en_US) for default setting.
    """
    Locale = apps.get_model('products', 'Locale')
    first_locale = None
    
    for locale_data in FRONTEND_LOCALES:
        locale = Locale(
            organization=organization,
            code=locale_data['code'],
            label=locale_data['label'],
            is_active=True
        )
        locale.save()
        
        if not first_locale:
            first_locale = locale
    
    return first_locale


def seed_locales(apps, schema_editor):
    """
    Seed locales for all organizations and set default_locale where missing
    """
    Organization = apps.get_model('organizations', 'Organization')
    
    # Get all organizations
    organizations = Organization.objects.all()
    print(f"Seeding locales for {len(organizations)} organizations...")
    
    for org in organizations:
        # Create locales for this organization
        first_locale = seed_locales_for_organization(apps, schema_editor, org)
        
        # Update organization's default_locale if needed
        if not org.default_locale and first_locale:
            org.default_locale = first_locale.code
            org.save()
            print(f"  Set default_locale={first_locale.code} for organization '{org.name}'")
        else:
            print(f"  Organization '{org.name}' already has default_locale={org.default_locale}")


def reverse_seed_locales(apps, schema_editor):
    """
    Delete all locale records (reversible migration)
    """
    Locale = apps.get_model('products', 'Locale')
    Locale.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('products', '10026_add_locale_model'),
    ]

    operations = [
        migrations.RunPython(seed_locales, reverse_seed_locales),
    ] 