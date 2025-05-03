from django.test import TestCase
from rest_framework import status
from products.models import Product
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from organizations.models import Organization
from teams.models import Membership, Role

User = get_user_model()

class SkuUniquenessTestCase(TestCase):
    def setUp(self):
        # Create organizations
        self.org1 = Organization.objects.create(name="Test Org 1")
        self.org2 = Organization.objects.create(name="Test Org 2")

        # Create role for memberships
        self.role = Role.objects.create(name="Admin")
        
        # Create test users
        self.user1 = User.objects.create_user(
            username="user1", 
            email="user1@example.com", 
            password="password123",
            name="Test User 1"
        )
        
        self.user2 = User.objects.create_user(
            username="user2", 
            email="user2@example.com", 
            password="password123",
            name="Test User 2"
        )
        
        self.user3 = User.objects.create_user(
            username="user3", 
            email="user3@example.com", 
            password="password123",
            name="Test User 3"
        )
        
        # Create memberships instead of setting profile.organization
        Membership.objects.create(
            user=self.user1,
            organization=self.org1,
            role=self.role,
            status='active'
        )
        
        Membership.objects.create(
            user=self.user2,
            organization=self.org2,
            role=self.role,
            status='active'
        )
        
        Membership.objects.create(
            user=self.user3,
            organization=self.org1,  # Same org as user1
            role=self.role,
            status='active'
        )
        
    def test_sku_uniqueness_constraint(self):
        """Test that SKUs must be unique per organization."""
        # Create a product with a unique SKU for user1 in org1
        product1 = Product.objects.create(
            name="Test Product",
            sku="SKU123",
            price=10.99,
            created_by=self.user1,
            organization=self.org1
        )
        
        # Same SKU for user2 in org2 should work (different organization)
        product2 = Product.objects.create(
            name="Test Product 2",
            sku="SKU123",
            price=9.99,
            created_by=self.user2,
            organization=self.org2
        )
        
        # Same SKU for user3 in org1 should fail (same organization as user1)
        with self.assertRaises(IntegrityError):
            Product.objects.create(
                name="Test Product 3",
                sku="SKU123",
                price=12.99,
                created_by=self.user3,
                organization=self.org1
            ) 