from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0027_seed_locales_from_frontend'),
    ]

    operations = [
        # Step 1: Rename the old field to keep existing data
        migrations.RenameField(
            model_name='attributevalue',
            old_name='locale',
            new_name='locale_code',
        ),
        
        # Step 2: Add a new ForeignKey field
        migrations.AddField(
            model_name='attributevalue',
            name='locale',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='products.locale',
                help_text='The locale for this attribute value',
                related_name='attribute_values',
            ),
        ),
        
        # No automatic data migration - will be done in a separate RunPython migration
    ] 