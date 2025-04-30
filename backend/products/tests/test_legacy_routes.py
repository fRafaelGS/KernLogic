import pytest
import os
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from products.models import Product
from accounts.models import User, Organization, UserProfile

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    user = User.objects.create_user(
        email='test@example.com',
        username='testuser',
        password='testpassword'
    )
    return user

@pytest.fixture
def organization():
    return Organization.objects.create(
        name='Test Organization',
        slug='test-org',
    )

@pytest.fixture
def user_profile(user, organization):
    return UserProfile.objects.create(
        user=user,
        organization=organization,
        is_admin=True
    )

@pytest.fixture
def product(user, organization):
    return Product.objects.create(
        name='Test Product',
        sku='TEST-SKU-123',
        price=99.99,
        category='Test Category',
        is_active=True,
        created_by=user,
        organization=organization
    )

@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.mark.django_db
def test_legacy_route_still_works(authenticated_client, product, user_profile, monkeypatch):
    """Test that legacy routes still work."""
    # Ensure the ENABLE_LEGACY_ENDPOINTS environment variable is set to "1"
    monkeypatch.setenv("ENABLE_LEGACY_ENDPOINTS", "1")
    
    # Use the non-versioned API endpoint
    url = f"/api/products/{product.id}/"
    
    # Make the GET request
    response = authenticated_client.get(url)
    
    # Check that the response has the expected status code
    assert response.status_code == status.HTTP_200_OK
    
    # Check that the response contains the product data
    assert response.data['id'] == product.id
    assert response.data['name'] == product.name
    
    # Check that the response includes the X-Legacy-Route header
    assert response.has_header('X-Legacy-Route')
    assert response['X-Legacy-Route'] == 'true'

@pytest.mark.django_db
def test_versioned_route_works(authenticated_client, product, user_profile):
    """Test that versioned routes work."""
    # Use the versioned API endpoint
    url = f"/api/v1/products/{product.id}/"
    
    # Make the GET request
    response = authenticated_client.get(url)
    
    # Check that the response has the expected status code
    assert response.status_code == status.HTTP_200_OK
    
    # Check that the response contains the product data
    assert response.data['id'] == product.id
    assert response.data['name'] == product.name
    
    # Check that the response does NOT include the X-Legacy-Route header
    assert not response.has_header('X-Legacy-Route')

@pytest.mark.django_db
def test_legacy_route_disabled(authenticated_client, product, user_profile, monkeypatch):
    """Test that legacy routes are disabled when the environment variable is set to "0"."""
    # Set the ENABLE_LEGACY_ENDPOINTS environment variable to "0"
    monkeypatch.setenv("ENABLE_LEGACY_ENDPOINTS", "0")
    
    # Use the non-versioned API endpoint
    url = f"/api/products/{product.id}/"
    
    # Make the GET request
    response = authenticated_client.get(url)
    
    # Check that the response has a 404 status code
    assert response.status_code == status.HTTP_404_NOT_FOUND 