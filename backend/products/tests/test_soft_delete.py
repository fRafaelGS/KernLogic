import pytest
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
def test_soft_delete_product(authenticated_client, product, user, user_profile):
    """Test that DELETE request sets is_archived=True but doesn't delete the product."""
    url = reverse('product-detail', kwargs={'pk': product.id})
    
    # Make the DELETE request
    response = authenticated_client.delete(url)
    
    # Check that the response has the expected status code
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Refresh the product from the database
    product.refresh_from_db()
    
    # Check that the product still exists
    assert Product.objects.filter(id=product.id).exists()
    
    # Check that the product is now archived
    assert product.is_archived is True
    
    # Check that the product doesn't appear in the list endpoint anymore
    list_url = reverse('product-list')
    response = authenticated_client.get(list_url)
    assert response.status_code == status.HTTP_200_OK
    
    # Validate that the product is not in the results
    product_ids = [p['id'] for p in response.data['results']]
    assert product.id not in product_ids
    
    # But if we include show_archived=true, it should be in the results
    response = authenticated_client.get(f"{list_url}?show_archived=true")
    product_ids = [p['id'] for p in response.data['results']]
    assert product.id in product_ids

@pytest.mark.django_db
def test_hard_delete_product_for_staff(authenticated_client, product, user, user_profile):
    """Test that DELETE with ?hard=true actually deletes the product for staff users."""
    # Make the user a staff user
    user.is_staff = True
    user.save()
    
    url = reverse('product-detail', kwargs={'pk': product.id})
    
    # Make the DELETE request with hard=true
    response = authenticated_client.delete(f"{url}?hard=true")
    
    # Check that the response has the expected status code
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Check that the product no longer exists
    assert not Product.objects.filter(id=product.id).exists()

@pytest.mark.django_db
def test_hard_delete_denied_for_non_staff(authenticated_client, product, user_profile):
    """Test that non-staff users cannot perform hard deletes."""
    url = reverse('product-detail', kwargs={'pk': product.id})
    
    # Make the DELETE request with hard=true
    response = authenticated_client.delete(f"{url}?hard=true")
    
    # Check that the response has the expected status code
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Refresh the product from the database
    product.refresh_from_db()
    
    # Check that the product still exists (was soft-deleted instead)
    assert Product.objects.filter(id=product.id).exists()
    assert product.is_archived is True 