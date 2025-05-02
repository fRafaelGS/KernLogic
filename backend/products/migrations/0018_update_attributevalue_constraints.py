from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0017_product_products_pr_price_9b1a5f_idx_and_more'),  # Updated to reference the latest migration
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='attributevalue',
            unique_together=set(),  # Remove the old unique_together
        ),
        migrations.AddConstraint(
            model_name='attributevalue',
            constraint=models.UniqueConstraint(
                fields=['organization', 'product', 'attribute'],
                condition=Q(locale__isnull=True, channel__isnull=True),
                name='uniq_attr_global'
            ),
        ),
        migrations.AddConstraint(
            model_name='attributevalue',
            constraint=models.UniqueConstraint(
                fields=['organization', 'product', 'attribute', 'locale'],
                condition=Q(channel__isnull=True),
                name='uniq_attr_locale'
            ),
        ),
        migrations.AddConstraint(
            model_name='attributevalue',
            constraint=models.UniqueConstraint(
                fields=['organization', 'product', 'attribute', 'channel'],
                condition=Q(locale__isnull=True),
                name='uniq_attr_channel'
            ),
        ),
        migrations.AddConstraint(
            model_name='attributevalue',
            constraint=models.UniqueConstraint(
                fields=['organization', 'product', 'attribute', 'locale', 'channel'],
                name='uniq_attr_locale_channel'
            ),
        ),
    ] 