from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .utils import create_test_organization

class FieldSchemaEndpointTests(APITestCase):
    """
    Test cases for the field schema endpoint.
    """
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='test@example.com', 
            password='testpassword',
            first_name='Test',
            last_name='User'
        )
        self.organization = create_test_organization(owner=self.user)
        
        self.client.force_authenticate(user=self.user)
        self.url = reverse('field-schema')
    
    def test_endpoint_exists(self):
        """Test that the endpoint exists and returns a 200 response."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_endpoint_requires_authentication(self):
        """Test that the endpoint requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_response_structure(self):
        """Test that the response has the expected structure."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the response is a list
        self.assertIsInstance(response.data, list)
        
        # Check that each item has the required fields
        for item in response.data:
            self.assertIn('id', item)
            self.assertIn('label', item)
            self.assertIn('required', item)
            self.assertIn('type', item) 