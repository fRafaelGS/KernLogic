from django.db import migrations

def backfill_auditlog_organization(apps, schema_editor):
    """
    Backfill the organization field in AuditLog by looking up the associated membership
    for entries where target_type is 'Membership'.
    """
    AuditLog = apps.get_model('teams', 'AuditLog')
    Membership = apps.get_model('teams', 'Membership')
    
    print("Starting to backfill organization field in AuditLog...")
    
    # Get all AuditLog entries with target_type 'Membership'
    membership_logs = AuditLog.objects.filter(target_type='Membership')
    
    # Initialize counters
    processed = 0
    updated = 0
    skipped = 0
    
    # Process each log
    for log in membership_logs:
        processed += 1
        
        try:
            # Look up the membership record
            membership = Membership.objects.get(pk=log.target_id)
            
            # Set the organization from the membership
            log.organization = membership.organization
            log.save(update_fields=['organization'])
            updated += 1
            
            # Print progress for every 100 records
            if updated % 100 == 0:
                print(f"Updated {updated} records...")
        
        except Membership.DoesNotExist:
            # Skip if the membership doesn't exist
            skipped += 1
            print(f"Skipped log {log.id}: Membership with ID {log.target_id} not found")
        
        except Exception as e:
            # Skip on any other error
            skipped += 1
            print(f"Error processing log {log.id}: {str(e)}")
    
    # Print summary
    print(f"Backfill summary: Processed {processed} logs, updated {updated}, skipped {skipped}")

class Migration(migrations.Migration):
    dependencies = [
        ('teams', '0005_add_organization_fk_to_auditlog'),
    ]
    
    operations = [
        migrations.RunPython(
            backfill_auditlog_organization,
            migrations.RunPython.noop
        ),
    ] 