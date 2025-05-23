# Generated by Django 4.2.7 on 2025-05-09 19:40

from django.db import migrations, models
import django.db.models.deletion
import mptt.fields


def migrate_category_strings_to_model(apps, schema_editor):
    """
    Create Category objects for each unique category string and update product references.
    """
    # Get the models
    Product = apps.get_model('products', 'Product')
    Category = apps.get_model('products', 'Category')
    Organization = apps.get_model('organizations', 'Organization')
    
    # Dictionary to track created categories by (organization_id, name)
    created_categories = {}
    
    # First, collect all unique category strings
    unique_categories = {}  # {(org_id, category_name): count}
    
    for product in Product.objects.all():
        category_name = product.category
        if not category_name or category_name.strip() == '':
            continue
            
        org_id = product.organization_id
        if not org_id:
            continue
            
        key = (org_id, category_name)
        unique_categories[key] = unique_categories.get(key, 0) + 1
    
    # Print statistics
    print(f"Found {len(unique_categories)} unique category/organization combinations")
    
    # Now create categories outside the Product loop
    db_categories = {}
    for (org_id, name), count in unique_categories.items():
        try:
            # Create the Category directly in the database with raw SQL
            # This bypasses MPTT's signals and lets Django's migrations handle the MPTT tree structure later
            with schema_editor.connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO products_category (name, organization_id, created_at, updated_at, lft, rght, tree_id, level, parent_id) VALUES (%s, %s, NOW(), NOW(), 1, 2, %s, 0, NULL) RETURNING id",
                    [name, org_id, org_id]  # Use organization_id as initial tree_id
                )
                category_id = cursor.fetchone()[0]
                db_categories[(org_id, name)] = category_id
                print(f"Created category '{name}' for org {org_id} with ID {category_id}")
        except Exception as e:
            print(f"Error creating category '{name}' for org {org_id}: {e}")
    
    # First set all product categories to NULL to avoid foreign key issues
    Product.objects.all().update(category=None)
    
    # Now update the products to point to their categories
    for product in Product.objects.all():
        category_name = product.category
        if not category_name or category_name.strip() == '':
            continue
            
        org_id = product.organization_id
        if not org_id:
            continue
            
        key = (org_id, category_name)
        if key in db_categories:
            try:
                # Update directly with SQL to avoid MPTT issues
                with schema_editor.connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE products_product SET category_fk_id = %s WHERE id = %s",
                        [db_categories[key], product.id]
                    )
                    print(f"Updated product {product.id} to use category ID {db_categories[key]}")
            except Exception as e:
                print(f"Error updating product {product.id}: {e}")
    
    # Log migration results  
    print(f"Category migration complete. Created {len(db_categories)} categories.")


def reverse_category_migration(apps, schema_editor):
    """
    Reverse the migration - convert Category models back to strings.
    """
    # Get models
    Product = apps.get_model('products', 'Product')
    Category = apps.get_model('products', 'Category')
    
    # First, create a mapping of category IDs to names
    category_names = {}
    
    # Use raw SQL to avoid MPTT issues
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT id, name FROM products_category")
        for row in cursor.fetchall():
            category_names[row[0]] = row[1]
    
    # Update products directly with SQL
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SELECT id, category_fk_id FROM products_product WHERE category_fk_id IS NOT NULL")
        for product_id, category_id in cursor.fetchall():
            if category_id in category_names:
                cursor.execute(
                    "UPDATE products_product SET category = %s, category_fk_id = NULL WHERE id = %s",
                    [category_names[category_id], product_id]
                )


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0013_add_organization_fk_to_auditlog'),
        ('products', '10010_alter_product_price'),
    ]

    operations = [
        # First create the Category model with the correct MPTT fields
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lft', models.PositiveIntegerField(editable=False)),
                ('rght', models.PositiveIntegerField(editable=False)),
                ('tree_id', models.PositiveIntegerField(db_index=True, editable=False)),
                ('level', models.PositiveIntegerField(editable=False)),
            ],
            options={
                'verbose_name': 'Category',
                'verbose_name_plural': 'Categories',
            },
        ),
        # Add the organization field
        migrations.AddField(
            model_name='category',
            name='organization',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='organizations.organization'),
        ),
        # Add the parent field
        migrations.AddField(
            model_name='category',
            name='parent',
            field=mptt.fields.TreeForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='products.category'),
        ),
        # Set unique constraint
        migrations.AlterUniqueTogether(
            name='category',
            unique_together={('name', 'parent', 'organization')},
        ),
        # Add category_id field to Product, but don't alter the category field yet
        migrations.AddField(
            model_name='product',
            name='category_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='products.category'),
        ),
        # Run the data migration
        migrations.RunPython(
            migrate_category_strings_to_model,
            reverse_category_migration
        ),
        # Finally rename the field to 'category'
        migrations.AlterField(
            model_name='product',
            name='category',
            field=mptt.fields.TreeForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='products.category'),
        ),
        # Remove the old category text field
        migrations.RemoveField(
            model_name='product',
            name='category_fk',
        ),
    ]
