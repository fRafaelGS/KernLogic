from django.db import migrations

def forwards(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Org = apps.get_model("organizations", "Organization")
    Profile = apps.get_model("accounts", "Profile")

    default_org, _ = Org.objects.get_or_create(name="Default")

    bulk = []
    for user in User.objects.all():
        try:
            Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            bulk.append(Profile(user=user, organization=default_org))
    
    if bulk:
        Profile.objects.bulk_create(bulk)
        print(f"Created {len(bulk)} missing profiles")

def backwards(apps, schema_editor):
    # This is a data migration, so backwards would delete profiles
    # Only use in development, not in production
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_add_profile_org_fk'),
        ('organizations', '0002_seed_default_org'),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ] 