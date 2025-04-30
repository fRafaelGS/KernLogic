from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("products", "0012_productevent"),
    ]

    operations = [
        # 1-A Clean one-off duplicates so the constraint can be created
        migrations.RunSQL(
            """
            /* keep the *oldest* record, drop the rest */
            WITH ranked AS (
              SELECT id,
                     ROW_NUMBER() OVER (PARTITION BY created_by_id, sku ORDER BY created_at) AS r
              FROM products_product
            )
            DELETE FROM products_product
            WHERE id IN (SELECT id FROM ranked WHERE r > 1);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # 1-B Add the constraint
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(
                fields=["created_by", "sku"],
                name="uq_product_user_sku",
            ),
        ),
    ] 