from prices.models import ProductPrice
from django.contrib.auth import get_user_model
import sys

User = get_user_model()

# Get the organization IDs for product ID 49
prices = ProductPrice.objects.filter(product_id=49).values('id', 'organization_id', 'price_type__code', 'price_type__label')

# Print directly to stdout for better reliability
sys.stdout.write("\nOrganization IDs for prices of product 49:\n")
for price in prices:
    sys.stdout.write(f"Price ID: {price['id']}, Org ID: {price['organization_id']}, Type: {price['price_type__code']} ({price['price_type__label']})\n")
sys.stdout.flush()

# Also print all organizations for all users
sys.stdout.write("\nUser Organizations:\n")
for user in User.objects.all():
    try:
        org = user.orgs_memberships.first().org if user.orgs_memberships.exists() else None
        sys.stdout.write(f"User {user.username}: {org}\n")
    except:
        sys.stdout.write(f"User {user.username}: No organization\n")
sys.stdout.flush() 