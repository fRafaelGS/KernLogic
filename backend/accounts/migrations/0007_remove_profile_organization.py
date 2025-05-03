from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("accounts", "0006_activate_pending_memberships")]
    operations = [
        migrations.RemoveField(
            model_name="profile",
            name="organization",
        ),
    ] 