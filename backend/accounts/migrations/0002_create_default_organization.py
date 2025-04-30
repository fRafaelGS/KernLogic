from django.db import migrations

def fake_migration(apps, schema_editor):
    """
    This is a placeholder migration that does nothing.
    The original migration failed because the Organization model doesn't exist.
    """
    print("Skipping organization migration due to model changes...")

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fake_migration, migrations.RunPython.noop),
    ] 