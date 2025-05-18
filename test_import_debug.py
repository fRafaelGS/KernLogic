import os
import sys
import django
import logging

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Configure logging to file
log_file = 'import_debug.log'
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename=log_file,
    filemode='w'
)
# Also print to console
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger('').addHandler(console)

# Import models needed for the test
from apps.imports.models import ImportTask
from products.models import Product, Family, Attribute, AttributeGroup, AttributeValue, AttributeGroupItem, FamilyAttributeGroup
from organizations.models import Organization
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from apps.imports.tasks import import_csv_task
from products.models import Locale, SalesChannel
from prices.models import Currency

User = get_user_model()

# Run a test import
def run_test_import():
    # Get a user and organization
    user = User.objects.first()
    if not user:
        print("No user found. Create a user first.")
        return
    
    org = Organization.objects.first()
    if not org:
        print("No organization found. Create an organization first.")
        return
    
    # Ensure organization has required defaults
    ensure_organization_defaults(org)
    
    # Check for offshore_turbine family
    family = Family.objects.filter(code='offshore_turbine', organization=org).first()
    if not family:
        print(f"Creating offshore_turbine family for organization {org}")
        family = Family.objects.create(
            code='offshore_turbine',
            label='Offshore Turbine',
            organization=org,
            created_by=user
        )
        
        # Create attribute group for family
        attr_group = AttributeGroup.objects.get_or_create(
            name='technical_specs',
            organization=org,
            defaults={'created_by': user}
        )[0]
        
        # Associate attribute group with family
        FamilyAttributeGroup.objects.get_or_create(
            family=family,
            attribute_group=attr_group,
            organization=org
        )
        
        # Create weight attributes
        weight_attr = Attribute.objects.get_or_create(
            code='weight',
            organization=org,
            defaults={
                'label': 'Weight',
                'data_type': 'number',
                'created_by': user
            }
        )[0]
        
        bweight_attr = Attribute.objects.get_or_create(
            code='bweight',
            organization=org,
            defaults={
                'label': 'Bruto Weight',
                'data_type': 'number',
                'created_by': user
            }
        )[0]
        
        # Associate attributes with group
        AttributeGroupItem.objects.get_or_create(
            group=attr_group,
            attribute=weight_attr
        )
        
        AttributeGroupItem.objects.get_or_create(
            group=attr_group,
            attribute=bweight_attr
        )
    
    # Create an import task
    with open('test_family_import.csv', 'rb') as f:
        content = f.read()
    
    mapping = {
        'sku': 'sku',
        'name': 'name',
        'family_code': 'family_code',
        'description': 'description',
        'gtin': 'gtin',
        'brand': 'brand',
        'category': 'category',
        'tags': 'tags'
    }
    
    # Delete existing product if it exists
    Product.objects.filter(sku='WT-5006', organization=org).delete()
    
    task = ImportTask.objects.create(
        organization=org,
        status='queued',
        mapping=mapping,
        created_by=user,
        duplicate_strategy='overwrite'
    )
    task.csv_file.save('test_family_import.csv', ContentFile(content))
    
    print(f"Created import task #{task.id}")
    
    # Run the import task
    result = import_csv_task(task.id)
    
    print(f"Import task result: {result}")
    
    # Check result in the database
    product = Product.objects.filter(sku='WT-5006', organization=org).first()
    if product:
        print(f"Product WT-5006 found:")
        print(f"  Family ID: {product.family_id}")
        print(f"  Family: {product.family}")
        
        # Check attribute values
        attr_values = AttributeValue.objects.filter(product=product).all()
        print(f"  Attribute Values: {len(attr_values)}")
        for av in attr_values:
            print(f"    {av.attribute.code}: {av.value}")
    else:
        print("Product WT-5006 not found")
    
    print(f"See {log_file} for detailed logs")

def ensure_organization_defaults(org):
    """Make sure organization has necessary defaults for import to work"""
    print("Setting up organization defaults...")
    
    # Ensure locale exists
    try:
        locale, created = Locale.objects.get_or_create(
            organization=org,
            code='en_US',
            defaults={'label': 'English (US)'}
        )
        print(f"Locale: {locale} (created: {created})")
        
        # Check which locale field to use
        if hasattr(org, 'default_locale_ref'):
            print(f"Organization has default_locale_ref field")
            if not org.default_locale_ref or org.default_locale_ref.code != locale.code:
                org.default_locale_ref = locale
                org.save(update_fields=['default_locale_ref'])
                print(f"Updated default_locale_ref to {locale}")
        
        if hasattr(org, 'default_locale'):
            print(f"Organization has default_locale field")
            if org.default_locale != locale.code:
                org.default_locale = locale.code
                org.save(update_fields=['default_locale'])
                print(f"Updated default_locale to {locale.code}")
    except Exception as e:
        print(f"Error setting default locale: {e}")
    
    # Ensure channel exists
    try:
        channel, created = SalesChannel.objects.get_or_create(
            organization=org,
            code='web',
            defaults={'name': 'Web Store'}
        )
        print(f"Channel: {channel} (created: {created})")
        
        # Set the organization's default channel
        if hasattr(org, 'default_channel'):
            if org.default_channel != channel.code:
                org.default_channel = channel.code
                org.save(update_fields=['default_channel'])
                print(f"Updated default_channel to {channel.code}")
    except Exception as e:
        print(f"Error setting default channel: {e}")
    
    # Ensure currency exists
    try:
        currency, created = Currency.objects.get_or_create(
            iso_code='USD',
            defaults={'name': 'US Dollar', 'symbol': '$'}
        )
        print(f"Currency: {currency} (created: {created})")
        
        # Set the organization's default currency
        if hasattr(org, 'default_currency'):
            if org.default_currency != currency.iso_code:
                org.default_currency = currency.iso_code
                org.save(update_fields=['default_currency'])
                print(f"Updated default_currency to {currency.iso_code}")
    except Exception as e:
        print(f"Error setting default currency: {e}")

if __name__ == "__main__":
    run_test_import() 