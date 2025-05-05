import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.imports.models import ImportTask
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from pathlib import Path
from apps.imports.tasks import import_csv_task
from kernlogic.utils import get_user_organization

# Get admin user
User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()

if not admin:
    print("No admin user found!")
    exit(1)

print(f"Using admin user: {admin.email}")

# Get the user's organization
try:
    organization = get_user_organization(admin)
    print(f"Using organization: {organization.name if organization else 'None'}")
except Exception as e:
    print(f"Error getting organization: {str(e)}")
    organization = None

# Load CSV file
csv_path = Path('media/imports/car_products_import.csv')
if not csv_path.exists():
    print(f"CSV file not found at {csv_path}!")
    exit(1)

with open(csv_path, 'rb') as f:
    content = f.read()

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
    task.csv_file.save('car_products_import.csv', ContentFile(content))
    task.save()
    print(f'Created import task: {task.id}')
    
    # Launch Celery task
    print("Starting Celery import task...")
    import_csv_task.delay(task.id)
    print(f"Import task (ID: {task.id}) has been queued for processing")
    
except Exception as e:
    print(f"Error creating import task: {str(e)}") 