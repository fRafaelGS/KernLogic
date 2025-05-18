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
logger = logging.getLogger('')
logger.addHandler(console)

# Import models needed for the test
from apps.imports.models import ImportTask
from products.models import Product, Family
from organizations.models import Organization
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from apps.imports.tasks import import_csv_task

# Create a custom version of the import task for debugging
def custom_import_task(task_id):
    """Modified version of import_csv_task for debugging"""
    from apps.imports.tasks import ImportTask, logger
    from apps.imports.services import resolve_family
    
    # Get the task
    task = ImportTask.objects.get(id=task_id)
    
    # Log start
    print(f"Starting import task {task_id}")
    logger.debug(f"Starting import task {task_id} - DEBUG level message test")
    
    # Get org
    org = task.organization
    
    # Read a few rows from the file for debugging
    import pandas as pd
    file_path = task.csv_file.path
    df = pd.read_csv(file_path, nrows=1)
    
    # Get first row
    row = df.iloc[0].to_dict()
    
    # Check family_code in mapping
    print(f"Mapping: {task.mapping}")
    
    # Simulate the core_fields creation for one row
    mapped_row = {}
    for field in task.mapping:
        if field in row:
            dest_field = task.mapping[field]
            mapped_row[dest_field] = row[field]
    
    print(f"Mapped row: {mapped_row}")
    logger.debug(f"[ROW] TEST row keys={list(mapped_row.keys())}")
    
    # Process family_code
    family_code = mapped_row.get('family_code')
    if family_code:
        print(f"Found family_code: {family_code}")
        family = resolve_family(family_code, org)
        if family:
            print(f"Resolved family: {family.code} (ID: {family.id})")
            
            # Here's where core_fields is populated
            core_fields = {
                'name': mapped_row.get('name'),
                'description': mapped_row.get('description'),
                'brand': mapped_row.get('brand'),
                'is_active': True,
                'created_by': task.created_by,
                'organization': org
            }
            core_fields['family'] = family
            
            print(f"core_fields before creation: {core_fields}")
            
            # Simulate product creation
            sku = mapped_row.get('sku')
            # This just simulates what happens, no DB change
            print(f"Would create Product with SKU {sku} and family {core_fields.get('family')}")
            
            # Check if product with this SKU already exists
            existing = Product.objects.filter(sku=sku, organization=org).first()
            if existing:
                print(f"Product with SKU {sku} already exists, family: {existing.family}")
        else:
            print(f"Family not found for code: {family_code}")
    else:
        print("No family_code found in mapped row")
        
    print(f"See {log_file} for detailed logs")
    return task

def run_test():
    # Get a user and organization
    user = get_user_model().objects.first()
    if not user:
        print("No user found. Create a user first.")
        return
    
    org = Organization.objects.first()
    if not org:
        print("No organization found. Create an organization first.")
        return
    
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
    else:
        print(f"Found existing family: {family.code} (ID: {family.id})")
    
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
    
    task = ImportTask.objects.create(
        organization=org,
        status='queued',
        mapping=mapping,
        created_by=user,
        duplicate_strategy='overwrite'
    )
    task.csv_file.save('test_family_import.csv', ContentFile(content))
    
    print(f"Created import task #{task.id}")
    
    # Run our custom debug version of the import task
    custom_import_task(task.id)
    
if __name__ == "__main__":
    run_test() 