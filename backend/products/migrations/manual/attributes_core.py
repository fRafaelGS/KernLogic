from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Attribute',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('code', models.CharField(help_text='Slug-like unique identifier per organization', max_length=64)),
                ('label', models.CharField(max_length=255)),
                ('data_type', models.CharField(choices=[('text', 'Text'), ('number', 'Number'), ('boolean', 'Boolean'), ('date', 'Date'), ('select', 'Select')], max_length=16)),
                ('is_localisable', models.BooleanField(default=False)),
                ('is_scopable', models.BooleanField(default=False)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='auth.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
            ],
            options={
                'unique_together': {('organization', 'code')},
                'index_together': {('organization', 'data_type')},
            },
        ),
        migrations.CreateModel(
            name='AttributeValue',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('locale', models.CharField(blank=True, max_length=10, null=True)),
                ('channel', models.CharField(blank=True, max_length=32, null=True)),
                ('value', models.JSONField()),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.attribute')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attribute_values', to='products.product')),
            ],
            options={
                'unique_together': {('organization', 'product', 'attribute', 'locale', 'channel')},
            },
        ),
        migrations.RunSQL(
            # Forward (for applying the migration)
            '''
            INSERT INTO products_attribute (id, organization_id, code, label, data_type, is_localisable, is_scopable, created_by_id)
            SELECT 1, id, 'color', 'Color', 'text', 0, 0, NULL FROM organizations_organization LIMIT 1;
            
            INSERT INTO products_attribute (id, organization_id, code, label, data_type, is_localisable, is_scopable, created_by_id)
            SELECT 2, id, 'weight', 'Weight', 'number', 0, 0, NULL FROM organizations_organization LIMIT 1;
            ''',
            # Backward (for rolling back the migration)
            '''
            DELETE FROM products_attribute WHERE id IN (1, 2);
            '''
        ),
    ] 