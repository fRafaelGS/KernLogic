import os
import sys
import django

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Import the model
from apps.imports.models import ImportTask

# Check if the field exists in the model
field_names = [f.name for f in ImportTask._meta.fields]
print(f"Model fields: {field_names}")
print(f"Has error_count field: {'error_count' in field_names}")

# Check if the field exists in the database
try:
    # Try to run a query using the field
    task = ImportTask.objects.filter(error_count=0).first()
    print(f"Database query successful: {task is not None}")
    print("Field exists in the database!")
except Exception as e:
    print(f"Database query failed: {str(e)}")
    print("Field does not exist in the database!")
    
print("\nLet's check migrations:")
from django.db.migrations.recorder import MigrationRecorder
migrations = MigrationRecorder.Migration.objects.filter(app='imports').order_by('id')
for m in migrations:
    print(f"- {m.app}: {m.name} - Applied: {m.applied}") 