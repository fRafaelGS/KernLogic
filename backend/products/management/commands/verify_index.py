from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings

class Command(BaseCommand):
    help = 'Verifies the index created on products_product(-created_at)'

    def handle(self, *args, **options):
        # Check if our index exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'products_product'
                AND indexname = 'idx_product_created_desc';
            """)
            results = cursor.fetchall()
            
            self.stdout.write(self.style.SUCCESS("\n===== INDEX INFO ====="))
            if results:
                for row in results:
                    self.stdout.write(f"Index name: {row[0]}")
                    self.stdout.write(f"Index definition: {row[1]}")
            else:
                self.stdout.write(self.style.ERROR("The index 'idx_product_created_desc' does not exist yet."))
            
        # Try to run EXPLAIN
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    EXPLAIN 
                    SELECT id, name FROM products_product
                    ORDER BY created_at DESC LIMIT 25;
                """)
                explain_results = cursor.fetchall()
                
                self.stdout.write(self.style.SUCCESS("\n===== QUERY PLAN ====="))
                for row in explain_results:
                    self.stdout.write(str(row[0]))
                    
                # Check if the index is mentioned in the plan
                plan_text = ' '.join([str(row[0]) for row in explain_results])
                if 'idx_product_created_desc' in plan_text:
                    self.stdout.write(self.style.SUCCESS("\nThe index is being used for this query!"))
                else:
                    self.stdout.write(self.style.WARNING("\nThe index is NOT being used for this query."))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error running EXPLAIN: {e}")) 