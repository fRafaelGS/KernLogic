#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kernlogic.settings')
django.setup()

from django.db import connection

def run_explain():
    """
    Run EXPLAIN ANALYZE on the products query to check index usage.
    """
    with connection.cursor() as cursor:
        explain_query = """
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT id, name FROM products_product
        ORDER BY created_at DESC LIMIT 25;
        """
        
        try:
            cursor.execute(explain_query)
            results = cursor.fetchall()
            
            print("===== QUERY EXECUTION PLAN =====")
            for row in results:
                print(row)
            print("================================")
            
        except Exception as e:
            print(f"Error executing EXPLAIN query: {e}")

if __name__ == "__main__":
    run_explain() 