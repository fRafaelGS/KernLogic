import json
from decimal import Decimal
from django.urls import reverse
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from ..models import Product, ProductEvent, Category, ProductPrice
from ..events import record

User = get_user_model()

class ProductRollbackTests(TestCase):
    """
    Test cases for the product field rollback functionality.
    Tests the ability to restore individual fields to previous values
    based on history events.
    """
    
    def setUp(self):
        """Set up test data and authenticate the API client."""
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser", 
            email="test@example.com",
            password="testpassword123"
        )
        
        # Create a test organization
        from organizations.models import Organization
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        # Create test categories
        self.category1 = Category.objects.create(
            name="Category 1",
            organization=self.organization
        )
        self.category2 = Category.objects.create(
            name="Category 2",
            organization=self.organization
        )
        
        # Create a test product
        self.product = Product.objects.create(
            name="Test Product",
            description="Original description",
            sku="TEST-123",
            category=self.category1,
            is_active=True,
            organization=self.organization,
            created_by=self.user
        )
        
        # Create a base price for the product
        from prices.models import PriceType, Currency
        self.price_type = PriceType.objects.create(
            code="base",
            label="Base Price"
        )
        self.currency = Currency.objects.create(
            iso_code="USD",
            name="US Dollar",
            symbol="$"
        )
        self.product_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=self.currency,
            amount=Decimal("100.00"),
            organization=self.organization
        )
        
        # Set up the API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create a history event for name change
        self.name_event = record(
            product=self.product,
            user=self.user,
            event_type="updated",
            summary="Updated product name",
            payload={
                "changes": {
                    "name": {
                        "old": "Original Product",
                        "new": "Test Product"
                    }
                },
                "old_data": {
                    "name": "Original Product",
                    "sku": "TEST-123",
                    "category": self.category1.id,
                    "is_active": True
                }
            }
        )
        
        # Create a history event for price change
        self.price_event = record(
            product=self.product,
            user=self.user,
            event_type="price_changed",
            summary="Updated product price",
            payload={
                "changes": {
                    "price": {
                        "old": 75.00,
                        "new": 100.00
                    }
                },
                "old_data": {
                    "name": "Test Product",
                    "price": 75.00,
                    "sku": "TEST-123",
                    "category": self.category1.id,
                    "is_active": True
                }
            }
        )
        
        # Create a history event for category change
        self.category_event = record(
            product=self.product,
            user=self.user,
            event_type="updated",
            summary="Updated product category",
            payload={
                "changes": {
                    "category": {
                        "old": None,
                        "new": self.category1.id
                    }
                },
                "old_data": {
                    "name": "Test Product",
                    "price": 100.00,
                    "sku": "TEST-123",
                    "category": None,
                    "is_active": True
                }
            }
        )
        
        # Create a history event for boolean field change
        self.is_active_event = record(
            product=self.product,
            user=self.user,
            event_type="updated",
            summary="Updated product status",
            payload={
                "changes": {
                    "is_active": {
                        "old": False,
                        "new": True
                    }
                },
                "old_data": {
                    "name": "Test Product",
                    "price": 100.00,
                    "sku": "TEST-123",
                    "category": self.category1.id,
                    "is_active": False
                }
            }
        )
        
    def test_rollback_name_field(self):
        """Test successful rollback of a text field (name)."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.name_event.id}
        )
        
        response = self.client.post(url, {'field': 'name'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh product from database
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Original Product")
        
        # Verify a new event was created
        latest_event = ProductEvent.objects.filter(
            product=self.product, 
            event_type="rollback"
        ).latest('created_at')
        
        self.assertEqual(latest_event.summary, "Rolled back name to Original Product")
        self.assertEqual(latest_event.payload["restored_field"], "name")
        self.assertEqual(latest_event.payload["restored_from_event"], self.name_event.id)
        self.assertEqual(latest_event.payload["old"], "Test Product")
        self.assertEqual(latest_event.payload["new"], "Original Product")
    
    def test_rollback_price_field(self):
        """Test successful rollback of a price field."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.price_event.id}
        )
        
        response = self.client.post(url, {'field': 'price'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify price was updated
        base_price = ProductPrice.objects.get(
            product=self.product,
            price_type__code="base"
        )
        self.assertEqual(base_price.amount, Decimal("75.00"))
        
        # Verify a new event was created
        latest_event = ProductEvent.objects.filter(
            product=self.product, 
            event_type="rollback"
        ).latest('created_at')
        
        self.assertEqual(latest_event.summary, "Rolled back price to 75.0")
        self.assertEqual(latest_event.payload["restored_field"], "price")
        self.assertEqual(latest_event.payload["restored_from_event"], self.price_event.id)
    
    def test_rollback_category_field(self):
        """Test successful rollback of a foreign key field (category)."""
        # First change the category to category2
        self.product.category = self.category2
        self.product.save()
        
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.category_event.id}
        )
        
        response = self.client.post(url, {'field': 'category'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh product from database
        self.product.refresh_from_db()
        self.assertIsNone(self.product.category)
        
        # Verify a new event was created
        latest_event = ProductEvent.objects.filter(
            product=self.product, 
            event_type="rollback"
        ).latest('created_at')
        
        self.assertEqual(latest_event.summary, f"Rolled back category to None")
        self.assertEqual(latest_event.payload["restored_field"], "category")
    
    def test_rollback_boolean_field(self):
        """Test successful rollback of a boolean field (is_active)."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.is_active_event.id}
        )
        
        response = self.client.post(url, {'field': 'is_active'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh product from database
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        
        # Verify a new event was created
        latest_event = ProductEvent.objects.filter(
            product=self.product, 
            event_type="rollback"
        ).latest('created_at')
        
        self.assertEqual(latest_event.summary, "Rolled back is_active to False")
        self.assertEqual(latest_event.payload["restored_field"], "is_active")
        self.assertEqual(latest_event.payload["old"], True)
        self.assertEqual(latest_event.payload["new"], False)
    
    def test_rollback_missing_field(self):
        """Test error response when field parameter is missing."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.name_event.id}
        )
        
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Missing 'field' parameter")
    
    def test_rollback_nonexistent_field(self):
        """Test error response when field doesn't exist in the changes."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.name_event.id}
        )
        
        response = self.client.post(url, {'field': 'nonexistent_field'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "No changes found for field 'nonexistent_field' in this event")
    
    def test_rollback_nonexistent_event(self):
        """Test error response when event doesn't exist."""
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': 99999}
        )
        
        response = self.client.post(url, {'field': 'name'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_rollback_without_old_value(self):
        """Test error when event doesn't have an 'old' value."""
        # Create an event with missing 'old' value
        bad_event = record(
            product=self.product,
            user=self.user,
            event_type="updated",
            summary="Bad event",
            payload={
                "changes": {
                    "description": {
                        "new": "New description"
                        # Missing 'old' key
                    }
                }
            }
        )
        
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': bad_event.id}
        )
        
        response = self.client.post(url, {'field': 'description'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "No previous value found for field 'description'")
    
    def test_rollback_same_value(self):
        """Test error when trying to rollback to the same value."""
        # Create a product with the same name as in the event's old_value
        self.product.name = "Original Product"
        self.product.save()
        
        url = reverse(
            'product-history-rollback',
            kwargs={'product_pk': self.product.id, 'pk': self.name_event.id}
        )
        
        response = self.client.post(url, {'field': 'name'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Field 'name' already has the value 'Original Product'") 