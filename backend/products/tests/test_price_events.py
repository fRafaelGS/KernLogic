from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from products.models import Product, ProductEvent
from prices.models import ProductPrice, PriceType, Currency
from organizations.models import Organization
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class PriceEventPayloadTest(APITestCase):
    """Test the Product Price Event Payloads for diff-based structure"""
    
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
        
        # Create test currencies
        self.currency_usd = Currency.objects.create(
            iso_code="USD",
            symbol="$",
            name="US Dollar",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        self.currency_eur = Currency.objects.create(
            iso_code="EUR",
            symbol="€",
            name="Euro",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        # Create price types
        self.price_type_base = PriceType.objects.create(
            code="base",
            label="Base Price",
            organization=self.org
        )
        
        self.price_type_msrp = PriceType.objects.create(
            code="msrp",
            label="MSRP",
            organization=self.org
        )
        
        # Create a product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TP001",
            organization=self.org,
            created_by=self.user
        )

    def test_price_created_event_payload(self):
        """Test that price_created events have the correct diff-based payload structure"""
        # Create a new price
        url = f"/api/products/{self.product.id}/prices/"
        price_data = {
            "price_type": "base",
            "currency": "USD",
            "amount": "99.99",
            "valid_from": timezone.now().date().isoformat()
        }
        
        response = self.client.post(url, price_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the price history to check for the price_created event
        history_url = f"/api/products/{self.product.id}/history/"
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        
        # Find the price_created event in the history
        price_created_event = None
        for event in history_response.data["results"]:
            if event["event_type"] == "price_created":
                price_created_event = event
                break
                
        # Verify the event exists
        self.assertIsNotNone(price_created_event, "No price_created event found in history")
        
        # Check that the payload has the correct structure
        self.assertIn("payload", price_created_event)
        payload = price_created_event["payload"]
        
        # Verify it has changes and old_data
        self.assertIn("changes", payload)
        self.assertIn("old_data", payload)
        
        # Verify the structure of changes
        changes = payload["changes"]
        self.assertIn("amount", changes)
        self.assertIn("currency", changes)
        self.assertIn("price_type", changes)
        
        # Verify old/new structure for each field
        for field in ["amount", "currency", "price_type"]:
            self.assertIn("old", changes[field])
            self.assertIn("new", changes[field])
        
        # Verify old values are None for a new price
        self.assertIsNone(changes["amount"]["old"])
        self.assertIsNone(changes["currency"]["old"])
        self.assertIsNone(changes["price_type"]["old"])
        
        # Verify new values match what was created
        self.assertEqual(changes["amount"]["new"], "99.99")
        self.assertEqual(changes["currency"]["new"], "USD")
        self.assertEqual(changes["price_type"]["new"], "base")

    def test_price_updated_event_payload(self):
        """Test that price_updated events have the correct diff-based payload structure"""
        # First create a price
        initial_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_base,
            currency=self.currency_usd,
            amount=Decimal("99.99"),
            valid_from=timezone.now(),
            organization=self.org
        )
        
        # Update the price
        url = f"/api/products/{self.product.id}/prices/{initial_price.id}/"
        update_data = {
            "amount": "149.99",
            "currency": "EUR"
        }
        
        response = self.client.patch(url, update_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Get the price history to check for the price_updated event
        history_url = f"/api/products/{self.product.id}/history/"
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        
        # Find the price_updated event in the history
        price_updated_event = None
        for event in history_response.data["results"]:
            if event["event_type"] == "price_updated":
                price_updated_event = event
                break
                
        # Verify the event exists
        self.assertIsNotNone(price_updated_event, "No price_updated event found in history")
        
        # Check that the payload has the correct structure
        self.assertIn("payload", price_updated_event)
        payload = price_updated_event["payload"]
        
        # Verify it has changes and old_data
        self.assertIn("changes", payload)
        self.assertIn("old_data", payload)
        
        # Verify the structure of changes
        changes = payload["changes"]
        
        # For price_updated, we should have at least the fields that changed
        self.assertIn("amount", changes)
        self.assertIn("currency", changes)
        
        # Verify old/new structure for each field
        for field in ["amount", "currency"]:
            self.assertIn("old", changes[field])
            self.assertIn("new", changes[field])
        
        # Verify old values match what was originally set
        self.assertEqual(changes["amount"]["old"], "99.99")
        self.assertEqual(changes["currency"]["old"], "USD")
        
        # Verify new values match what was updated
        self.assertEqual(changes["amount"]["new"], "149.99")
        self.assertEqual(changes["currency"]["new"], "EUR")
        
        # Check old_data structure
        old_data = payload["old_data"]
        self.assertIn("amount", old_data)
        self.assertIn("currency", old_data)
        self.assertIn("price_type", old_data)
        
        # Verify old_data values
        self.assertEqual(old_data["amount"], "99.99")
        self.assertEqual(old_data["currency"], "USD")
        self.assertEqual(old_data["price_type"], "base")

    def test_price_deleted_event_payload(self):
        """Test that price_deleted events have the correct diff-based payload structure"""
        # First create a price
        price_to_delete = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_msrp,
            currency=self.currency_usd,
            amount=Decimal("129.99"),
            valid_from=timezone.now(),
            organization=self.org
        )
        
        # Delete the price
        url = f"/api/products/{self.product.id}/prices/{price_to_delete.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Get the price history to check for the price_deleted event
        history_url = f"/api/products/{self.product.id}/history/"
        history_response = self.client.get(history_url)
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        
        # Find the price_deleted event in the history
        price_deleted_event = None
        for event in history_response.data["results"]:
            if event["event_type"] == "price_deleted":
                price_deleted_event = event
                break
                
        # Verify the event exists
        self.assertIsNotNone(price_deleted_event, "No price_deleted event found in history")
        
        # Check that the payload has the correct structure
        self.assertIn("payload", price_deleted_event)
        payload = price_deleted_event["payload"]
        
        # Verify it has changes and old_data
        self.assertIn("changes", payload)
        self.assertIn("old_data", payload)
        
        # Verify the structure of changes
        changes = payload["changes"]
        self.assertIn("amount", changes)
        self.assertIn("currency", changes)
        self.assertIn("price_type", changes)
        
        # Verify old/new structure for each field
        for field in ["amount", "currency", "price_type"]:
            self.assertIn("old", changes[field])
            self.assertIn("new", changes[field])
        
        # Verify old values match what was deleted
        self.assertEqual(changes["amount"]["old"], "129.99")
        self.assertEqual(changes["currency"]["old"], "USD")
        self.assertEqual(changes["price_type"]["old"], "msrp")
        
        # Verify new values are None for a deleted price
        self.assertIsNone(changes["amount"]["new"])
        self.assertIsNone(changes["currency"]["new"])
        self.assertIsNone(changes["price_type"]["new"])

    def test_edge_cases(self):
        """Test edge cases like null values and currency code handling"""
        # Test with zero amount
        zero_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type_base,
            currency=self.currency_usd,
            amount=Decimal("0.00"),
            valid_from=timezone.now(),
            organization=self.org
        )
        
        # Update the price to a different currency
        url = f"/api/products/{self.product.id}/prices/{zero_price.id}/"
        update_data = {
            "currency": "EUR"
        }
        
        response = self.client.patch(url, update_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Get the price history
        history_url = f"/api/products/{self.product.id}/history/"
        history_response = self.client.get(history_url)
        
        # Find the price_updated event
        price_updated_event = None
        for event in history_response.data["results"]:
            if event["event_type"] == "price_updated" and "payload" in event and \
               "changes" in event["payload"] and "currency" in event["payload"]["changes"]:
                price_updated_event = event
                break
                
        self.assertIsNotNone(price_updated_event)
        
        # Verify the changes structure for currency
        changes = price_updated_event["payload"]["changes"]
        self.assertIn("currency", changes)
        self.assertEqual(changes["currency"]["old"], "USD")
        self.assertEqual(changes["currency"]["new"], "EUR")
        
        # Since we didn't update the amount, it shouldn't be in the changes
        if "amount" in changes:
            # If it is included, verify it shows no change
            self.assertEqual(changes["amount"]["old"], changes["amount"]["new"]) 