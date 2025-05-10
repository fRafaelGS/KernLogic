from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Product
from prices.models import ProductPrice, PriceType, Currency
from organizations.models import Organization
from django.contrib.auth import get_user_model
from datetime import timedelta

User = get_user_model()

class ProductPricesAPITest(APITestCase):
    """Test the Product Prices API endpoints"""
    
    def setUp(self):
        """Set up test data and authenticate client"""
        # Create user and organization
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword",
            is_active=True
        )
        
        self.org = Organization.objects.create(
            name="Test Organization"
        )
        
        # Authenticate the client
        response = self.client.post(
            "/api/token/",
            {"email": "testuser@example.com", "password": "testpassword"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        
        # Create test data
        self.currency = Currency.objects.create(
            iso_code="USD",
            symbol="$",
            name="US Dollar",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        # Create a secondary currency for testing updates
        self.currency_chf = Currency.objects.create(
            iso_code="CHF",
            symbol="CHF",
            name="Swiss Franc",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        # Create multiple price types
        self.price_type_base = PriceType.objects.create(
            code="base",
            label="Base Price",
            organization=self.org
        )
        
        self.price_type_list = PriceType.objects.create(
            code="list",
            label="List Price",
            organization=self.org
        )
        
        self.price_type_wholesale = PriceType.objects.create(
            code="wholesale",
            label="Wholesale Price",
            organization=self.org
        )
        
        # Create a product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TP001",
            organization=self.org,
            created_by=self.user
        )
        
        # Create multiple prices for the product
        self.now = timezone.now()
        
        # Base price
        self.base_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_base,
            currency=self.currency,
            amount=99.99,
            valid_from=self.now,
            organization=self.org
        )
        
        # List price
        self.list_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_list,
            currency=self.currency,
            amount=129.99,
            valid_from=self.now,
            organization=self.org
        )
        
        # Wholesale price
        self.wholesale_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_wholesale,
            currency=self.currency,
            amount=79.99,
            valid_from=self.now,
            organization=self.org
        )
        
    def test_get_all_prices(self):
        """Test that the prices endpoint returns all prices for a product"""
        url = f"/api/products/{self.product.id}/prices/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify we get all 3 prices
        self.assertEqual(len(response.data), 3)
        
        # Check that each price type is in the response
        price_types = [price["price_type"] for price in response.data]
        self.assertIn('base', price_types)
        self.assertIn('list', price_types)
        self.assertIn('wholesale', price_types)
        
    def test_price_filtering(self):
        """Test that price filtering still works"""
        # Test filtering by currency
        url = f"/api/products/{self.product.id}/prices/?currency=USD"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        
        # Test valid_only filter
        # First set one price to be invalid (expired)
        self.wholesale_price.valid_to = self.now - timedelta(days=1)
        self.wholesale_price.save()
        
        url = f"/api/products/{self.product.id}/prices/?valid_only=true"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Should only get base and list prices
        
        # Verify the wholesale price is not included
        price_types = [price["price_type"] for price in response.data]
        self.assertNotIn('wholesale', price_types)
        
    def test_update_price_currency(self):
        """Test updating a price's currency and amount"""
        url = f"/api/products/{self.product.id}/prices/{self.base_price.id}/"
        
        # Update the base price to use CHF currency and a new amount
        data = {
            "currency": "CHF",
            "amount": 4444
        }
        
        response = self.client.patch(url, data, format="json")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK, 
                         f"Expected 200 OK but got {response.status_code}: {response.data}")
        
        # Verify the currency was updated
        self.assertEqual(response.data["currency"], "CHF")
        
        # Verify the amount was updated
        self.assertEqual(float(response.data["amount"]), 4444.00)
        
        # Verify in the database
        self.base_price.refresh_from_db()
        self.assertEqual(self.base_price.currency.iso_code, "CHF")
        self.assertEqual(float(self.base_price.amount), 4444.00)
        
        # Now update only the amount to test Decimal serialization
        data = {
            "amount": 5555.55
        }
        
        response = self.client.patch(url, data, format="json")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK, 
                       f"Expected 200 OK but got {response.status_code}: {response.data}")
                       
        # Verify the amount was updated
        self.assertEqual(float(response.data["amount"]), 5555.55)
        
        # Verify in the database
        self.base_price.refresh_from_db()
        self.assertEqual(float(self.base_price.amount), 5555.55) 