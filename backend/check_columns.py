#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection

# Query to check if the price column exists in the products_product table
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

# List all columns in the products_product table
with connection.cursor() as cursor:
    cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products_product'
    ORDER BY column_name;
    """)
    
    columns = cursor.fetchall()
    
    print("\nAll columns in the products_product table:")
    for column in columns:
        print(f"- {column[0]}") 