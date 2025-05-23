# Generated by Django 4.2.20 on 2025-05-03 12:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "10002_merge_20250502_1606"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="activity",
            name="products_ac_company_8f5b16_idx",
        ),
        migrations.RemoveField(
            model_name="activity",
            name="company_id",
        ),
        migrations.AlterField(
            model_name="activity",
            name="entity_id",
            field=models.CharField(max_length=40),
        ),
        migrations.AddIndex(
            model_name="activity",
            index=models.Index(
                fields=["organization", "created_at"],
                name="products_ac_organiz_385518_idx",
            ),
        ),
    ]
