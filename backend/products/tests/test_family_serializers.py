from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from unittest import mock
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from products.models import (
    Family, Product, Attribute, AttributeValue, 
    AttributeGroup, AttributeGroupItem, FamilyAttributeGroup
)
from products.serializers import FamilySerializer, ProductSerializer
from organizations.models import Organization
from teams.models import Membership, Role

User = get_user_model()

class FamilySerializerTests(TestCase):
    def setUp(self):
        # Create mocks
        self.user = mock.MagicMock()
        self.org = mock.MagicMock()
        self.user.organization = self.org
        
        # Mock get_user_organization function
        self.get_user_organization_patcher = mock.patch('products.serializers.get_user_organization')
        self.mock_get_user_organization = self.get_user_organization_patcher.start()
        self.mock_get_user_organization.return_value = self.org
        
        # Create a request factory
        self.factory = APIRequestFactory()
        
        # Set up mock models
        self.family = mock.MagicMock(spec=Family)
        self.family.id = 1
        self.family.code = "test-family"
        self.family.label = "Test Family"
        self.family.description = "A test family"
        self.family.organization = self.org
        
        self.attribute_group = mock.MagicMock(spec=AttributeGroup)
        self.attribute_group.id = 1
        self.attribute_group.name = "Test Group"
        
        self.attribute = mock.MagicMock(spec=Attribute)
        self.attribute.id = 1
        self.attribute.code = "test-attr"
        self.attribute.label = "Test Attribute"
        
        self.product = mock.MagicMock(spec=Product)
        self.product.id = 1
        self.product.name = "Test Product"
        self.product.sku = "TEST001"
        self.product.organization = self.org
        
        # Setup model querysets
        self.family_queryset = mock.MagicMock(spec=QuerySet)
        self.family_filter_patcher = mock.patch.object(Family.objects, 'filter')
        self.mock_family_filter = self.family_filter_patcher.start()
        self.mock_family_filter.return_value.exists.return_value = True  # Default to existing for duplicate code test
        
        self.familyattrgroup_queryset = mock.MagicMock(spec=QuerySet)
        self.familyattrgroup_filter_patcher = mock.patch.object(FamilyAttributeGroup.objects, 'filter')
        self.mock_familyattrgroup_filter = self.familyattrgroup_filter_patcher.start()
        self.mock_familyattrgroup_filter.return_value.select_related.return_value = [
            mock.MagicMock(attribute_group=self.attribute_group)
        ]
        
        self.attrgroupitem_queryset = mock.MagicMock(spec=QuerySet)
        self.attrgroupitem_filter_patcher = mock.patch.object(AttributeGroupItem.objects, 'filter')
        self.mock_attrgroupitem_filter = self.attrgroupitem_filter_patcher.start()
        self.mock_attrgroupitem_filter.return_value.values_list.return_value = [self.attribute.id]
        
        self.attribute_queryset = mock.MagicMock(spec=QuerySet)
        self.attribute_filter_patcher = mock.patch.object(Attribute.objects, 'filter')
        self.mock_attribute_filter = self.attribute_filter_patcher.start()
        self.mock_attribute_filter.return_value = [self.attribute]
        
        # Setup attribute_values for product
        self.attribute_values = mock.MagicMock()
        self.attribute_values.values_list.return_value = []  # Default to empty, no attributes
        self.product.attribute_values = self.attribute_values
    
    def tearDown(self):
        # Stop all patchers
        self.get_user_organization_patcher.stop()
        self.family_filter_patcher.stop()
        self.familyattrgroup_filter_patcher.stop()
        self.attrgroupitem_filter_patcher.stop()
        self.attribute_filter_patcher.stop()
    
    def test_duplicate_family_code_validation(self):
        """Test that creating a family with a duplicate code fails validation"""
        request = self.factory.post('/api/families/')
        request.user = self.user
        
        # Data with the same code as existing family
        data = {
            'code': 'test-family',  # This code already exists
            'label': 'Another Family',
            'description': 'Another test family'
        }
        
        # Setup mock to return True for exists() check
        self.mock_family_filter.return_value.exists.return_value = True
        
        serializer = FamilySerializer(data=data, context={'request': request})
        self.assertFalse(serializer.is_valid())
        self.assertIn('code', serializer.errors)
    
    def test_family_required_attributes_validation(self):
        """Test that assigning a family with required attributes to a product without those attributes fails validation"""
        request = self.factory.patch(f'/api/products/{self.product.id}/')
        request.user = self.user
        
        # Setup required attribute groups
        self.mock_familyattrgroup_filter.return_value.select_related.return_value = [
            mock.MagicMock(attribute_group=self.attribute_group)
        ]
        
        # Setup attributes in group
        self.mock_attrgroupitem_filter.return_value.values_list.return_value = [self.attribute.id]
        
        # Setup product with NO attribute values (missing required)
        self.product.attribute_values.values_list.return_value = []
        
        # Attempt to update product with family that has required attributes
        data = {
            'family': 1  # Family ID
        }
        
        # Mock Family.objects.get to return our family mock
        with mock.patch('products.serializers.Family.objects.get', return_value=self.family):
            serializer = ProductSerializer(
                instance=self.product, 
                data=data, 
                context={'request': request},
                partial=True
            )
            
            # Should fail validation because the product doesn't have the required attribute
            self.assertFalse(serializer.is_valid())
            self.assertIn('family', serializer.errors)
            
            # Now simulate adding the required attribute value to the product
            self.product.attribute_values.values_list.return_value = [self.attribute.id]
            
            # Try validation again - should pass now
            serializer = ProductSerializer(
                instance=self.product, 
                data=data, 
                context={'request': request},
                partial=True
            )
            
            self.assertTrue(serializer.is_valid())
    
    def test_family_update_with_attribute_groups(self):
        """Test updating a family with attribute groups"""
        request = self.factory.put(f'/api/families/{self.family.id}/')
        force_authenticate(request, user=self.user)
        
        # Create another attribute group
        new_group = AttributeGroup.objects.create(
            name="New Group",
            organization=self.org,
            created_by=self.user
        )
        
        # Data with updated attribute groups
        data = {
            'code': 'test-family',
            'label': 'Updated Family',
            'description': 'Updated description',
            'attribute_groups': [
                {
                    'attribute_group': new_group.id,
                    'required': True,
                    'order': 0
                }
            ]
        }
        
        serializer = FamilySerializer(
            instance=self.family,
            data=data,
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid())
        updated_family = serializer.save()
        
        # Check that old attribute groups were removed
        self.assertEqual(updated_family.attribute_groups.count(), 1)
        
        # Check that new attribute group was added
        family_group = updated_family.attribute_groups.first()
        self.assertEqual(family_group.attribute_group.id, new_group.id)
        self.assertTrue(family_group.required) 