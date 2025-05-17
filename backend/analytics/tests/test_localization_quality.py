import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from products.models import ProductAttributeValue, Product, Attribute
from organizations.models import Organization
from locales.models import Locale

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def analytics_user():
    """Create a user with analytics permissions."""
    org = Organization.objects.create(name="Test Organization")
    user = User.objects.create_user(
        username="analytics_user",
        email="analytics@example.com",
        password="securepassword",
        organization=org
    )
    
    # Add analytics permission
    content_type = ContentType.objects.get_for_model(ProductAttributeValue)
    permission = Permission.objects.get_or_create(
        codename='view_analytics',
        name='Can view analytics',
        content_type=content_type,
    )[0]
    user.user_permissions.add(permission)
    
    return user


@pytest.fixture
def unprivileged_user():
    """Create a user without analytics permissions."""
    org = Organization.objects.create(name="Another Organization")
    return User.objects.create_user(
        username="regular_user",
        email="regular@example.com",
        password="securepassword",
        organization=org
    )


@pytest.fixture
def test_data(analytics_user):
    """Create test data for localization quality tests."""
    # Create locales
    fr_locale = Locale.objects.create(code="fr_FR", name="French")
    de_locale = Locale.objects.create(code="de_DE", name="German")
    es_locale = Locale.objects.create(code="es_ES", name="Spanish")
    
    # Create products in the user's organization
    product1 = Product.objects.create(
        name="Product 1",
        organization=analytics_user.organization
    )
    
    product2 = Product.objects.create(
        name="Product 2",
        organization=analytics_user.organization
    )
    
    # Create attributes
    attr1 = Attribute.objects.create(name="Name")
    attr2 = Attribute.objects.create(name="Description")
    attr3 = Attribute.objects.create(name="Specs")
    
    # Create attribute values with different completion states
    
    # French - All attributes completed
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr1,
        locale=fr_locale,
        value="Produit 1"
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr2,
        locale=fr_locale,
        value="Description en français"
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr3,
        locale=fr_locale,
        value="Spécifications techniques"
    )
    
    # German - Only 1 of 3 attributes completed
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr1,
        locale=de_locale,
        value="Produkt 1"
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr2,
        locale=de_locale,
        value=""  # Empty value
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr3,
        locale=de_locale,
        value=None  # Null value
    )
    
    # Spanish - 2 of 3 attributes completed
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr1,
        locale=es_locale,
        value="Producto 1"
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr2,
        locale=es_locale,
        value="Descripción en español"
    )
    
    ProductAttributeValue.objects.create(
        product=product1,
        attribute=attr3,
        locale=es_locale,
        value=""  # Empty value
    )
    
    return {
        "locales": [fr_locale, de_locale, es_locale],
        "products": [product1, product2],
        "attributes": [attr1, attr2, attr3]
    }


@pytest.mark.django_db
class TestLocalizationQualityEndpoint:
    """Tests for the localization quality endpoint."""
    
    def test_authentication_required(self, api_client):
        """Test that authentication is required."""
        url = reverse('analytics:localization_quality')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_permission_required(self, api_client, unprivileged_user):
        """Test that proper permissions are required."""
        url = reverse('analytics:localization_quality')
        api_client.force_authenticate(user=unprivileged_user)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_successful_response(self, api_client, analytics_user, test_data):
        """Test successful response with proper structure."""
        url = reverse('analytics:localization_quality')
        api_client.force_authenticate(user=analytics_user)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'overall' in response.data
        assert 'locale_stats' in response.data
        
        # Check overall stats
        assert response.data['overall']['total_attributes'] == 9  # 3 locales × 3 attributes
        assert response.data['overall']['translated_attributes'] == 6  # 3 (FR) + 1 (DE) + 2 (ES)
        assert response.data['overall']['translated_pct'] == 66.7  # 6/9 rounded to 1 decimal
        
        # Check locale stats
        assert len(response.data['locale_stats']) == 3
        
        # Verify French stats
        fr_stats = next((stat for stat in response.data['locale_stats'] if stat['locale'] == 'fr_FR'), None)
        assert fr_stats is not None
        assert fr_stats['total_attributes'] == 3
        assert fr_stats['translated_attributes'] == 3
        assert fr_stats['translated_pct'] == 100.0
        
        # Verify German stats
        de_stats = next((stat for stat in response.data['locale_stats'] if stat['locale'] == 'de_DE'), None)
        assert de_stats is not None
        assert de_stats['total_attributes'] == 3
        assert de_stats['translated_attributes'] == 1
        assert de_stats['translated_pct'] == 33.3
        
        # Verify Spanish stats
        es_stats = next((stat for stat in response.data['locale_stats'] if stat['locale'] == 'es_ES'), None)
        assert es_stats is not None
        assert es_stats['total_attributes'] == 3
        assert es_stats['translated_attributes'] == 2
        assert es_stats['translated_pct'] == 66.7
    
    def test_locale_filter(self, api_client, analytics_user, test_data):
        """Test filtering by locale."""
        url = reverse('analytics:localization_quality') + '?locale=fr_FR'
        api_client.force_authenticate(user=analytics_user)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['locale_stats']) == 1
        assert response.data['locale_stats'][0]['locale'] == 'fr_FR'
        assert response.data['locale_stats'][0]['total_attributes'] == 3
        assert response.data['locale_stats'][0]['translated_attributes'] == 3
        assert response.data['locale_stats'][0]['translated_pct'] == 100.0
    
    def test_date_filters(self, api_client, analytics_user, test_data):
        """Test filtering by date range."""
        # This is a simplified test since we're not modifying dates in our fixture
        url = reverse('analytics:localization_quality') + '?from_date=2023-01-01&to_date=2030-01-01'
        api_client.force_authenticate(user=analytics_user)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Data should still be present since our test data is created within the range
        assert 'locale_stats' in response.data
        assert len(response.data['locale_stats']) > 0
    
    def test_multiple_filters(self, api_client, analytics_user, test_data):
        """Test using multiple filters together."""
        url = (
            reverse('analytics:localization_quality') + 
            '?locale=fr_FR&from_date=2023-01-01&to_date=2030-01-01'
        )
        api_client.force_authenticate(user=analytics_user)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['locale_stats']) == 1
        assert response.data['locale_stats'][0]['locale'] == 'fr_FR'
    
    def test_invalid_filters(self, api_client, analytics_user):
        """Test with invalid filter values."""
        url = reverse('analytics:localization_quality') + '?from_date=not-a-date'
        api_client.force_authenticate(user=analytics_user)
        response = api_client.get(url)
        
        # Should not error, just ignore the invalid filter
        assert response.status_code == status.HTTP_200_OK
        
    def test_caching(self, api_client, analytics_user, test_data, mocker):
        """Test that responses are cached."""
        # Mock the service function to track calls
        mock_service = mocker.patch(
            'analytics.views.get_localization_quality_stats',
            wraps=get_localization_quality_stats
        )
        
        url = reverse('analytics:localization_quality')
        api_client.force_authenticate(user=analytics_user)
        
        # First call should use the service
        response1 = api_client.get(url)
        assert response1.status_code == status.HTTP_200_OK
        assert mock_service.call_count == 1
        
        # Second call should be cached (service not called again)
        response2 = api_client.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert mock_service.call_count == 1  # Still 1, not increased
        
        # Data should be the same
        assert response1.data == response2.data 