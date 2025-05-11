from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Attribute, AttributeValue, Product, ProductAsset
from organizations.models import Organization
from prices.models import Currency
from django.contrib.auth import get_user_model
from teams.models import Membership, Role
import json
import tempfile
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

class NewAttributeTypesTests(TestCase):
    def setUp(self):
        # Create test organization
        self.org = Organization.objects.create(name="Test Organization")

        # Create role for memberships
        self.role = Role.objects.create(name="Admin")
        
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='password',
        )
        
        # Create membership
        Membership.objects.create(
            user=self.user,
            organization=self.org,
            role=self.role,
            status='active'
        )
        
        # Create test product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST001",
            organization=self.org,
            created_by=self.user
        )
        
        # Create test currency
        self.currency = Currency.objects.create(
            iso_code="USD",
            name="US Dollar",
            symbol="$"
        )
        
        # Create test asset
        self.asset_file = SimpleUploadedFile(
            name='test_image.jpg',
            content=b'file_content',
            content_type='image/jpeg'
        )
        self.asset = ProductAsset.objects.create(
            product=self.product,
            organization=self.org,
            file=self.asset_file,
            asset_type='image',
            name='Test Image',
            content_type='image/jpeg',
            uploaded_by=self.user
        )
        
        # Create test attributes for each new data type
        self.rich_text_attr = Attribute.objects.create(
            code="description",
            label="Description",
            data_type="rich_text",
            organization=self.org,
            created_by=self.user
        )
        
        self.price_attr = Attribute.objects.create(
            code="retail_price",
            label="Retail Price",
            data_type="price",
            organization=self.org,
            created_by=self.user
        )
        
        self.media_attr = Attribute.objects.create(
            code="spec_sheet",
            label="Specification Sheet",
            data_type="media",
            organization=self.org,
            created_by=self.user
        )
        
        self.measurement_attr = Attribute.objects.create(
            code="width",
            label="Width",
            data_type="measurement",
            organization=self.org,
            created_by=self.user
        )
        
        self.url_attr = Attribute.objects.create(
            code="documentation_url",
            label="Documentation URL",
            data_type="url",
            organization=self.org,
            created_by=self.user
        )
        
        self.email_attr = Attribute.objects.create(
            code="support_email",
            label="Support Email",
            data_type="email",
            organization=self.org,
            created_by=self.user
        )
        
        self.phone_attr = Attribute.objects.create(
            code="support_phone",
            label="Support Phone",
            data_type="phone",
            organization=self.org,
            created_by=self.user
        )
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Base URL for creating attribute values
        self.url = reverse('product-attributes-list', kwargs={'product_pk': self.product.pk})
    
    def test_rich_text_attribute(self):
        """Test creating rich text attribute values"""
        # Valid rich text with allowed HTML
        valid_html = "<p>This is a <strong>bold</strong> statement with a <a href='https://example.com'>link</a>.</p>"
        data = {
            'attribute': self.rich_text_attr.pk,
            'value': valid_html
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that HTML was sanitized but allowed tags were kept
        created_value = AttributeValue.objects.get(pk=response.data['id'])
        self.assertIn("<strong>bold</strong>", created_value.value)
        self.assertIn("<a href=", created_value.value)
        
        # Test with script tag which should be removed
        invalid_html = "<p>Text with <script>alert('XSS');</script> script.</p>"
        data = {
            'attribute': self.rich_text_attr.pk,
            'value': invalid_html
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        created_value = AttributeValue.objects.get(pk=response.data['id'])
        self.assertNotIn("<script>", created_value.value)
        self.assertIn("<p>Text with  script.</p>", created_value.value)
        
        # Test with non-string value
        data = {
            'attribute': self.rich_text_attr.pk,
            'value': 12345
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_price_attribute(self):
        """Test creating price attribute values"""
        # Valid price
        valid_price = {
            'amount': 99.99,
            'currency': 'USD'
        }
        data = {
            'attribute': self.price_attr.pk,
            'value': valid_price
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Price with missing currency
        invalid_price = {
            'amount': 49.99
        }
        data = {
            'attribute': self.price_attr.pk,
            'value': invalid_price
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Price with invalid currency
        invalid_price = {
            'amount': 49.99,
            'currency': 'INVALID'
        }
        data = {
            'attribute': self.price_attr.pk,
            'value': invalid_price
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Price with negative amount
        invalid_price = {
            'amount': -10.00,
            'currency': 'USD'
        }
        data = {
            'attribute': self.price_attr.pk,
            'value': invalid_price
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-dict price
        data = {
            'attribute': self.price_attr.pk,
            'value': "99.99 USD"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_media_attribute(self):
        """Test creating media attribute values"""
        # Valid media reference
        valid_media = {
            'asset_id': self.asset.id
        }
        data = {
            'attribute': self.media_attr.pk,
            'value': valid_media
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Invalid asset_id
        invalid_media = {
            'asset_id': 9999  # Non-existent ID
        }
        data = {
            'attribute': self.media_attr.pk,
            'value': invalid_media
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing asset_id
        invalid_media = {}
        data = {
            'attribute': self.media_attr.pk,
            'value': invalid_media
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-dict media
        data = {
            'attribute': self.media_attr.pk,
            'value': "image.jpg"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_measurement_attribute(self):
        """Test creating measurement attribute values"""
        # Valid measurement with unit
        valid_measurement = {
            'amount': 10.5,
            'unit': 'cm'
        }
        data = {
            'attribute': self.measurement_attr.pk,
            'value': valid_measurement
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Valid measurement without unit
        valid_measurement = {
            'amount': 8.25
        }
        data = {
            'attribute': self.measurement_attr.pk,
            'value': valid_measurement
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Measurement with negative amount
        invalid_measurement = {
            'amount': -5,
            'unit': 'cm'
        }
        data = {
            'attribute': self.measurement_attr.pk,
            'value': invalid_measurement
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing amount
        invalid_measurement = {
            'unit': 'cm'
        }
        data = {
            'attribute': self.measurement_attr.pk,
            'value': invalid_measurement
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-dict measurement
        data = {
            'attribute': self.measurement_attr.pk,
            'value': "10.5 cm"
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_url_attribute(self):
        """Test creating URL attribute values"""
        # Valid URL
        valid_url = "https://example.com/docs"
        data = {
            'attribute': self.url_attr.pk,
            'value': valid_url
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Invalid URL format
        invalid_url = "not-a-url"
        data = {
            'attribute': self.url_attr.pk,
            'value': invalid_url
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-string URL
        data = {
            'attribute': self.url_attr.pk,
            'value': {"url": "https://example.com"}
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_email_attribute(self):
        """Test creating email attribute values"""
        # Valid email
        valid_email = "support@example.com"
        data = {
            'attribute': self.email_attr.pk,
            'value': valid_email
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Invalid email format
        invalid_email = "not-an-email"
        data = {
            'attribute': self.email_attr.pk,
            'value': invalid_email
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-string email
        data = {
            'attribute': self.email_attr.pk,
            'value': 12345
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_phone_attribute(self):
        """Test creating phone attribute values"""
        # Valid phone number
        valid_phone = "+12025550123"
        data = {
            'attribute': self.phone_attr.pk,
            'value': valid_phone
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Another valid format
        valid_phone = "(202) 555-0123"
        data = {
            'attribute': self.phone_attr.pk,
            'value': valid_phone
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check if it was standardized to E.164 format
        created_value = AttributeValue.objects.get(pk=response.data['id'])
        self.assertEqual(created_value.value, "+12025550123")
        
        # Invalid phone number
        invalid_phone = "not-a-phone"
        data = {
            'attribute': self.phone_attr.pk,
            'value': invalid_phone
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Non-string phone
        data = {
            'attribute': self.phone_attr.pk,
            'value': 12345
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def tearDown(self):
        # Clean up any files
        self.asset_file.close() 