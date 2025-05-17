import json
import os
import pytest
import requests
from django.urls import reverse
from django.test import override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

# Import your models if needed for test setup
from analytics.models import DimLocale, DimChannel, DimAttribute, DimProduct, FactProductAttribute

User = get_user_model()

# Skip tests if not running in integration test environment
pytestmark = pytest.mark.skipif(
    os.environ.get('TESTING') != '1',
    reason="Integration tests should only run in test environment"
)

@pytest.fixture
def api_client():
    """Return an authenticated API client"""
    client = APIClient()
    user = User.objects.create_superuser(
        username='integrationtest',
        email='integrationtest@example.com',
        password='testpassword123'
    )
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def test_data():
    """Create test data for localization quality tests"""
    # Create dimensions
    locale_en = DimLocale.objects.create(code='en_US', description='English (US)')
    locale_fr = DimLocale.objects.create(code='fr_FR', description='French')
    
    channel_web = DimChannel.objects.create(code='web', description='Website')
    
    attribute_name = DimAttribute.objects.create(
        code='name',
        label='Product Name',
        type='text',
        is_required=True
    )
    
    attribute_desc = DimAttribute.objects.create(
        code='description',
        label='Product Description',
        type='text',
        is_required=True
    )
    
    # Create products
    product1 = DimProduct.objects.create(
        dim_id=1,
        sku='TEST-001',
        name='Test Product 1',
        organization_id=1
    )
    
    product2 = DimProduct.objects.create(
        dim_id=2,
        sku='TEST-002',
        name='Test Product 2',
        organization_id=1
    )
    
    # Create fact records
    FactProductAttribute.objects.create(
        product=product1,
        attribute=attribute_name,
        locale=locale_en,
        channel=channel_web,
        completed=True,
        organization_id=1
    )
    
    FactProductAttribute.objects.create(
        product=product1,
        attribute=attribute_desc,
        locale=locale_en,
        channel=channel_web,
        completed=True,
        organization_id=1
    )
    
    FactProductAttribute.objects.create(
        product=product1,
        attribute=attribute_name,
        locale=locale_fr,
        channel=channel_web,
        completed=True,
        organization_id=1
    )
    
    FactProductAttribute.objects.create(
        product=product1,
        attribute=attribute_desc,
        locale=locale_fr,
        channel=channel_web,
        completed=False,
        organization_id=1
    )
    
    FactProductAttribute.objects.create(
        product=product2,
        attribute=attribute_name,
        locale=locale_en,
        channel=channel_web,
        completed=True,
        organization_id=1
    )
    
    FactProductAttribute.objects.create(
        product=product2,
        attribute=attribute_desc,
        locale=locale_en,
        channel=channel_web,
        completed=True,
        organization_id=1
    )
    
    return {
        'locales': [locale_en, locale_fr],
        'channels': [channel_web],
        'attributes': [attribute_name, attribute_desc],
        'products': [product1, product2]
    }

@pytest.mark.django_db
@override_settings(PRODUCTS_API_BASE_URL='http://products-mock:4010/api')
@override_settings(SERVICE_JWT_TOKEN='test-service-jwt-token')
def test_localization_quality_endpoint_integration(api_client, test_data):
    """
    Test that the localization quality endpoint correctly integrates with the Products API
    and returns valid data.
    """
    # Define the URL
    url = reverse('localization_quality')
    
    # Make the API request
    response = api_client.get(url)
    
    # Assert basic response structure
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Verify the response format matches the API contract
    assert 'overall' in data
    assert 'locale_stats' in data
    
    # Verify overall stats are present and have the correct structure
    assert 'total_attributes' in data['overall']
    assert 'translated_attributes' in data['overall']
    assert 'translated_pct' in data['overall']
    
    # Verify locale stats are present and have expected format
    assert isinstance(data['locale_stats'], list)
    assert len(data['locale_stats']) > 0
    
    # Check the structure of each locale stat
    for locale_stat in data['locale_stats']:
        assert 'locale' in locale_stat
        assert 'total_attributes' in locale_stat
        assert 'translated_attributes' in locale_stat
        assert 'translated_pct' in locale_stat
    
    # Verify the integration with Products API by checking if
    # the French locale stats are present (which should be queried from Products API)
    french_stats = next((stat for stat in data['locale_stats'] if stat['locale'] == 'fr_FR'), None)
    assert french_stats is not None, "French locale statistics should be present in the response"
    
    # Log stats for debugging
    print("Localization Quality Response:", json.dumps(data, indent=2))

@pytest.mark.django_db
@override_settings(PRODUCTS_API_BASE_URL='http://products-mock:4010/api')
@override_settings(SERVICE_JWT_TOKEN='test-service-jwt-token')
def test_localization_quality_with_filters(api_client, test_data):
    """
    Test that the localization quality endpoint correctly handles filters
    and integrates with the Products API.
    """
    # Define the URL with query parameters
    url = f"{reverse('localization_quality')}?locale=fr_FR&channel=web"
    
    # Make the API request
    response = api_client.get(url)
    
    # Assert basic response structure
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    # Check that the response is filtered correctly
    assert 'locale_stats' in data
    
    # Should only include french locale in the stats
    locale_codes = [stat['locale'] for stat in data['locale_stats']]
    assert 'fr_FR' in locale_codes
    assert 'en_US' not in locale_codes, "English locale should be filtered out"
    
    # Log stats for debugging
    print("Filtered Localization Quality Response:", json.dumps(data, indent=2))

@pytest.mark.django_db
def test_products_api_mock_server(api_client):
    """
    Test that the Prism mock server for the Products API is working correctly.
    This is a sanity check to ensure the mock environment is set up properly.
    """
    # Get the Products API base URL from environment
    products_api_base = os.environ.get('PRODUCTS_API_BASE_URL', 'http://products-mock:4010/api')
    
    # Make a direct request to the mock server
    response = requests.get(f"{products_api_base}/products/")
    
    # Assert that the mock server responds correctly
    assert response.status_code == status.HTTP_200_OK, "Products API mock server should respond to requests"
    
    # Verify the response has the expected structure for a products list
    data = response.json()
    assert 'results' in data, "Response should include 'results' key"
    assert isinstance(data['results'], list), "Results should be a list" 