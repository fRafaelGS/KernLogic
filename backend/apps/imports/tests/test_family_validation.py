import pytest
from django.test import TestCase
from apps.imports.services.family_validation import (
    build_family_attribute_map,
    validate_family,
    validate_attribute_in_family,
    auto_attach_attribute_to_family,
    ERROR_FAMILY_UNKNOWN,
    ERROR_NOT_IN_FAMILY
)
from products.models import (
    Family, 
    Attribute, 
    AttributeGroup, 
    AttributeGroupItem, 
    FamilyAttributeGroup
)
from organizations.models import Organization
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestFamilyValidation(TestCase):
    def setUp(self):
        # Create test organization and user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpassword'
        )
        self.organization = Organization.objects.create(
            name='Test Organization',
            slug='test-org'
        )
        
        # Create test families, attribute groups, and attributes
        self.family1 = Family.objects.create(
            code='family1',
            label='Family 1',
            organization=self.organization,
            created_by=self.user
        )
        
        self.family2 = Family.objects.create(
            code='family2',
            label='Family 2',
            organization=self.organization,
            created_by=self.user
        )
        
        # Create attribute groups
        self.attr_group1 = AttributeGroup.objects.create(
            name='group1',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr_group2 = AttributeGroup.objects.create(
            name='group2',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attribute groups with families
        self.family_attr_group1 = FamilyAttributeGroup.objects.create(
            family=self.family1,
            attribute_group=self.attr_group1,
            organization=self.organization
        )
        
        self.family_attr_group2 = FamilyAttributeGroup.objects.create(
            family=self.family2,
            attribute_group=self.attr_group2,
            organization=self.organization
        )
        
        # Create attributes
        self.attr1 = Attribute.objects.create(
            code='color',
            label='Color',
            data_type='text',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr2 = Attribute.objects.create(
            code='size',
            label='Size',
            data_type='text',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr3 = Attribute.objects.create(
            code='weight',
            label='Weight',
            data_type='number',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attributes with groups
        AttributeGroupItem.objects.create(
            group=self.attr_group1,
            attribute=self.attr1
        )
        
        AttributeGroupItem.objects.create(
            group=self.attr_group1,
            attribute=self.attr2
        )
        
        AttributeGroupItem.objects.create(
            group=self.attr_group2,
            attribute=self.attr3
        )
    
    def test_build_family_attribute_map(self):
        # Test building the family attribute map
        family_map = build_family_attribute_map(self.organization.id)
        
        # Check that both families are in the map
        self.assertIn('family1', family_map)
        self.assertIn('family2', family_map)
        
        # Check that the attributes are correctly associated
        self.assertIn('color', family_map['family1'])
        self.assertIn('size', family_map['family1'])
        self.assertIn('weight', family_map['family2'])
        
        # Check that the attributes are not cross-associated
        self.assertNotIn('weight', family_map['family1'])
        self.assertNotIn('color', family_map['family2'])
        self.assertNotIn('size', family_map['family2'])
    
    def test_validate_family(self):
        # Build the map first
        family_map = build_family_attribute_map(self.organization.id)
        
        # Test valid family
        is_valid, error = validate_family('family1', family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        
        # Test invalid family
        is_valid, error = validate_family('nonexistent', family_map)
        self.assertFalse(is_valid)
        self.assertEqual(error, ERROR_FAMILY_UNKNOWN)
        
        # Test empty family code (should be valid, no validation needed)
        is_valid, error = validate_family('', family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        
        is_valid, error = validate_family(None, family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_attribute_in_family(self):
        # Build the map first
        family_map = build_family_attribute_map(self.organization.id)
        
        # Test valid attribute in family
        is_valid, error = validate_attribute_in_family('color', 'family1', family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        
        # Test invalid attribute in family
        is_valid, error = validate_attribute_in_family('weight', 'family1', family_map)
        self.assertFalse(is_valid)
        self.assertEqual(error, ERROR_NOT_IN_FAMILY)
        
        # Test with relax_template=True (should be valid regardless)
        is_valid, error = validate_attribute_in_family('weight', 'family1', family_map, relax_template=True)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        
        # Test with missing family or attribute (should be valid, not enough info)
        is_valid, error = validate_attribute_in_family('color', '', family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
        
        is_valid, error = validate_attribute_in_family('', 'family1', family_map)
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_auto_attach_attribute_to_family(self):
        # Test auto-attaching an attribute to a family
        result = auto_attach_attribute_to_family('weight', 'family1', self.organization.id, self.user.id)
        self.assertTrue(result)
        
        # Verify the attribute is now associated with the family
        family_map = build_family_attribute_map(self.organization.id)
        self.assertIn('weight', family_map['family1'])
        
        # Check the family version was incremented
        family1_refreshed = Family.objects.get(code='family1')
        self.assertEqual(family1_refreshed.version, 2)  # Started at 1, incremented to 2
        
        # Test attaching an attribute that doesn't exist
        result = auto_attach_attribute_to_family('nonexistent', 'family1', self.organization.id, self.user.id)
        self.assertFalse(result)
        
        # Test attaching to a family that doesn't exist
        result = auto_attach_attribute_to_family('color', 'nonexistent', self.organization.id, self.user.id)
        self.assertFalse(result)
        
        # Test attaching an attribute that's already attached (should succeed without changes)
        result = auto_attach_attribute_to_family('color', 'family1', self.organization.id, self.user.id)
        self.assertTrue(result)
        family1_refreshed = Family.objects.get(code='family1')
        self.assertEqual(family1_refreshed.version, 2)  # Should not increment again 