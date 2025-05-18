import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import needed models after Django setup
from apps.imports.models import ImportTask

def check_import(import_id):
    try:
        task = ImportTask.objects.get(id=import_id)
        print(f"Import Task ID: {task.id}")
        print(f"Status: {task.status}")
        print(f"Processed: {task.processed} / {task.total_rows}")
        
        # Print all fields for debugging
        print("\nAll fields:")
        for field in task._meta.fields:
            field_name = field.name
            if not field_name.startswith('_'):
                value = getattr(task, field_name, "Not available")
                print(f"  {field_name}: {value}")
        
        if hasattr(task, 'mapping') and task.mapping:
            print("\nMapping:")
            for source, target in task.mapping.items():
                print(f"  {source} -> {target}")
        
        # Check different error field names
        for error_field in ['import_errors', 'errors', 'error_list']:
            if hasattr(task, error_field) and getattr(task, error_field):
                print(f"\nErrors from {error_field}:")
                errors = getattr(task, error_field)
                if isinstance(errors, list):
                    for i, error in enumerate(errors[:5]):
                        print(f"  Error {i+1}: {error}")
                else:
                    print(f"  {errors}")
        
        if hasattr(task, 'error_file') and task.error_file:
            print(f"\nError file: {task.error_file.url}")
            print(f"Error file path: {task.error_file.path}")
        else:
            print("\nNo error file available")
            
        # Try to look for clues in the task file
        print(f"\nImport file: {task.csv_file.path if task.csv_file else 'No file'}")
        
    except ImportTask.DoesNotExist:
        print(f"No import task found with ID {import_id}")
    except Exception as e:
        print(f"Error checking import: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_id = int(sys.argv[1]) if len(sys.argv) > 1 else 26
    check_import(import_id) 