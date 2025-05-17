#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kernlogic.settings')
django.setup()

from django.db import connection

# Enable query logging
from django.conf import settings
settings.DEBUG = True

try:
    # First check if our index exists
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'products_product'
            AND indexname = 'idx_product_created_desc';
        """)
        results = cursor.fetchall()
        
        print("\n===== INDEX INFO =====")
        if results:
            for row in results:
                print(f"Index name: {row[0]}")
                print(f"Index definition: {row[1]}")
        else:
            print("The index 'idx_product_created_desc' does not exist yet.")
        
    # Now run EXPLAIN ANALYZE
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                EXPLAIN (ANALYZE, BUFFERS)
                SELECT id, name FROM products_product
                ORDER BY created_at DESC LIMIT 25;
            """)
            explain_results = cursor.fetchall()
            
            print("\n===== QUERY EXECUTION PLAN =====")
            for row in explain_results:
                print(row[0])
                
        except Exception as e:
            print(f"EXPLAIN ANALYZE not supported: {e}")
            
            # Try a simpler EXPLAIN if ANALYZE is not supported
            cursor.execute("""
                EXPLAIN 
                SELECT id, name FROM products_product
                ORDER BY created_at DESC LIMIT 25;
            """)
            explain_results = cursor.fetchall()
            
            print("\n===== SIMPLE EXPLAIN PLAN =====")
            for row in explain_results:
                print(row[0])
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc() 