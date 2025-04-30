import pytest
import uuid
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
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.mark.django_db
def test_idempotent_post_no_duplicates(authenticated_client, user, organization, user_profile):
    """Test that using the same idempotency key for creating a product doesn't create duplicates."""
    url = reverse('product-list')
    
    # Define product data
    product_data = {
        'name': 'Idempotent Product',
        'sku': 'IDEMPOTENT-123',
        'price': 99.99,
        'category': 'Test Category',
        'is_active': True,
    }
    
    # Generate a unique idempotency key
    idempotency_key = str(uuid.uuid4())
    
    # Make the first POST request with the idempotency key
    authenticated_client.credentials(HTTP_IDEMPOTENCY_KEY=idempotency_key)
    response1 = authenticated_client.post(url, product_data, format='json')
    
    # Check that the response has the expected status code
    assert response1.status_code == status.HTTP_201_CREATED
    
    # Save the product ID from the first response
    product_id = response1.data['id']
    
    # Make a second POST request with the same idempotency key and data
    response2 = authenticated_client.post(url, product_data, format='json')
    
    # Check that the response has the same status code
    assert response2.status_code == status.HTTP_201_CREATED
    
    # Verify that the second response has the same product ID as the first response
    assert response2.data['id'] == product_id
    
    # Verify that only one product was created
    assert Product.objects.filter(sku='IDEMPOTENT-123').count() == 1
    
    # Check that the second response includes the idempotency-from-cache header
    assert response2.has_header('X-Idempotency-From-Cache')
    assert response2['X-Idempotency-From-Cache'] == 'true'

@pytest.mark.django_db
def test_different_idempotency_keys_create_different_products(authenticated_client, user, organization, user_profile):
    """Test that using different idempotency keys creates separate products."""
    url = reverse('product-list')
    
    # Define product data (identical for both requests)
    product_data = {
        'name': 'Idempotent Product',
        'sku': 'IDEMPOTENT-456',  # Needs to be different from the first test
        'price': 99.99,
        'category': 'Test Category',
        'is_active': True,
    }
    
    # Make the first POST request with one idempotency key
    key1 = str(uuid.uuid4())
    authenticated_client.credentials(HTTP_IDEMPOTENCY_KEY=key1)
    response1 = authenticated_client.post(url, product_data, format='json')
    
    # Check that the response has the expected status code
    assert response1.status_code == status.HTTP_201_CREATED
    
    # Get the first product's ID
    product1_id = response1.data['id']
    
    # Define slightly different data for the second product
    product_data2 = product_data.copy()
    product_data2['sku'] = 'IDEMPOTENT-789'  # Different SKU
    
    # Make a second POST request with a different idempotency key
    key2 = str(uuid.uuid4())
    authenticated_client.credentials(HTTP_IDEMPOTENCY_KEY=key2)
    response2 = authenticated_client.post(url, product_data2, format='json')
    
    # Check that the response has the expected status code
    assert response2.status_code == status.HTTP_201_CREATED
    
    # Get the second product's ID
    product2_id = response2.data['id']
    
    # Verify that the two products have different IDs
    assert product1_id != product2_id
    
    # Verify that both products were created
    assert Product.objects.count() == 2
    
    # Verify that there's one product with each SKU
    assert Product.objects.filter(sku='IDEMPOTENT-456').count() == 1
    assert Product.objects.filter(sku='IDEMPOTENT-789').count() == 1 