import os
import sys
import django
import logging

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('django')

# Import necessary models and functions
from apps.imports.models import ImportTask
from apps.imports.tasks import import_csv_task
from apps.imports.services import resolve_family
from apps.imports.constants import FIELD_SCHEMA, FIELD_SCHEMA_V2
from products.models import Product, Family
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from organizations.models import Organization
import pandas as pd
import tempfile
import json

User = get_user_model()

def create_test_csv():
    """Create a test CSV file with family_code column"""
    # Data with explicit family_code column
    data = {
        'sku': ['TEST-F101'],
        'name': ['Test Family Product'],
        'family_code': ['test_family'],  # Using family_code as column name
        'description': ['Product with family for testing'],
        'gtin': ['123456789'],
        'brand': ['Test Brand'],
        'category': ['Test > Category'],
        'tags': ['test,family,debug']
    }
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Write to temp file
    temp_file = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
    csv_path = temp_file.name
    df.to_csv(csv_path, index=False)
    temp_file.close()
    
    return csv_path

def debug_field_schemas():
    """Debug the field schemas used for mapping"""
    print("\n===== Field Schema V1 =====")
    for field in FIELD_SCHEMA:
        print(f"{field['id']} -> {field['label']} (required: {field['required']})")
    
    print("\n===== Field Schema V2 =====")
    for field in FIELD_SCHEMA_V2:
        print(f"{field['id']} -> {field['label']} (required: {field['required']})")

def test_import_with_family_code():
    """Test importing a product with family_code"""
    # First look at field schemas
    debug_field_schemas()
    
    # Get first user and org
    user = User.objects.first()
    if not user:
        print("No user found")
        return
    
    # Get the organization
    org = Organization.objects.first()
    if not org:
        print("No organization found")
        return
    print(f"Using organization: {org.name}")
    
    # Create test family if it doesn't exist
    test_family, created = Family.objects.get_or_create(
        code='test_family',
        organization=org,
        defaults={
            'label': 'Test Family',
            'created_by': user
        }
    )
    print(f"Test family: {test_family.code} (created: {created})")
    
    # Create a test CSV
    csv_path = create_test_csv()
    print(f"Created test CSV at {csv_path}")
    
    # Read CSV for debugging
    df = pd.read_csv(csv_path)
    print(f"CSV headers: {list(df.columns)}")
    print(f"First row: {df.iloc[0].to_dict()}")
    
    # Define mapping with both column names to test
    mapping = {
        'sku': 'sku',
        'name': 'name',
        'family_code': 'family_code',  # This maps the column 'family_code' to field 'family_code'
        'description': 'description',
        'gtin': 'gtin',
        'brand': 'brand',
        'category': 'category',
        'tags': 'tags'
    }
    
    # Create import task
    with open(csv_path, 'rb') as f:
        content = f.read()
    
    task = ImportTask.objects.create(
        organization=org,
        status='queued',
        mapping=mapping,
        created_by=user,
        duplicate_strategy='overwrite'
    )
    task.csv_file.save('test_family_import.csv', ContentFile(content))
    
    print(f"Created import task #{task.id}")
    
    # Delete existing product if it exists
    Product.objects.filter(sku='TEST-F101', organization=org).delete()
    print("Deleted any existing test products")
    
    # Run the import task
    result = import_csv_task(task.id)
    
    print(f"Import task result: {result}")
    
    # Check the product
    product = Product.objects.filter(sku='TEST-F101', organization=org).first()
    if product:
        print(f"Product created: {product.sku}")
        print(f"Product family: {product.family}")
        if product.family:
            print(f"Family ID: {product.family.id}, code: {product.family.code}")
        else:
            print("No family assigned to product")
    else:
        print("Product not created")
    
    # Clean up
    os.unlink(csv_path)

if __name__ == "__main__":
    test_import_with_family_code() 