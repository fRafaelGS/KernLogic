from django.db import migrations, models
import uuid

def copy_uuids_and_update_references(apps, schema_editor):
    """
    1. Make sure all organizations have UUIDs
    2. Copy existing uuid values to temp_id (temporary primary key)
    3. Update all references to use UUID
    """
    Organization = apps.get_model('organizations', 'Organization')
    Membership = apps.get_model('teams', 'Membership')
    
    # Ensure all organizations have UUIDs
    print("Ensuring all organizations have UUIDs")
    for org in Organization.objects.all():
        if not org.uuid:
            org.uuid = uuid.uuid4()
            org.save(update_fields=['uuid'])
    
    # Copy uuid to temp_id
    print("Copying UUIDs to temp_id field")
    for org in Organization.objects.all():
        org.temp_id = org.uuid
        org.save(update_fields=['temp_id'])
    
    print("Updating Membership records to use UUID")
    for membership in Membership.objects.all():
        if membership.organization:
            membership.org_id = membership.organization.uuid
            membership.save(update_fields=['org_id'])

class Migration(migrations.Migration):
    """
    Migrate data from numeric organization ID to UUID.
    """
    dependencies = [
        ('organizations', '0004_uuid_migration_preparation'),
    ]

    operations = [
        migrations.RunPython(
            code=copy_uuids_and_update_references,
            reverse_code=migrations.RunPython.noop
        ),
    ] 