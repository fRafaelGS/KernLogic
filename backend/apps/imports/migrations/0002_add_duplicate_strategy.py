from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('imports', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='importtask',
            name='duplicate_strategy',
            field=models.CharField(
                choices=[('skip', 'Skip'), ('overwrite', 'Overwrite'), ('abort', 'Abort')],
                default='skip',
                help_text='Strategy for handling duplicate SKUs',
                max_length=10
            ),
        ),
    ] 