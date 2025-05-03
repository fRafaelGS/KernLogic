from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('teams', '0003_migrate_uuid_to_foreignkey'),
    ]
    
    operations = [
        migrations.RemoveField(
            model_name='membership',
            name='org_id',
        ),
        migrations.RemoveField(
            model_name='auditlog',
            name='org_id',
        ),
    ] 