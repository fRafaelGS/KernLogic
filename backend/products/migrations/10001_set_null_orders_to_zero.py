from django.db import migrations

def forwards(apps, schema_editor):
    AGI = apps.get_model("products", "AttributeGroupItem")
    AGI.objects.filter(order__isnull=True).update(order=0)

def backwards(apps, schema_editor):
    # No need to reverse this operation
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('products', '10000_attr_groups_phase3'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ] 