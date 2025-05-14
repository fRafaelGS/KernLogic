from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from products.models import (
    Family, Product, AttributeGroup, FamilyAttributeGroup, AttributeValue, Attribute
)
from organizations.models import Organization
from teams.models import Membership, Role

User = get_user_model()

class FamilyViewsTests(TestCase):
    def setUp(self):
        # Create test organization
        self.org = Organization.objects.create(name="Test Organization")
        
        # Create role for membership
        self.role = Role.objects.create(name="Admin")
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='adminpassword',
            is_staff=True
        )
        
        # Create membership for admin user
        Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role=self.role,
            status='active'
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='userpassword'
        )
        
        # Create membership for regular user
        Membership.objects.create(
            user=self.regular_user,
            organization=self.org,
            role=self.role,
            status='active'
        )
        
        # Create attribute groups
        self.attribute_group1 = AttributeGroup.objects.create(
            name="Technical Specs",
            organization=self.org,
            created_by=self.admin_user
        )
        
        self.attribute_group2 = AttributeGroup.objects.create(
            name="Marketing Info",
            organization=self.org,
            created_by=self.admin_user
        )
        
        # Create attributes for testing
        self.attribute = Attribute.objects.create(
            code="weight",
            label="Weight",
            data_type="number",
            organization=self.org,
            created_by=self.admin_user
        )
        
        # Create test family
        self.family = Family.objects.create(
            code="test-family",
            label="Test Family",
            description="A test family for testing",
            organization=self.org,
            created_by=self.admin_user
        )
        
        # Create family attribute group association
        self.family_group = FamilyAttributeGroup.objects.create(
            family=self.family,
            attribute_group=self.attribute_group1,
            required=True,
            order=0,
            organization=self.org
        )
        
        # Create test product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST001",
            family=self.family,
            organization=self.org,
            created_by=self.admin_user
        )
        
        # Set up API client
        self.client = APIClient()
    
    def test_list_families(self):
        """Test listing families"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Get list of families
        url = reverse('family-list')
        response = self.client.get(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], self.family.code)
    
    def test_create_family(self):
        """Test creating a new family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Data for new family
        data = {
            'code': 'new-family',
            'label': 'New Family',
            'description': 'A new test family'
        }
        
        # Create new family
        url = reverse('family-list')
        response = self.client.post(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'new-family')
        
        # Check that family was created in database
        self.assertTrue(Family.objects.filter(code='new-family').exists())
    
    def test_retrieve_family(self):
        """Test retrieving a family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Get family details
        url = reverse('family-detail', args=[self.family.id])
        response = self.client.get(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], self.family.code)
        self.assertEqual(response.data['label'], self.family.label)
    
    def test_update_family(self):
        """Test updating a family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Data for updating family
        data = {
            'code': self.family.code,  # Keep same code
            'label': 'Updated Family',
            'description': 'Updated description'
        }
        
        # Update family
        url = reverse('family-detail', args=[self.family.id])
        response = self.client.put(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['label'], 'Updated Family')
        
        # Check that family was updated in database
        self.family.refresh_from_db()
        self.assertEqual(self.family.label, 'Updated Family')
    
    def test_delete_family(self):
        """Test deleting a family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Create a family to delete
        family_to_delete = Family.objects.create(
            code="delete-me",
            label="Delete Me",
            description="A family to delete",
            organization=self.org,
            created_by=self.admin_user
        )
        
        # Delete family
        url = reverse('family-detail', args=[family_to_delete.id])
        response = self.client.delete(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that family was deleted from database
        self.assertFalse(Family.objects.filter(id=family_to_delete.id).exists())
    
    def test_manage_attribute_groups(self):
        """Test adding attribute groups to a family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Data for adding attribute group
        data = {
            'attribute_group': self.attribute_group2.id,
            'required': True,
            'order': 1
        }
        
        # Add attribute group
        url = reverse('family-manage-attribute-groups', args=[self.family.id])
        response = self.client.post(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['attribute_group'], self.attribute_group2.id)
        self.assertTrue(response.data['required'])
        
        # Check that attribute group was added to family
        self.assertTrue(
            FamilyAttributeGroup.objects.filter(
                family=self.family, 
                attribute_group=self.attribute_group2
            ).exists()
        )
    
    def test_remove_attribute_group(self):
        """Test removing attribute groups from a family"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Remove attribute group
        url = reverse('family-remove-attribute-group', args=[self.family.id, self.attribute_group1.id])
        response = self.client.delete(url)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that attribute group was removed from family
        self.assertFalse(
            FamilyAttributeGroup.objects.filter(
                family=self.family, 
                attribute_group=self.attribute_group1
            ).exists()
        )
    
    def test_override_attribute_group(self):
        """Test overriding attribute groups for a product"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Add attribute value for testing
        AttributeValue.objects.create(
            product=self.product,
            attribute=self.attribute,
            value=5.5,
            organization=self.org
        )
        
        # Data for overriding attribute group
        data = {
            'attribute_group': self.attribute_group1.id,
            'removed': True
        }
        
        # Override attribute group
        url = reverse('product-override-group', args=[self.product.id])
        response = self.client.post(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.attribute_group1.id, response.data['hidden_attribute_groups'])
        
        # Now test showing the group again
        data['removed'] = False
        response = self.client.post(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.attribute_group1.id, response.data['hidden_attribute_groups'])
    
    def test_validation_for_duplicate_family_code(self):
        """Test validation for duplicate family code"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Data with duplicate code
        data = {
            'code': self.family.code,  # Already exists
            'label': 'Duplicate Family',
            'description': 'A family with duplicate code'
        }
        
        # Try to create family with duplicate code
        url = reverse('family-list')
        response = self.client.post(url, data)
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('code', response.data) 