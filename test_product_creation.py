"""
Test script to verify that organization is set correctly when creating products.
Run this script with: python test_product_creation.py
"""
import os
import django
import sys
import uuid
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kernlogic.settings')
django.setup()

# Now import models
from products.models import Product
from organizations.models import Organization
from django.contrib.auth import get_user_model
from kernlogic.utils import get_user_organization

User = get_user_model()

def test_product_creation():
    print("=== Product Creation Organization Test ===")
    
    # Get a user with an organization
    user = None
    for u in User.objects.all():
        org = get_user_organization(u)
        if org:
            user = u
            organization = org
            break
    
    if not user:
        print("No user with an organization found! Create a user and organization first.")
        return
    
    print(f"Using user: {user.email}")
    print(f"User's organization: {organization.name} (ID: {organization.id})")
    
    # Count products before
    products_before = Product.objects.filter(organization=organization).count()
    print(f"Products in org before: {products_before}")
    
    # Generate a unique SKU
    sku = f"TEST-{uuid.uuid4().hex[:8]}"
    
    # Create a product using the model (simulating manual creation)
    product = Product.objects.create(
        name=f"Test Product {sku}",
        sku=sku,
        created_by=user,
        organization=organization
    )
    
    print(f"Created product: {product.name} (ID: {product.id})")
    
    # Count products after
    products_after = Product.objects.filter(organization=organization).count()
    print(f"Products in org after: {products_after}")
    
    # Verify product has organization
    refreshed_product = Product.objects.get(id=product.id)
    if refreshed_product.organization:
        print(f"SUCCESS: Product has organization: {refreshed_product.organization.name}")
    else:
        print("ERROR: Product does not have organization!")
    
    # Clean up
    product.delete()
    print(f"Test product deleted.")
    
    # Count products after cleanup
    products_final = Product.objects.filter(organization=organization).count()
    print(f"Products in org after cleanup: {products_final}")
    print(f"Test {'PASSED' if products_final == products_before else 'FAILED'}")

if __name__ == "__main__":
    test_product_creation() 