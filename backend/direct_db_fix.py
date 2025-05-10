#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

# Directly execute SQL to drop the price column
with connection.cursor() as cursor:
    print("Attempting to remove the 'price' column from products_product table...")
    cursor.execute("ALTER TABLE products_product DROP COLUMN IF EXISTS price;")
    print("SQL executed successfully.")

# Verify the column has been removed
with connection.cursor() as cursor:
    cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products_product' 
    AND column_name = 'price';
    """)
    
    result = cursor.fetchall()
    
    if result:
        print("The 'price' column still exists in the products_product table.")
    else:
        print("The 'price' column has been successfully removed from the products_product table.")

print("\nDone!") 