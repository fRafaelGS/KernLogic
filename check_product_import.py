import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import models needed for the test
from products.models import Product, Family
from organizations.models import Organization
from django.contrib.auth import get_user_model
from apps.imports.services.product_services import upsert_product

# Check if family_code assignment works
def test_family_assignment():
    # Get first organization
    org = Organization.objects.first()
    user = get_user_model().objects.first()
    
    if not org:
        print("No organization found")
        return
    
    print(f"Organization: {org}")
    
    # Find or create a family
    family, created = Family.objects.get_or_create(
        code='test_family',
        organization=org,
        defaults={
            'label': 'Test Family',
            'created_by': user
        }
    )
    print(f"Family: {family} (created: {created})")
    
    # Create test product data
    test_data = {
        'sku': 'TEST-001',
        'name': 'Test Product',
        'family_code': 'test_family',  # Use the family code
        'created_by': user
    }
    
    # Delete existing test product if it exists
    Product.objects.filter(sku='TEST-001', organization=org).delete()
    print("Deleted any existing test products")
    
    # Use the upsert_product function directly
    product = upsert_product(test_data, org)
    print(f"Product created: {product.id} - {product.name}")
    print(f"Product family ID: {product.family_id}")
    print(f"Product family: {product.family}")
    
    # Double-check by fetching the product again from the database
    db_product = Product.objects.get(id=product.id)
    print(f"DB Product family ID: {db_product.family_id}")
    print(f"DB Product family: {db_product.family}")

if __name__ == "__main__":
    test_family_assignment() 