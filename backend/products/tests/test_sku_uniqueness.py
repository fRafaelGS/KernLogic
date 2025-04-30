from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product
from django.contrib.auth import get_user_model
from django.db import IntegrityError
import json

User = get_user_model()

class SkuUniquenessTestCase(TestCase):
    def setUp(self):
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
        self.client = APIClient()
        
    def test_sku_uniqueness_constraint(self):
        """Test that SKUs must be unique per user."""
        # Create a product with a unique SKU for user1
        product1 = Product.objects.create(
            name="Test Product",
            sku="SKU123",
            price=10.99,
            created_by=self.user1
        )
        
        # Same SKU for user2 should work (different user)
        product2 = Product.objects.create(
            name="Test Product 2",
            sku="SKU123",
            price=9.99,
            created_by=self.user2
        )
        
        # Same SKU for user1 should fail
        with self.assertRaises(IntegrityError):
            Product.objects.create(
                name="Test Product 3",
                sku="SKU123",
                price=12.99,
                created_by=self.user1
            )

class SkuCheckAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", 
            email="test@example.com", 
            password="password123",
            name="Test User"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create some products for testing
        Product.objects.create(
            name="Product 1",
            sku="SKU001",
            price=10.99,
            created_by=self.user
        )
        Product.objects.create(
            name="Product 2",
            sku="SKU002",
            price=15.99,
            created_by=self.user
        )
        
    def test_sku_check_endpoint(self):
        """Test the SKU check endpoint."""
        url = reverse("products-sku-check")
        
        # 1. Test with no duplicates
        response = self.client.post(
            url, 
            {"skus": ["SKU999", "SKU888"]},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["duplicates"], [])
        
        # 2. Test with some duplicates
        response = self.client.post(
            url, 
            {"skus": ["SKU001", "SKU999", "SKU002"]},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        duplicates = response.data["duplicates"]
        self.assertEqual(len(duplicates), 2)
        self.assertIn("SKU001", duplicates)
        self.assertIn("SKU002", duplicates)
        
        # 3. Test with invalid request
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_authentication_required(self):
        """Test that authentication is required for the SKU check endpoint."""
        self.client.logout()
        url = reverse("products-sku-check")
        response = self.client.post(
            url, 
            {"skus": ["SKU001"]},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) 