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

# Test direct Product model operations with Family
def test_direct_product_creation():
    """Test creating products directly with the Django ORM"""
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
    
    # Create a product with core_fields
    product_data = {
        'sku': 'TEST-CORE-001',
        'name': 'Test Core Fields',
        'family': family,  # Direct assignment of family object
        'is_active': True,
        'organization': org,
        'created_by': user
    }
    
    # Delete existing test product if it exists
    Product.objects.filter(sku='TEST-CORE-001', organization=org).delete()
    print("Deleted any existing test products")
    
    # Method 1: Create with **kwargs
    product1 = Product.objects.create(**product_data)
    print(f"Product1 created: {product1.id} - {product1.name}")
    print(f"Product1 family ID: {product1.family_id}")
    print(f"Product1 family: {product1.family}")
    
    # Method 2: Create then assign
    product2 = Product.objects.create(
        sku='TEST-CORE-002',
        name='Test Core Fields 2',
        is_active=True,
        organization=org,
        created_by=user
    )
    product2.family = family
    product2.save()
    print(f"Product2 created: {product2.id} - {product2.name}")
    print(f"Product2 family ID: {product2.family_id}")
    print(f"Product2 family: {product2.family}")
    
    # Method 3: create with only directly required fields
    product3 = Product.objects.create(
        sku='TEST-CORE-003',
        organization=org,
    )
    product3.family = family
    product3.save()
    print(f"Product3 created: {product3.id}")
    print(f"Product3 family ID: {product3.family_id}")
    print(f"Product3 family: {product3.family}")
    
    # Verify all products still have their families
    for sku in ['TEST-CORE-001', 'TEST-CORE-002', 'TEST-CORE-003']:
        db_product = Product.objects.get(sku=sku, organization=org)
        print(f"DB Product {sku} family: {db_product.family}")

if __name__ == "__main__":
    test_direct_product_creation() 