import os
import sys
import django

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Import necessary models
from products.models import Product, Family, Attribute, AttributeValue, AttributeGroupItem
from organizations.models import Organization

def check_products():
    """Check imported products and their families"""
    print("========= PRODUCTS =========")
    
    products = Product.objects.filter(sku__startswith='WT-')
    print(f"Found {products.count()} products with WT- prefix")
    
    for p in products:
        print(f"SKU: {p.sku}")
        print(f"  Name: {p.name}")
        print(f"  Family: {p.family.code if p.family else 'None'}")
        print(f"  Attributes: {p.attribute_values.count()}")
        
        if p.attribute_values.exists():
            for av in p.attribute_values.all():
                print(f"    {av.attribute.code}: {av.value}")
        print()

def check_families():
    """Check families and their attributes"""
    print("========= FAMILIES =========")
    
    families = Family.objects.all()
    print(f"Found {families.count()} families")
    
    for f in families:
        print(f"Family: {f.code}")
        print(f"  Label: {f.label}")
        print(f"  Organization: {f.organization}")
        
        # Get attributes associated with this family
        attributes = []
        for group in f.attribute_groups.all():
            # AttributeGroup doesn't have items directly
            # Get items through AttributeGroupItem objects
            items = AttributeGroupItem.objects.filter(group=group.attribute_group)
            for item in items:
                attributes.append(item.attribute.code)
        
        print(f"  Attributes: {attributes}")
        print()
    
    # Check specific family
    print("Checking offshore_turbine family:")
    if Family.objects.filter(code='offshore_turbine').exists():
        family = Family.objects.get(code='offshore_turbine')
        print(f"  Found family: {family.code}")
        
        # List attributes
        attributes = []
        for group in family.attribute_groups.all():
            # AttributeGroup doesn't have items directly
            # Get items through AttributeGroupItem objects
            items = AttributeGroupItem.objects.filter(group=group.attribute_group)
            for item in items:
                attributes.append(item.attribute.code)
        
        print(f"  Attributes: {attributes}")
        
        # Check specific attributes
        for attr_code in ['bruto_weight', 'weight', 'transmission', 'horsepower_hp']:
            attr_exists = any(attr == attr_code for attr in attributes)
            print(f"  Has {attr_code}: {attr_exists}")
    else:
        print("  Family 'offshore_turbine' not found")

def check_attributes():
    """Check attributes"""
    print("========= ATTRIBUTES =========")
    
    attributes = Attribute.objects.all()
    print(f"Found {attributes.count()} attributes")
    
    # List all attributes
    attr_codes = [a.code for a in attributes]
    print(f"Attribute codes: {attr_codes}")
    
    # Check for specific attributes
    for code in ['bruto_weight', 'weight', 'transmission', 'horsepower_hp']:
        exists = Attribute.objects.filter(code=code).exists()
        print(f"Attribute '{code}' exists: {exists}")

def check_import_payload():
    """Check the import mapping"""
    print("========= IMPORT MAPPING =========")
    
    from apps.imports.models import ImportTask
    
    try:
        task = ImportTask.objects.get(id=26)
        print(f"Import ID: {task.id}")
        print(f"Status: {task.status}")
        print(f"Mapping: {task.mapping}")
        print(f"Family mapped: {'family_code' in task.mapping.values()}")
        
        # Check CSV file
        print(f"CSV file: {task.csv_file.path}")
        
    except ImportTask.DoesNotExist:
        print("Import task #26 not found")

def check_code_processes_family():
    """Check how the code processes family_code"""
    print("========= FAMILY CODE PROCESSING =========")
    
    # Find mentions of family_code in import tasks code
    import inspect
    from apps.imports.tasks import import_csv_task
    
    task_code = inspect.getsource(import_csv_task)
    
    # Look for family_code processing
    lines = task_code.split('\n')
    family_lines = [line for line in lines if 'family_code' in line or 'family = ' in line]
    
    print("Lines processing family_code:")
    for line in family_lines:
        print(f"  {line.strip()}")

if __name__ == "__main__":
    check_products()
    print("\n" + "="*50 + "\n")
    check_families()
    print("\n" + "="*50 + "\n")
    check_attributes()
    print("\n" + "="*50 + "\n")
    check_import_payload()
    print("\n" + "="*50 + "\n")
    check_code_processes_family() 