from prices.models import ProductPrice
from django.core import serializers
import json

# Get count
count = ProductPrice.objects.filter(product_id=49).count()
print(f"Number of prices for product ID 49: {count}")

# Get raw data via serialization
prices_data = serializers.serialize('json', ProductPrice.objects.filter(product_id=49))
prices_json = json.loads(prices_data)

# Print each price record
for i, price_data in enumerate(prices_json, 1):
    print(f"\n--- Price #{i} ---")
    fields = price_data['fields']
    fields['id'] = price_data['pk']
    for key, value in fields.items():
        print(f"{key}: {value}")

print("\nDone.") 