import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.core.settings')
django.setup()

# Import models
from django.contrib.auth import get_user_model
from products.models import Product
from organizations.models import Organization
from accounts.models import Profile
from teams.models import Membership

User = get_user_model()

def check_product_organizations():
    # First check organizations in the database
    print("=== Organizations in the database ===")
    organizations = Organization.objects.all()
    
    for org in organizations:
        print(f"Organization: {org.name}")
        print(f"  ID: {org.id}")
        print(f"  UUID: {org.uuid}")
    
    print("\n=== User Information ===")
    user = User.objects.filter(email="rgarciasaraiva@gmail.com").first()
    if user:
        print(f"User: {user.email} (ID: {user.id})")
        
        # Check user's profile organization
        profile = Profile.objects.filter(user=user).first()
        if profile and profile.organization:
            org = profile.organization
            print(f"Profile Organization: {org.name}")
            print(f"  ID: {org.id}")
            print(f"  UUID: {org.uuid}")
        else:
            print("User has no profile organization")
        
        # Check user's memberships
        memberships = Membership.objects.filter(user=user)
        print(f"\nUser has {memberships.count()} membership(s):")
        for membership in memberships:
            print(f"  Membership ID: {membership.id}")
            print(f"  Organization ID: {membership.org_id}")
            print(f"  Role: {membership.role.name}")
            print(f"  Status: {membership.status}")
    else:
        print("User not found")
    
    # Check products
    print("\n=== Products Organization Links ===")
    products = Product.objects.all()
    print(f"Total products: {products.count()}")
    
    # Group products by organization
    org_product_count = {}
    for product in products:
        org_id = str(product.organization_id) if product.organization_id else "None"
        org_uuid = str(product.organization.uuid) if product.organization else "None" 
        
        key = f"{org_id} (UUID: {org_uuid})"
        if key not in org_product_count:
            org_product_count[key] = 0
        org_product_count[key] += 1
    
    # Show product counts by organization
    for org_key, count in org_product_count.items():
        print(f"Organization {org_key}: {count} products")
    
    # Show more details about first few products
    print("\n=== Sample Product Details ===")
    for product in products[:5]:  # Show first 5 products
        print(f"Product: {product.name} (SKU: {product.sku})")
        print(f"  Organization ID: {product.organization_id}")
        if product.organization:
            print(f"  Organization Name: {product.organization.name}")
            print(f"  Organization UUID: {product.organization.uuid}")
        print()

if __name__ == "__main__":
    check_product_organizations() 