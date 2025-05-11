from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Clean migration to add new attribute types without index dependencies.
    This migration is meant to replace the problematic 10014 and 10015 migrations.
    """
    dependencies = [
        ('products', '10013_merge_0018_10012'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attribute',
            name='data_type',
            field=models.CharField(
                choices=[
                    ('text', 'Text'), 
                    ('number', 'Number'), 
                    ('boolean', 'Boolean'),
                    ('date', 'Date'), 
                    ('select', 'Select'),
                    ('rich_text', 'Rich Text'),
                    ('price', 'Price'),
                    ('media', 'Media'),
                    ('measurement', 'Measurement'),
                    ('url', 'URL'),
                    ('email', 'Email'),
                    ('phone', 'Phone'),
                ],
                max_length=16
            ),
        ),
    ] 