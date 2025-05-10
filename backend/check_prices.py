#!/usr/bin/env python
from prices.models import ProductPrice
from pprint import pprint

# Print the count
count = ProductPrice.objects.filter(product_id=49).count()
print(f"Number of prices for product ID 49: {count}")

# Simple function to convert model to dict
def to_dict(obj):
    result = {}
    for field in obj._meta.fields:
        field_name = field.name
        field_value = getattr(obj, field_name)
        result[field_name] = str(field_value)
    return result

# Get and print all prices
prices = ProductPrice.objects.filter(product_id=49)
print("\nPrice records:")
for i, price in enumerate(prices, 1):
    print(f"\n--- Price #{i} ---")
    price_dict = to_dict(price)
    for key, value in price_dict.items():
        print(f"{key}: {value}") 