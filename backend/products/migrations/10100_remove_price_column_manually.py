from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('products', '10019_merge_20250510_2257'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE products_product DROP COLUMN IF EXISTS price;",
            reverse_sql="ALTER TABLE products_product ADD COLUMN price numeric(10,2) NULL;"
        ),
    ] 