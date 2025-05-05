import os
import django
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.imports.models import ImportTask
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from pathlib import Path
import csv
from io import StringIO
from kernlogic.utils import get_user_organization

def fix_csv_tags(csv_file_path):
    """Read the CSV file and modify tags to be compatible with the import process."""
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Parse the CSV
    csv_reader = csv.DictReader(StringIO(content))
    fieldnames = csv_reader.fieldnames
    
    # Create a new CSV in memory
    output = StringIO()
    csv_writer = csv.DictWriter(output, fieldnames=fieldnames)
    csv_writer.writeheader()
    
    # Process each row
    for row in csv_reader:
        # If tags column exists and contains a JSON string
        if 'tags' in row and row['tags']:
            try:
                # Parse the JSON string to a Python list
                tags_list = json.loads(row['tags'])
                # Join the list items with a pipe character (which is not used in the tags)
                row['tags'] = '|'.join(tags_list)
            except json.JSONDecodeError:
                # If it's not valid JSON, keep as is
                pass
        
        csv_writer.writerow(row)
    
    # Get the modified CSV content
    modified_content = output.getvalue()
    
    # Write to a new file
    new_file_path = csv_file_path.replace('.csv', '_fixed.csv')
    with open(new_file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"Created fixed CSV file: {new_file_path}")
    return new_file_path

def patch_import_task_serializer():
    """
    Monkey patch the import task serializer to handle piped tags.
    This is a temporary fix until a proper solution is implemented.
    """
    from products.serializers import ProductSerializer
    original_to_internal_value = ProductSerializer.to_internal_value
    
    def patched_to_internal_value(self, data):
        # First handle the case of piped tag strings from CSV
        if 'tags' in data and isinstance(data['tags'], str) and '|' in data['tags']:
            # Split by pipe and convert to a list
            data['tags'] = data['tags'].split('|')
        
        # Call the original method
        return original_to_internal_value(self, data)
    
    # Apply the monkey patch
    ProductSerializer.to_internal_value = patched_to_internal_value
    print("Patched ProductSerializer.to_internal_value to handle piped tags")

def main():
    # Apply the monkey patch
    patch_import_task_serializer()
    
    # Fix the CSV file
    original_csv = 'media/imports/car_products_import.csv'
    fixed_csv = fix_csv_tags(original_csv)
    
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
    
    # Read the fixed CSV file
    with open(fixed_csv, 'rb') as f:
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
        task.csv_file.save('car_products_import_fixed.csv', ContentFile(content))
        task.save()
        print(f'Created import task: {task.id}')
        
        # Launch Celery task directly (not using delay to avoid Celery issues)
        from apps.imports.tasks import import_csv_task
        print("Starting import task directly (not through Celery)...")
        import_csv_task(task.id)
        print(f"Import task (ID: {task.id}) has been processed")
        
    except Exception as e:
        print(f"Error creating/processing import task: {str(e)}")

if __name__ == "__main__":
    main() 