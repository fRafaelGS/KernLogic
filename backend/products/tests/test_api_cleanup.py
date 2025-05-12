from django.urls import reverse
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from ..models import Product, ProductEvent, Activity

User = get_user_model()


class APICleanupTests(TestCase):
    """
    Test that deprecated endpoints return 404 and others still work.
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
        
        # Create a test product
        self.product = Product.objects.create(
            name="Test Product",
            description="Test Description",
            sku="TEST-123",
            is_active=True,
            organization=self.organization,
            created_by=self.user
        )
        
        # Create a test product event
        self.event = ProductEvent.objects.create(
            event_type="created",
            summary="Product was created",
            payload={"product": self.product.id},
            created_by=self.user,
            product=self.product
        )
        
        # Create a test activity
        self.activity = Activity.objects.create(
            entity="product",
            entity_id=self.product.id,
            action="view",
            message="Product was viewed",
            user=self.user,
            organization=self.organization
        )
        
        # Set up the API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_versions_endpoint_returns_404(self):
        """Test that the deprecated versions endpoint returns 404."""
        url = reverse(
            'product-versions-list',  # This URL name should match what was registered in urls.py
            kwargs={'product_pk': self.product.id}
        )
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_price_history_endpoint_returns_404(self):
        """Test that the deprecated price-history endpoint returns 404."""
        url = reverse(
            'product-price-history-list',  # This URL name should match what was registered in urls.py
            kwargs={'product_pk': self.product.id}
        )
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_history_endpoint_still_works(self):
        """Test that the history endpoint still works."""
        url = reverse(
            'product-history-list',  # This URL name should match what was registered in urls.py
            kwargs={'product_pk': self.product.id}
        )
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the response contains the event
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.event.id)
    
    def test_activities_endpoint_still_works(self):
        """Test that the activities endpoint still works."""
        url = reverse(
            'product-activities-list',  # This URL name should match what was registered in urls.py
            kwargs={'product_pk': self.product.id}
        )
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the response contains the activity
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.activity.id) 