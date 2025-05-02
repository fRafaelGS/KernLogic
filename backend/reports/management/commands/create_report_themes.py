from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Creates report_themes table and initial data'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if the table already exists
            cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='reports_reporttheme';
            """)
            
            if not cursor.fetchone():
                self.stdout.write('Creating reports_reporttheme table...')
                # Create the table
                cursor.execute("""
                    CREATE TABLE "reports_reporttheme" (
                        "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                        "slug" varchar(64) NOT NULL UNIQUE,
                        "name" varchar(128) NOT NULL,
                        "description" text NOT NULL,
                        "created_at" datetime NOT NULL
                    );
                """)
                
                # Create initial data
                self.stdout.write('Adding initial report themes...')
                cursor.execute("""
                    INSERT INTO reports_reporttheme 
                    (slug, name, description, created_at)
                    VALUES 
                    ('completeness', 'Data Completeness', 'Analyze the completeness of your product data across all fields.', datetime('now')),
                    ('readiness', 'Marketplace Readiness', 'Check if your products meet the criteria for different sales channels.', datetime('now'));
                """)
                
                self.stdout.write(self.style.SUCCESS('Successfully created report themes'))
            else:
                self.stdout.write('Table reports_reporttheme already exists. Skipping creation.') 