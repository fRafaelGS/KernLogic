from django.db import migrations


def link_organizations_to_locales(apps, schema_editor):
    """
    For each Organization, find the corresponding Locale by code and link them.
    """
    Organization = apps.get_model('organizations', 'Organization')
    Locale = apps.get_model('products', 'Locale')
    
    # Get all organizations with default_locale set
    organizations = Organization.objects.filter(default_locale__isnull=False)
    
    print(f"Linking {organizations.count()} Organization records to their Locale objects...")
    
    # Track stats for reporting
    success_count = 0
    not_found_count = 0
    
    for org in organizations:
        # Find the locale that matches this organization's default_locale
        try:
            locale = Locale.objects.get(
                organization=org,
                code=org.default_locale
            )
            
            # Link to the locale object
            org.default_locale_ref = locale
            org.save()
            success_count += 1
            
        except Locale.DoesNotExist:
            print(f"  Warning: Locale {org.default_locale} not found for organization {org.id} ({org.name})")
            not_found_count += 1
            continue
    
    print(f"Successfully linked {success_count} Organization records")
    if not_found_count > 0:
        print(f"Warning: Could not find matching Locale for {not_found_count} Organization records")


def reverse_link_organizations(apps, schema_editor):
    """
    Reversible operation - Clear the default_locale_ref field (default_locale remains unchanged)
    """
    Organization = apps.get_model('organizations', 'Organization')
    Organization.objects.all().update(default_locale_ref=None)


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0015_organization_default_locale_ref'),
        ('products', '0029_link_attributevalue_to_locale'), 
    ]

    operations = [
        migrations.RunPython(
            link_organizations_to_locales,
            reverse_link_organizations
        ),
    ] 