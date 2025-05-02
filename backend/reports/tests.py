from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import ReportTheme

User = get_user_model()

class ReportThemeTests(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test report themes
        ReportTheme.objects.create(
            slug='completeness',
            name='Data Completeness',
            description='Analyze the completeness of your product data across all fields.'
        )
        ReportTheme.objects.create(
            slug='readiness',
            name='Marketplace Readiness',
            description='Check if your products meet the criteria for different sales channels.'
        )
        
        # Set up the API client
        self.client = APIClient()
    
    def test_list_themes_authenticated(self):
        """Test retrieving report themes when authenticated"""
        # Authenticate the user
        self.client.force_authenticate(user=self.user)
        
        # Make the request
        url = reverse('report-theme-list')
        response = self.client.get(url)
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        themes = [theme['slug'] for theme in response.data]
        self.assertIn('completeness', themes)
        self.assertIn('readiness', themes)
    
    def test_list_themes_unauthenticated(self):
        """Test retrieving report themes when unauthenticated (should fail)"""
        # Make the request without authentication
        url = reverse('report-theme-list')
        response = self.client.get(url)
        
        # Check that authentication is required
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
