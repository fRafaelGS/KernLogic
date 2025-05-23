# Generated by Django 4.2.20 on 2025-05-03 15:02

from django.db import migrations

def update_fks(apps, schema_editor):
    """
    Update all foreign keys to point to the new int_id value instead of the UUID
    """
    Organization = apps.get_model('organizations', 'Organization')
    Profile = apps.get_model('accounts', 'Profile')
    Product = apps.get_model('products', 'Product')
    ProductImage = apps.get_model('products', 'ProductImage')
    ProductRelation = apps.get_model('products', 'ProductRelation')
    Activity = apps.get_model('products', 'Activity')
    ProductAsset = apps.get_model('products', 'ProductAsset')
    ProductEvent = apps.get_model('products', 'ProductEvent')
    Attribute = apps.get_model('products', 'Attribute')
    AttributeValue = apps.get_model('products', 'AttributeValue')
    AttributeGroup = apps.get_model('products', 'AttributeGroup')
    
    # Get mappings from UUID to int_id
    uuid_to_int = {str(org.id): org.int_id for org in Organization.objects.all()}
    
    # Update all foreign keys
    for profile in Profile.objects.filter(organization__isnull=False):
        old_id = str(profile.organization_id)
        if old_id in uuid_to_int:
            profile.organization_id = uuid_to_int[old_id]
            profile.save(update_fields=['organization'])
            
    for product in Product.objects.filter(organization__isnull=False):
        old_id = str(product.organization_id)
        if old_id in uuid_to_int:
            product.organization_id = uuid_to_int[old_id]
            product.save(update_fields=['organization'])
            
    for img in ProductImage.objects.filter(organization__isnull=False):
        old_id = str(img.organization_id)
        if old_id in uuid_to_int:
            img.organization_id = uuid_to_int[old_id]
            img.save(update_fields=['organization'])
            
    for rel in ProductRelation.objects.filter(organization__isnull=False):
        old_id = str(rel.organization_id)
        if old_id in uuid_to_int:
            rel.organization_id = uuid_to_int[old_id]
            rel.save(update_fields=['organization'])
            
    for activity in Activity.objects.filter(organization__isnull=False):
        old_id = str(activity.organization_id)
        if old_id in uuid_to_int:
            activity.organization_id = uuid_to_int[old_id]
            activity.save(update_fields=['organization'])
            
    for asset in ProductAsset.objects.filter(organization__isnull=False):
        old_id = str(asset.organization_id)
        if old_id in uuid_to_int:
            asset.organization_id = uuid_to_int[old_id]
            asset.save(update_fields=['organization'])
            
    for event in ProductEvent.objects.filter(organization__isnull=False):
        old_id = str(event.organization_id)
        if old_id in uuid_to_int:
            event.organization_id = uuid_to_int[old_id]
            event.save(update_fields=['organization'])
            
    for attr in Attribute.objects.filter(organization__isnull=False):
        old_id = str(attr.organization_id)
        if old_id in uuid_to_int:
            attr.organization_id = uuid_to_int[old_id]
            attr.save(update_fields=['organization'])
            
    for val in AttributeValue.objects.filter(organization__isnull=False):
        old_id = str(val.organization_id)
        if old_id in uuid_to_int:
            val.organization_id = uuid_to_int[old_id]
            val.save(update_fields=['organization'])
            
    for group in AttributeGroup.objects.filter(organization__isnull=False):
        old_id = str(group.organization_id)
        if old_id in uuid_to_int:
            group.organization_id = uuid_to_int[old_id]
            group.save(update_fields=['organization'])


class Migration(migrations.Migration):
    dependencies = [("organizations", "0009_backfill_int_id")]
    operations = [
        migrations.RunPython(
            update_fks,
            reverse_code=migrations.RunPython.noop
        ),
    ] 