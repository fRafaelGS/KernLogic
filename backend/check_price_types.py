from prices.models import PriceType

# Get all price types
price_types = PriceType.objects.all()

print("\nPrice Types:")
for pt in price_types:
    print(f"ID: {pt.id}, Code: {pt.code}, Label: {pt.label}") 