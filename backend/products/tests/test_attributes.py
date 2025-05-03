from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Attribute, AttributeValue, Product
from organizations.models import Organization
from django.contrib.auth import get_user_model
from teams.models import Membership, Role
import json

User = get_user_model()

class AttributeTests(TestCase):
    def setUp(self):
        # Create test organizations
        self.org1 = Organization.objects.create(name="Organization 1")
        self.org2 = Organization.objects.create(name="Organization 2")

        # Create role for memberships
        self.role = Role.objects.create(name="Admin")
        
        # Create users and add to organizations via memberships
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='password',
        )
        self.staff_user.is_staff = True
        self.staff_user.save()
        
        # Create membership for staff user in org1
        Membership.objects.create(
            user=self.staff_user,
            organization=self.org1,
            role=self.role,
            status='active'
        )
        
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='password'
        )
        
        # Create membership for regular user in org1
        Membership.objects.create(
            user=self.regular_user,
            organization=self.org1,
            role=self.role,
            status='active'
        )
        
        self.other_org_user = User.objects.create_user(
            email='other@example.com',
            password='password'
        )
        
        # Create membership for other user in org2
        Membership.objects.create(
            user=self.other_org_user,
            organization=self.org2,
            role=self.role,
            status='active'
        )
        
        # Create test product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TEST001",
            price=10.00,
            organization=self.org1,
            created_by=self.staff_user
        )
        
        # Create test attributes
        self.attr1 = Attribute.objects.create(
            code="color",
            label="Color",
            data_type="text",
            organization=self.org1,
            created_by=self.staff_user
        )
        
        self.attr2 = Attribute.objects.create(
            code="weight",
            label="Weight",
            data_type="number",
            organization=self.org1,
            created_by=self.staff_user
        )
        
        # Setup API client
        self.client = APIClient()
    
    def test_list_attributes(self):
        """Test that attributes are properly filtered by organization"""
        # Login as org1 user
        self.client.force_authenticate(user=self.regular_user)
        
        # Get attributes
        url = reverse('attribute-list')
        response = self.client.get(url)
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Should see 2 attributes
        
        # Login as org2 user
        self.client.force_authenticate(user=self.other_org_user)
        
        # Get attributes
        response = self.client.get(url)
        
        # Verify response - should see no attributes
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
    
    def test_create_attribute(self):
        """Test creating attributes with proper permissions"""
        # Login as staff user
        self.client.force_authenticate(user=self.staff_user)
        
        # Create new attribute
        url = reverse('attribute-list')
        data = {
            'code': 'size',
            'label': 'Size',
            'data_type': 'text'
        }
        response = self.client.post(url, data)
        
        # Verify response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Attribute.objects.count(), 3)
        
        # Verify organization was set
        new_attr = Attribute.objects.get(code='size')
        self.assertEqual(new_attr.organization, self.org1)
        
        # Test as regular user (should fail)
        self.client.force_authenticate(user=self.regular_user)
        data = {
            'code': 'material',
            'label': 'Material',
            'data_type': 'text'
        }
        response = self.client.post(url, data)
        
        # Verify permission denied
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_duplicate_code_constraint(self):
        """Test that duplicate code within same org raises error"""
        self.client.force_authenticate(user=self.staff_user)
        
        # Try to create attribute with same code in same org
        url = reverse('attribute-list')
        data = {
            'code': 'color',  # Already exists in org1
            'label': 'Duplicate Color',
            'data_type': 'text'
        }
        response = self.client.post(url, data)
        
        # Verify error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test that same code in different org works
        self.client.force_authenticate(user=self.other_org_user)
        data = {
            'code': 'color',  # Already exists in org1 but not org2
            'label': 'Color',
            'data_type': 'text'
        }
        response = self.client.post(url, data)
        
        # Verify success
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_attribute_values(self):
        """Test creating attribute values for products"""
        self.client.force_authenticate(user=self.regular_user)
        
        # Create attribute value
        url = reverse('product-attributes-list', kwargs={'product_pk': self.product.pk})
        data = {
            'attribute': self.attr1.pk,
            'value': json.dumps("Red")
        }
        response = self.client.post(url, data)
        
        # Verify created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that we can retrieve the value
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Verify organization isolation
        self.client.force_authenticate(user=self.other_org_user)
        url = reverse('product-attributes-list', kwargs={'product_pk': self.product.pk})
        response = self.client.get(url)
        
        # Should get 404 since product doesn't exist in their org
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 

    def test_attribute_isolation(self):
        """Test that attributes from one organization cannot be used by another"""
        # Create a product in org2
        other_org_product = Product.objects.create(
            name="Other Org Product",
            sku="OTHER001",
            price=20.00,
            organization=self.org2,
            created_by=self.other_org_user
        )
        
        # Login as org1 user
        self.client.force_authenticate(user=self.regular_user)
        
        # Try to add an attribute value to a product in org2 using an attribute from org1
        url = reverse('product-attributes-list', kwargs={'product_pk': other_org_product.pk})
        data = {
            'attribute': self.attr1.pk,  # This is from org1
            'value': json.dumps("Blue")
        }
        response = self.client.post(url, data)
        
        # Should be filtered out by OrganizationQuerySetMixin
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Now try the reverse - org2 user trying to use an org1 product
        self.client.force_authenticate(user=self.other_org_user)
        url = reverse('product-attributes-list', kwargs={'product_pk': self.product.pk})
        response = self.client.post(url, data)
        
        # Should also be 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 