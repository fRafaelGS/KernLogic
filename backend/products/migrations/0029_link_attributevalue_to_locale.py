from django.db import migrations


def link_attribute_values_to_locales(apps, schema_editor):
    """
    For each AttributeValue, find the corresponding Locale by code and link them.
    """
    AttributeValue = apps.get_model('products', 'AttributeValue')
    Locale = apps.get_model('products', 'Locale')
    
    # Get all attribute values with locale_code
    attribute_values = AttributeValue.objects.filter(locale_code__isnull=False)
    
    print(f"Linking {attribute_values.count()} AttributeValue records to Locale objects...")
    
    # Track stats for reporting
    success_count = 0
    not_found_count = 0
    
    for attr_value in attribute_values:
        # Find the locale that matches this attr_value's organization and locale_code
        try:
            locale = Locale.objects.get(
                organization=attr_value.organization,
                code=attr_value.locale_code
            )
            
            # Link to the locale object
            attr_value.locale = locale
            attr_value.save()
            success_count += 1
            
        except Locale.DoesNotExist:
            print(f"  Warning: Locale {attr_value.locale_code} not found for organization {attr_value.organization_id}")
            not_found_count += 1
            continue
    
    print(f"Successfully linked {success_count} AttributeValue records")
    if not_found_count > 0:
        print(f"Warning: Could not find matching Locale for {not_found_count} AttributeValue records")


def reverse_link_attribute_values(apps, schema_editor):
    """
    Reversible operation - Copy locale.code back to locale_code field
    """
    AttributeValue = apps.get_model('products', 'AttributeValue')
    
    # Get all attribute values with locale reference
    attribute_values = AttributeValue.objects.filter(locale__isnull=False)
    
    for attr_value in attribute_values:
        attr_value.locale_code = attr_value.locale.code
        attr_value.save()


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0028_update_attributevalue_locale_reference'),
    ]

    operations = [
        migrations.RunPython(
            link_attribute_values_to_locales,
            reverse_link_attribute_values
        ),
    ] 