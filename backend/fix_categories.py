#!/usr/bin/env python
"""
Fix category migration by copying data from the original string field to the new FK field.
"""
import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.db import connection
from products.models import Product, Category
from organizations.models import Organization
from django.db.models import Count, Q

def rebuild_from_existing_categories():
    """
    We need to rebuild the connections between products and categories.
    Since the old category text field is gone, we need to find products that have
    no category and try to match them with existing categories.
    """
    print("Rebuilding product-category connections...")
    
    # Get all products without a category
    products_without_category = Product.objects.filter(category__isnull=True).exclude(is_archived=True)
    print(f"Found {products_without_category.count()} products without a category")
    
    # Get all categories
    categories = Category.objects.all()
    print(f"Found {categories.count()} categories")
    
    # Keep track of fixes
    fixed_count = 0
    
    # Get unique organizations
    organizations = Organization.objects.filter(
        id__in=products_without_category.values_list('organization_id', flat=True).distinct()
    )
    
    for org in organizations:
        # Get products without category for this organization
        org_products = products_without_category.filter(organization=org)
        print(f"Organization {org.id}: {org_products.count()} products without category")
        
        # Get categories for this organization
        org_categories = categories.filter(organization=org)
        if not org_categories.exists():
            print(f"No categories found for organization {org.id}")
            continue
            
        print(f"Found {org_categories.count()} categories for organization {org.id}")
        
        # For each category, try to find products with matching words in the name or description
        for category in org_categories:
            # Simple name-based matching - if the category name is in the product name
            matching_products = org_products.filter(
                Q(name__icontains=category.name) | 
                Q(description__icontains=category.name)
            )
            
            if matching_products.exists():
                count = matching_products.count()
                print(f"Found {count} products matching category '{category.name}'")
                
                # Update these products to use this category
                matching_products.update(category=category)
                fixed_count += count
    
    print(f"Fixed {fixed_count} products by name/description matching")
    return fixed_count

def repair_mptt_structure():
    """Fix MPTT tree structure issues if present"""
    from mptt.utils import get_cached_trees
    from mptt.exceptions import InvalidMove
    
    print("Repairing MPTT tree structure...")
    
    # Check if there are any categories with MPTT issues
    categories_with_null_tree = Category.objects.filter(
        Q(lft__isnull=True) | Q(rght__isnull=True) |
        Q(tree_id__isnull=True) | Q(level__isnull=True)
    )
    
    print(f"Found {categories_with_null_tree.count()} categories with MPTT issues")
    
    # Rebuild MPTT tree
    try:
        # Rebuild the entire tree
        print("Rebuilding entire MPTT tree...")
        Category.objects.rebuild()
        print("MPTT tree rebuild completed successfully")
        
        # Verify no more issues exist
        categories_with_issues = Category.objects.filter(
            Q(lft__isnull=True) | Q(rght__isnull=True) |
            Q(tree_id__isnull=True) | Q(level__isnull=True)
        )
        
        if categories_with_issues.exists():
            print(f"WARNING: {categories_with_issues.count()} categories still have issues")
        else:
            print("All categories now have valid MPTT tree data")
        
    except Exception as e:
        print(f"Error rebuilding MPTT tree: {e}")
    
    return categories_with_null_tree.count()

def list_existing_categories():
    """List existing categories to help diagnose issues"""
    print("Listing existing categories...")
    
    # Get organizations with categories
    orgs_with_categories = Organization.objects.filter(
        id__in=Category.objects.values_list('organization_id', flat=True).distinct()
    )
    
    for org in orgs_with_categories:
        categories = Category.objects.filter(organization=org)
        print(f"Organization {org.id} - {categories.count()} categories:")
        
        for category in categories:
            # Count products using this category
            product_count = Product.objects.filter(category=category).count()
            print(f"  - {category.name} (ID: {category.id}): {product_count} products")

if __name__ == "__main__":
    # First, check for MPTT issues and repair if needed
    repair_mptt_structure()
    
    # List existing categories
    list_existing_categories()
    
    # Try to rebuild product-category connections
    fixed_count = rebuild_from_existing_categories()
    print(f"Total fixed: {fixed_count}")
    
    # Final check
    unfixed_count = Product.objects.filter(category__isnull=True).exclude(is_archived=True).count()
    print(f"{unfixed_count} products still without a category") 