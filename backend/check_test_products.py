import os
import django
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from products.models import Product

# Fetch test products
test_products = Product.objects.filter(sku__startswith='TEST-')

print(f"Found {test_products.count()} test products:")
print("="*50)

for p in test_products:
    print(f"Product: {p.name}")
    print(f"SKU: {p.sku}")
    
    # Handle tags parsing based on format
    if isinstance(p.tags, str):
        try:
            # Try to parse as JSON
            tags = json.loads(p.tags)
            print(f"Tags (JSON): {tags}")
        except json.JSONDecodeError:
            # Not JSON, just print as is
            print(f"Tags (string): {p.tags}")
    else:
        print(f"Tags (other): {p.tags}")
    
    print("-"*50) 