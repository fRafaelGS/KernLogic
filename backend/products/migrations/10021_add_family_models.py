# Generated by Django 4.2.7 on 2025-05-14 17:16

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_families_and_assign_products(apps, schema_editor):
    """
    Create a default family for each organization and assign all existing products to it.
    """
    Organization = apps.get_model('organizations', 'Organization')
    Family = apps.get_model('products', 'Family')
    Product = apps.get_model('products', 'Product')
    
    # Get all organizations
    organizations = Organization.objects.all()
    
    for org in organizations:
        # Create a default family for this organization
        default_family = Family.objects.create(
            code=f"default-{org.id}",
            label="Default Family",
            description="Default family created during migration",
            organization=org
        )
        
        # Assign all products in this organization to the default family
        Product.objects.filter(organization=org).update(family=default_family)
        
        print(f"Created default family for organization {org.name} and assigned {Product.objects.filter(organization=org).count()} products")


def remove_default_families(apps, schema_editor):
    """
    Reverse operation: Set all products' family to NULL and delete the default families.
    """
    Family = apps.get_model('products', 'Family')
    Product = apps.get_model('products', 'Product')
    
    # Get all default families
    default_families = Family.objects.filter(code__startswith='default-')
    
    # Set family to NULL for all products that have a default family
    for family in default_families:
        Product.objects.filter(family=family).update(family=None)
    
    # Delete all default families
    default_families.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0013_add_organization_fk_to_auditlog'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '10020_add_tags_to_asset'),
    ]

    operations = [
        migrations.CreateModel(
            name='Family',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=64, unique=True)),
                ('label', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='organizations.organization')),
            ],
            options={
                'verbose_name': 'Product Family',
                'verbose_name_plural': 'Product Families',
                'ordering': ['code'],
            },
        ),
        migrations.AddField(
            model_name='product',
            name='family',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='products.family'),
        ),
        migrations.CreateModel(
            name='FamilyAttributeGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('required', models.BooleanField(default=False)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('attribute_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='families', to='products.attributegroup')),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attribute_groups', to='products.family')),
                ('organization', models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='organizations.organization')),
            ],
            options={
                'verbose_name': 'Family Attribute Group',
                'verbose_name_plural': 'Family Attribute Groups',
                'ordering': ('order',),
                'indexes': [models.Index(fields=['family'], name='products_fa_family__dc030a_idx'), models.Index(fields=['attribute_group'], name='products_fa_attribu_606ac2_idx'), models.Index(fields=['organization'], name='products_fa_organiz_ec1b92_idx')],
                'unique_together': {('family', 'attribute_group')},
            },
        ),
        migrations.AddIndex(
            model_name='family',
            index=models.Index(fields=['organization'], name='products_fa_organiz_f9c7a0_idx'),
        ),
        # Add data migration to create default families and assign products
        migrations.RunPython(
            create_default_families_and_assign_products,
            remove_default_families
        ),
    ]
