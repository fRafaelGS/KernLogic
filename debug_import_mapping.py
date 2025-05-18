import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Import necessary models
from apps.imports.models import ImportTask
import json
import pandas as pd

def examine_import_tasks():
    """Examine recent import tasks to debug mapping issues"""
    # Get recent import tasks
    tasks = ImportTask.objects.all().order_by('-created_at')[:5]
    
    print(f"Found {len(tasks)} recent import tasks")
    
    for i, task in enumerate(tasks):
        print(f"\n----- Import Task #{task.id} -----")
        print(f"Status: {task.status}")
        print(f"Error Count: {task.error_count or 0}")
        
        # Print mapping
        print("\nMapping:")
        try:
            mapping = task.mapping
            for src, dest in mapping.items():
                print(f"  {src} -> {dest}")
        except Exception as e:
            print(f"Error parsing mapping: {e}")
        
        # Try to read CSV and show headers
        try:
            if task.csv_file:
                print("\nCSV File:", task.csv_file.name)
                file_path = task.csv_file.path
                
                # Read first few rows of CSV to see headers and values
                df = pd.read_csv(file_path, nrows=1)
                print("\nCSV Headers:", list(df.columns))
                print("\nFirst row preview:")
                print(df.iloc[0].to_dict())
        except Exception as e:
            print(f"Error reading CSV file: {e}")
            
        print("\n-- End of Task Info --")

if __name__ == "__main__":
    examine_import_tasks() 