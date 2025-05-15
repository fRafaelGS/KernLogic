from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '10022_productfamilyoverride'),
        ('organizations', '0013_add_organization_fk_to_auditlog'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductAttributeOverride',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('removed', models.BooleanField(default=True)),
                ('attribute', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.attribute')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='organizations.organization')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attribute_overrides', to='products.product')),
            ],
            options={
                'unique_together': {('product', 'attribute')},
            },
        ),
    ] 