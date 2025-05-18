from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('imports', '0003_add_org_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='importtask',
            name='error_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of errors encountered during import'),
        ),
    ] 