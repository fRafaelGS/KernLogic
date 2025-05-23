# Generated by Django 4.2.7 on 2025-05-10 18:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('prices', '0004_seed_price_types'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productprice',
            name='currency',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='price_entries', to='prices.currency'),
        ),
        migrations.AlterField(
            model_name='productprice',
            name='price_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='price_entries', to='prices.pricetype'),
        ),
    ]
