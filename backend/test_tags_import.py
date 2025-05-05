import os
import django
import csv
import json
import tempfile

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.imports.models import ImportTask
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from pathlib import Path
from apps.imports.tasks import import_csv_task
from kernlogic.utils import get_user_organization

def create_test_csv():
    """Create a CSV file with different tag formats for testing."""
    # Create a temporary file
    fd, path = tempfile.mkstemp(suffix='.csv')
    os.close(fd)
    
    # Define test data with different tag formats
    data = [
        {
            'name': 'Car with JSON array tags',
            'sku': 'TEST-JSON-001',
            'description': 'Testing JSON array tags',
            'price': '10000.00',
            'category': 'Test',
            'brand': 'Test Brand',
            'barcode': '1234567890123',
            'tags': json.dumps(['JSON', 'Array', 'Test']),
            'is_active': 'true'
        },
        {
            'name': 'Car with pipe-separated tags',
            'sku': 'TEST-PIPE-002',
            'description': 'Testing pipe-separated tags',
            'price': '20000.00',
            'category': 'Test',
            'brand': 'Test Brand',
            'barcode': '1234567890124',
            'tags': 'Pipe|Separated|Test',
            'is_active': 'true'
        },
        {
            'name': 'Car with comma-separated tags',
            'sku': 'TEST-COMMA-003',
            'description': 'Testing comma-separated tags',
            'price': '30000.00',
            'category': 'Test',
            'brand': 'Test Brand',
            'barcode': '1234567890125',
            'tags': 'Comma,Separated,Test',
            'is_active': 'true'
        },
        {
            'name': 'Car with single tag',
            'sku': 'TEST-SINGLE-004',
            'description': 'Testing single tag',
            'price': '40000.00',
            'category': 'Test',
            'brand': 'Test Brand',
            'barcode': '1234567890126',
            'tags': 'SingleTag',
            'is_active': 'true'
        }
    ]
    
    # Write to CSV
    with open(path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    
    print(f"Created test CSV file at {path}")
    return path

def main():
    # Get admin user
    User = get_user_model()
    admin = User.objects.filter(is_superuser=True).first()
    
    if not admin:
        print("No admin user found!")
        return
    
    print(f"Using admin user: {admin.email}")
    
    # Get the user's organization
    try:
        organization = get_user_organization(admin)
        print(f"Using organization: {organization.name if organization else 'None'}")
    except Exception as e:
        print(f"Error getting organization: {str(e)}")
        organization = None
    
    # Create test CSV file
    csv_path = create_test_csv()
    
    # Read the CSV file
    with open(csv_path, 'rb') as f:
        content = f.read()
    
    # Clean up temporary file
    os.unlink(csv_path)
    
    # Create import task
    try:
        task = ImportTask(
            created_by=admin, 
            organization=organization, 
            status='queued',
            mapping={
                'name': 'name', 
                'sku': 'sku', 
                'description': 'description', 
                'price': 'price', 
                'category': 'category', 
                'brand': 'brand', 
                'barcode': 'barcode', 
                'tags': 'tags', 
                'is_active': 'is_active'
            },
            duplicate_strategy='skip'
        )
        task.csv_file.save('test_tags_import.csv', ContentFile(content))
        task.save()
        print(f'Created import task: {task.id}')
        
        # Execute import task directly
        print("Starting import task...")
        import_csv_task(task.id)
        
        # Check results
        task.refresh_from_db()
        print(f"Import completed with status: {task.status}")
        if task.status != 'success':
            if task.error_file:
                print("Errors:")
                print(task.error_file.read().decode('utf-8'))
        else:
            print("Import successful!")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 