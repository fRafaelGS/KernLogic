from django.db import migrations

def seed(apps, schema_editor):
    Org = apps.get_model("organizations", "Organization")
    default, _ = Org.objects.get_or_create(name="Default")
    
    # Update all products
    Product = apps.get_model("products", "Product")
    Product.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all product images
    ProductImage = apps.get_model("products", "ProductImage")
    ProductImage.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all product assets
    ProductAsset = apps.get_model("products", "ProductAsset")
    ProductAsset.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all product relations
    ProductRelation = apps.get_model("products", "ProductRelation")
    ProductRelation.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all activities
    Activity = apps.get_model("products", "Activity")
    Activity.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all product events
    ProductEvent = apps.get_model("products", "ProductEvent")
    ProductEvent.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all import tasks
    ImportTask = apps.get_model("imports", "ImportTask")
    ImportTask.objects.filter(organization__isnull=True).update(organization=default)
    
    # Update all user profiles
    Profile = apps.get_model("accounts", "Profile")
    Profile.objects.filter(organization__isnull=True).update(organization=default)

class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_init_org"),
        ("products", "0015_add_org_fk"),
        ("imports", "0003_add_org_fk"),
        ("accounts", "0002_add_profile_org_fk"),
    ]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)] 