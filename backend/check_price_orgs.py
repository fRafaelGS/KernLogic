from prices.models import ProductPrice

# Get the organization IDs for product ID 49
prices = ProductPrice.objects.filter(product_id=49).values_list('id', 'organization_id', 'price_type__code', 'price_type__label')

print("\nOrganization IDs for prices of product 49:")
for price_id, org_id, price_type_code, price_type_label in prices:
    print(f"Price ID: {price_id}, Organization ID: {org_id}, Price Type: {price_type_code} ({price_type_label})") 