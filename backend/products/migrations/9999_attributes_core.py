from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion


def seed_attributes(apps, schema_editor):
    """Create default attributes for all organizations"""
    Org = apps.get_model('organizations', 'Organization')
    Attribute = apps.get_model('products', 'Attribute')

    for org in Org.objects.all():
        Attribute.objects.get_or_create(
            organization=org,
            code='color',
            defaults={'label': 'Color', 'data_type': 'text'}
        )
        Attribute.objects.get_or_create(
            organization=org,
            code='weight',
            defaults={'label': 'Weight', 'data_type': 'number'}
        )


def reverse_seed_attributes(apps, schema_editor):
    """Reverse the seeding by removing only the attributes we created"""
    Attribute = apps.get_model('products', 'Attribute')
    Attribute.objects.filter(code__in=['color', 'weight']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_init_org'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0017_product_products_pr_price_9b1a5f_idx_and_more'),  # Updated to the correct migration
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
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
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
        migrations.RunPython(
            code=seed_attributes,
            reverse_code=reverse_seed_attributes
        ),
    ]

    # Demo data migration will be handled in a separate fixture or script to avoid issues


# IMPORTANT NOTE FOR POSTGRES DEPLOYMENTS:
# After running this migration in staging/production with PostgreSQL, 
# execute the following SQL to ensure sequences are properly reset:
#
# SELECT setval(pg_get_serial_sequence('products_attribute','id'),
#               (SELECT MAX(id) FROM products_attribute)); 