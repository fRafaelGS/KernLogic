from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    """
    Final migration step to complete the transition to UUID primary key.
    """
    dependencies = [
        ('organizations', '0005_uuid_data_migration'),
    ]

    operations = [
        # Alter the id field to use UUID as primary key
        migrations.AlterField(
            model_name='organization',
            name='id',
            field=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False),
        ),
        
        # Use migrated data from temp_id to populate id
        migrations.RunPython(
            code=lambda apps, schema_editor: apps.get_model('organizations', 'Organization').objects.update(id=models.F('temp_id')),
            reverse_code=migrations.RunPython.noop
        ),
        
        # Remove the temporary field
        migrations.RemoveField(
            model_name='organization',
            name='temp_id',
        ),
        
        # Remove the original uuid field
        migrations.RemoveField(
            model_name='organization',
            name='uuid',
        ),
    ] 