#!/usr/bin/env python
"""
Fix MPTT structure for Category model.
"""
import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.db import connection
from products.models import Category
from mptt.utils import get_cached_trees
from mptt.exceptions import InvalidMove

def repair_mptt_structure():
    """Fix MPTT tree structure issues if present"""
    print("Repairing MPTT tree structure...")
    
    # Check if there are any categories with MPTT issues
    categories_with_null_tree = Category.objects.filter(
        lft__isnull=True, 
        rght__isnull=True,
        tree_id__isnull=True, 
        level__isnull=True
    )
    
    print(f"Found {categories_with_null_tree.count()} categories with all MPTT fields NULL")
    
    # Check specific issues
    missing_lft = Category.objects.filter(lft__isnull=True).count()
    missing_rght = Category.objects.filter(rght__isnull=True).count()
    missing_tree_id = Category.objects.filter(tree_id__isnull=True).count()
    missing_level = Category.objects.filter(level__isnull=True).count()
    
    print(f"Missing lft: {missing_lft}")
    print(f"Missing rght: {missing_rght}")
    print(f"Missing tree_id: {missing_tree_id}")
    print(f"Missing level: {missing_level}")
    
    # Rebuild MPTT tree
    try:
        # Rebuild the entire tree
        print("Rebuilding entire MPTT tree...")
        Category.objects.rebuild()
        print("MPTT tree rebuild completed successfully")
        
        # Verify no more issues exist
        categories_with_issues = Category.objects.filter(
            lft__isnull=True
        ).count() + Category.objects.filter(
            rght__isnull=True
        ).count() + Category.objects.filter(
            tree_id__isnull=True
        ).count() + Category.objects.filter(
            level__isnull=True
        ).count()
        
        if categories_with_issues > 0:
            print(f"WARNING: {categories_with_issues} categories still have issues")
        else:
            print("All categories now have valid MPTT tree data")
        
    except Exception as e:
        print(f"Error rebuilding MPTT tree: {e}")

def fix_simple_category_serializer():
    """Fix the SimpleCategorySerializer in views_main"""
    print("\nChecking SimpleCategorySerializer usage...")
    try:
        from products.views_main import ProductViewSet
        
        # Get the categories method
        categories_action = getattr(ProductViewSet, 'categories', None)
        if categories_action is not None:
            print("Found ProductViewSet.categories action")
            
            # Check if other view has the categories method
            from products.views_category import CategoryViewSet
            if hasattr(CategoryViewSet, 'list'):
                print("CategoryViewSet.list exists")
                
                print("Running a test query to CategoryViewSet.list...")
                from rest_framework.test import APIRequestFactory
                from django.contrib.auth import get_user_model
                
                User = get_user_model()
                if User.objects.exists():
                    user = User.objects.first()
                    print(f"Using test user: {user.email}")
                    
                    factory = APIRequestFactory()
                    request = factory.get('/api/categories/')
                    request.user = user
                    
                    try:
                        viewset = CategoryViewSet()
                        viewset.request = request
                        response = viewset.list(request)
                        print(f"CategoryViewSet.list response status: {response.status_code}")
                    except Exception as e:
                        print(f"Error testing CategoryViewSet.list: {e}")
                else:
                    print("No users exist to test with")
        else:
            print("ProductViewSet.categories action not found")
    except Exception as e:
        print(f"Error checking SimpleCategorySerializer: {e}")

if __name__ == "__main__":
    # First, check for MPTT issues and repair if needed
    repair_mptt_structure()
    
    # Check SimpleCategorySerializer issue
    fix_simple_category_serializer()
    
    # Print out current categories
    print("\nCurrent categories:")
    for category in Category.objects.all():
        print(f"- {category.name} (ID: {category.id}, MPTT: lft={category.lft}, rght={category.rght}, tree_id={category.tree_id}, level={category.level})") 