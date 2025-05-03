from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    """
    Prepare for migration to UUID by adding temporary UUID fields to models
    with Organization relationships.
    """
    dependencies = [
        ('organizations', '0003_organization_uuid'),
        ('products', '0001_initial'),
        ('teams', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Add temporary organization_uuid fields to models with ForeignKey to Organization
        migrations.AddField(
            model_name='organization',
            name='temp_id',
            field=models.UUIDField(null=True, blank=True, default=uuid.uuid4),
        ),
    ] 