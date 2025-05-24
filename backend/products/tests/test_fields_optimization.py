import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from organizations.models import Organization
from products.models import Product, Category, Family
from prices.models import Currency, PriceType
from decimal import Decimal

User = get_user_model()


class FieldsOptimizationTestCase(TestCase):
    """Test cases for the fields query parameter optimization."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        # Create a test organization
        self.organization = Organization.objects.create(
            name="Test Org",
            slug="test-org"
        )
        
        # Create a test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a test category
        self.category = Category.objects.create(
            name="Test Category",
            organization=self.organization
        )
        
        # Create a test family
        self.family = Family.objects.create(
            code="test-family",
            label="Test Family",
            organization=self.organization
        )
        
        # Create a test product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST-001",
            description="Test description",
            brand="Test Brand",
            barcode="123456789",
            category=self.category,
            family=self.family,
            organization=self.organization,
            created_by=self.user,
            is_active=True,
            tags='["tag1", "tag2"]'
        )
        
        # Set up authentication
        self.client.force_authenticate(user=self.user)
        
    def test_fields_parameter_basic(self):
        """Test basic fields parameter functionality."""
        # Test with valid fields
        response = self.client.get('/api/products/?fields=id,name,sku')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that response contains only requested fields
        data = response.json()
        if 'results' in data:  # Paginated response
            products = data['results']
        else:
            products = data
            
        self.assertTrue(len(products) > 0)
        
        for product in products:
            # Should only have the requested fields
            expected_fields = {'id', 'name', 'sku'}
            actual_fields = set(product.keys())
            self.assertEqual(actual_fields, expected_fields)
            
    def test_fields_parameter_invalid_fields(self):
        """Test that invalid fields return a 400 error."""
        response = self.client.get('/api/products/?fields=id,invalid_field,another_invalid')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        error_data = response.json()
        self.assertIn('fields', error_data)
        self.assertIn('Invalid fields', error_data['fields'])
        
    def test_fields_parameter_all_allowed_fields(self):
        """Test that all allowed fields can be requested."""
        allowed_fields = [
            'id', 'name', 'sku', 'category_id', 'category_name',
            'brand', 'tags', 'barcode', 'is_active', 'created_at', 
            'updated_at', 'family_id', 'family_name', 'price', 
            'created_by', 'is_archived', 'primary_image_thumb'
        ]
        
        fields_param = ','.join(allowed_fields)
        response = self.client.get(f'/api/products/?fields={fields_param}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        self.assertTrue(len(products) > 0)
        
        for product in products:
            # Should have all the requested fields
            actual_fields = set(product.keys())
            expected_fields = set(allowed_fields)
            self.assertEqual(actual_fields, expected_fields)
            
    def test_fields_parameter_category_fields(self):
        """Test category-related fields."""
        response = self.client.get('/api/products/?fields=id,category_id,category_name')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        product = products[0]
        self.assertEqual(product['category_id'], self.category.id)
        self.assertEqual(product['category_name'], self.category.name)
        
    def test_fields_parameter_family_fields(self):
        """Test family-related fields."""
        response = self.client.get('/api/products/?fields=id,family_id,family_name')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        product = products[0]
        self.assertEqual(product['family_id'], self.family.id)
        self.assertEqual(product['family_name'], self.family.label)
        
    def test_fields_parameter_tags_field(self):
        """Test that tags are properly parsed from JSON."""
        response = self.client.get('/api/products/?fields=id,tags')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        product = products[0]
        self.assertEqual(product['tags'], ['tag1', 'tag2'])
        
    def test_no_fields_parameter_default_behavior(self):
        """Test that without fields parameter, the default serializer is used."""
        response = self.client.get('/api/products/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        # Should have many more fields than just the basic ones
        product = products[0]
        self.assertIn('id', product)
        self.assertIn('name', product)
        self.assertIn('description', product)
        # Should have nested objects for category, etc.
        
    def test_fields_parameter_with_filters(self):
        """Test that fields parameter works with other filters."""
        response = self.client.get(f'/api/products/?fields=id,name&brand={self.product.brand}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        self.assertTrue(len(products) > 0)
        
        for product in products:
            # Should only have the requested fields
            expected_fields = {'id', 'name'}
            actual_fields = set(product.keys())
            self.assertEqual(actual_fields, expected_fields)
            
    def test_empty_fields_parameter(self):
        """Test that empty fields parameter uses default behavior."""
        response = self.client.get('/api/products/?fields=')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should behave like no fields parameter was provided
        data = response.json()
        if 'results' in data:
            products = data['results']
        else:
            products = data
            
        product = products[0]
        # Should have many fields, not just a few
        self.assertGreater(len(product.keys()), 5) 