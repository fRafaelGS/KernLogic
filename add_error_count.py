import os
import sys
import django

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['SKIP_ENV_VALIDATION'] = 'true'
django.setup()

# Import necessary modules
from django.db import connection

def add_error_count_column():
    with connection.cursor() as cursor:
        # Check if column exists
        try:
            cursor.execute("SELECT error_count FROM imports_importtask LIMIT 1")
            print("Column already exists!")
            return
        except Exception:
            # Column doesn't exist, add it
            print("Column doesn't exist, adding it...")
            
            try:
                cursor.execute("""
                    ALTER TABLE imports_importtask 
                    ADD COLUMN error_count integer NOT NULL DEFAULT 0
                """)
                print("Column added successfully!")
                
                # Also update the django_migrations table to mark the migration as applied
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('imports', '0004_add_error_count_field', NOW())
                """)
                print("Migration marked as applied!")
            except Exception as e:
                print(f"Error adding column: {str(e)}")

if __name__ == "__main__":
    add_error_count_column() 