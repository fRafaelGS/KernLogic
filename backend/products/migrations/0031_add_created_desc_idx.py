from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("products", "0030_alter_attributevalue_locale_code")]

    operations = [
        migrations.AddIndex(
            model_name="product",
            index=models.Index(
                fields=["-created_at"],
                name="idx_product_created_desc",
            ),
        ),
    ] 