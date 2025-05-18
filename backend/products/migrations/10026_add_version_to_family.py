from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '10025_alter_productfamilyoverride_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='family',
            name='version',
            field=models.PositiveIntegerField(default=1, help_text='Version counter that increments when attributes are added/removed'),
        ),
    ] 