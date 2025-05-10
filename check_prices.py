import os
import django
import sys

# Add the backend directory to path
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.kernlogic.settings')
django.setup()

from prices.models import ProductPrice

# Count prices for product ID 49
count = ProductPrice.objects.filter(product_id=49).count()
print(f"Number of prices for product ID 49: {count}")

# List all prices for this product
prices = ProductPrice.objects.filter(product_id=49)
print("\nPrice details:")
for i, price in enumerate(prices, 1):
    print(f"{i}. Type: {price.price_type}, Amount: {price.amount} {price.currency}, Created: {price.created_at}") 