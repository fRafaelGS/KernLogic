# Generated by Django 4.2.20 on 2025-05-01 16:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0013_unique_sku_per_user"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="product",
            name="uq_product_user_sku",
        ),
        migrations.AddField(
            model_name="product",
            name="is_archived",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="productasset",
            name="is_archived",
            field=models.BooleanField(default=False),
        ),
    ]
