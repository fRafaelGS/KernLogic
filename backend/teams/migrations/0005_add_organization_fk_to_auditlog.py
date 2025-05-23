# Generated by Django 4.2.20 on 2025-05-03 14:34

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0013_add_organization_fk_to_auditlog"),
        ("teams", "0004_drop_org_id_uuid"),
    ]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="organization",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="organizations.organization",
            ),
        ),
    ]
