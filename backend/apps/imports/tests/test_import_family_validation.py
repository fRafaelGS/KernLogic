import pytest
import pandas as pd
import tempfile
import os
import json
from django.test import TestCase
from apps.imports.tasks import import_csv_task
from apps.imports.models import ImportTask
from apps.imports.constants import IMPORT_RELAX_TEMPLATE
from products.models import (
    Family, 
    Attribute, 
    AttributeGroup, 
    AttributeGroupItem, 
    FamilyAttributeGroup,
    Product,
    AttributeValue
)
from organizations.models import Organization
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile

User = get_user_model()

@pytest.mark.django_db
class TestImportWithFamilyValidation(TestCase):
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
        
        # Set defaults for organization
        from products.models import Locale, SalesChannel
        from prices.models import Currency
        
        self.locale = Locale.objects.create(
            organization=self.organization,
            code='en_US',
            label='English (US)'
        )
        self.organization.default_locale_ref = self.locale.code
        
        self.channel = SalesChannel.objects.create(
            organization=self.organization,
            code='web',
            name='Web Store'
        )
        self.organization.default_channel = self.channel.code
        
        self.currency = Currency.objects.create(
            iso_code='USD',
            name='US Dollar',
            symbol='$'
        )
        self.organization.default_currency = self.currency.iso_code
        self.organization.save()
        
        # Create test families, attribute groups, and attributes
        self.family = Family.objects.create(
            code='electronics',
            label='Electronics',
            organization=self.organization,
            created_by=self.user
        )
        
        # Create attribute groups
        self.attr_group = AttributeGroup.objects.create(
            name='technical_specs',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attribute groups with families
        self.family_attr_group = FamilyAttributeGroup.objects.create(
            family=self.family,
            attribute_group=self.attr_group,
            organization=self.organization
        )
        
        # Create attributes
        self.attr_color = Attribute.objects.create(
            code='color',
            label='Color',
            data_type='text',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr_size = Attribute.objects.create(
            code='size',
            label='Size',
            data_type='text',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr_weight = Attribute.objects.create(
            code='weight',
            label='Weight',
            data_type='number',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attributes with groups
        AttributeGroupItem.objects.create(
            group=self.attr_group,
            attribute=self.attr_color
        )
        
        AttributeGroupItem.objects.create(
            group=self.attr_group,
            attribute=self.attr_size
        )
        
        # weight attribute is not associated with any family/group yet
    
    def _create_csv_file(self, data):
        """Helper to create a CSV file from data"""
        df = pd.DataFrame(data)
        temp_file = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
        df.to_csv(temp_file.name, index=False)
        temp_file.close()
        return temp_file.name
    
    def _create_import_task(self, csv_path, mapping):
        """Helper to create an import task"""
        with open(csv_path, 'rb') as f:
            content = f.read()
        
        import_task = ImportTask.objects.create(
            organization=self.organization,
            status='queued',
            mapping=mapping,
            created_by=self.user
        )
        import_task.csv_file.save('test_import.csv', ContentFile(content))
        return import_task
    
    def test_import_with_valid_family_and_attributes(self):
        """Test importing products with valid family and attributes"""
        # Create CSV data with valid family and attributes
        data = [
            {
                'sku': 'SKU001',
                'name': 'Test Product 1',
                'family': 'electronics',
                'color': 'Red',
                'size': 'Large'
            },
            {
                'sku': 'SKU002',
                'name': 'Test Product 2',
                'family': 'electronics',
                'color': 'Blue',
                'size': 'Medium'
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import was successful
        self.assertEqual(import_task.status, 'success')
        self.assertEqual(import_task.processed, 2)
        
        # Check products were created with correct attributes
        product1 = Product.objects.get(sku='SKU001', organization=self.organization)
        product2 = Product.objects.get(sku='SKU002', organization=self.organization)
        
        self.assertEqual(product1.family, self.family)
        self.assertEqual(product2.family, self.family)
        
        # Check attribute values
        color_value1 = AttributeValue.objects.get(
            product=product1,
            attribute=self.attr_color,
            organization=self.organization
        )
        self.assertEqual(color_value1.value, 'Red')
        
        size_value1 = AttributeValue.objects.get(
            product=product1,
            attribute=self.attr_size,
            organization=self.organization
        )
        self.assertEqual(size_value1.value, 'Large')
        
        color_value2 = AttributeValue.objects.get(
            product=product2,
            attribute=self.attr_color,
            organization=self.organization
        )
        self.assertEqual(color_value2.value, 'Blue')
        
        size_value2 = AttributeValue.objects.get(
            product=product2,
            attribute=self.attr_size,
            organization=self.organization
        )
        self.assertEqual(size_value2.value, 'Medium')
        
        # Cleanup
        os.unlink(csv_path)
    
    def test_import_with_invalid_family(self):
        """Test importing products with invalid family"""
        # Create CSV data with invalid family
        data = [
            {
                'sku': 'SKU003',
                'name': 'Test Product 3',
                'family': 'nonexistent',
                'color': 'Green',
                'size': 'Small'
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import failed (error or partial_success)
        self.assertEqual(import_task.status, 'error')
        self.assertEqual(import_task.processed, 0)
        
        # Check error file contains expected error
        self.assertIsNotNone(import_task.error_file)
        error_content = import_task.error_file.read().decode('utf-8')
        self.assertIn('FAMILY_UNKNOWN', error_content)
        
        # Check no product was created
        self.assertFalse(Product.objects.filter(sku='SKU003', organization=self.organization).exists())
        
        # Cleanup
        os.unlink(csv_path)
    
    def test_import_with_attribute_not_in_family(self):
        """Test importing products with attribute not in family"""
        # Create CSV data with attribute not in family
        data = [
            {
                'sku': 'SKU004',
                'name': 'Test Product 4',
                'family': 'electronics',
                'weight': '2.5'  # weight is not in the electronics family
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import failed (error or partial_success)
        self.assertEqual(import_task.status, 'error')
        self.assertEqual(import_task.processed, 0)
        
        # Check error file contains expected error
        self.assertIsNotNone(import_task.error_file)
        error_content = import_task.error_file.read().decode('utf-8')
        self.assertIn('ATTRIBUTE_NOT_IN_FAMILY', error_content)
        
        # Check no product was created
        self.assertFalse(Product.objects.filter(sku='SKU004', organization=self.organization).exists())
        
        # Cleanup
        os.unlink(csv_path)
    
    @pytest.mark.skipif(not IMPORT_RELAX_TEMPLATE, reason="Test requires IMPORT_RELAX_TEMPLATE=True")
    def test_import_with_auto_attach_attribute(self):
        """Test importing products with auto-attach when IMPORT_RELAX_TEMPLATE=True"""
        # This test should be skipped if IMPORT_RELAX_TEMPLATE is False
        
        # Temporarily set IMPORT_RELAX_TEMPLATE to True for this test
        import apps.imports.constants
        original_value = apps.imports.constants.IMPORT_RELAX_TEMPLATE
        apps.imports.constants.IMPORT_RELAX_TEMPLATE = True
        
        try:
            # Create CSV data with attribute not in family
            data = [
                {
                    'sku': 'SKU005',
                    'name': 'Test Product 5',
                    'family': 'electronics',
                    'weight': '3.5'  # weight is not in the electronics family
                }
            ]
            
            # Create CSV file
            csv_path = self._create_csv_file(data)
            
            # Create mapping
            mapping = {
                'sku': 'sku',
                'name': 'name',
                'family': 'family'
            }
            
            # Create import task
            import_task = self._create_import_task(csv_path, mapping)
            
            # Run import task
            import_csv_task(import_task.id)
            
            # Refresh import task from DB
            import_task.refresh_from_db()
            
            # Check import was successful
            self.assertEqual(import_task.status, 'success')
            self.assertEqual(import_task.processed, 1)
            
            # Check product was created
            product = Product.objects.get(sku='SKU005', organization=self.organization)
            self.assertEqual(product.family, self.family)
            
            # Check attribute value was created
            weight_value = AttributeValue.objects.get(
                product=product,
                attribute=self.attr_weight,
                organization=self.organization
            )
            self.assertEqual(weight_value.value, '3.5')
            
            # Check the weight attribute was added to the family's attribute group
            self.assertTrue(
                AttributeGroupItem.objects.filter(
                    group=self.attr_group,
                    attribute=self.attr_weight
                ).exists()
            )
            
            # Check family version was incremented
            self.family.refresh_from_db()
            self.assertEqual(self.family.version, 2)  # Started at 1, incremented to 2
            
            # Cleanup
            os.unlink(csv_path)
        finally:
            # Restore original value
            apps.imports.constants.IMPORT_RELAX_TEMPLATE = original_value
    
    def test_import_with_json_attributes(self):
        """Test importing products with attributes in JSON format"""
        # Create CSV data with attributes in JSON format
        data = [
            {
                'sku': 'SKU006',
                'name': 'Test Product 6',
                'family': 'electronics',
                'attributes': '{"color":"Black", "size":"XL"}'
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family',
            'attributes': 'attributes'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import was successful
        self.assertEqual(import_task.status, 'success')
        self.assertEqual(import_task.processed, 1)
        
        # Check product was created with correct attributes
        product = Product.objects.get(sku='SKU006', organization=self.organization)
        self.assertEqual(product.family, self.family)
        
        # Check attribute values
        color_value = AttributeValue.objects.get(
            product=product,
            attribute=self.attr_color,
            organization=self.organization
        )
        self.assertEqual(color_value.value, 'Black')
        
        size_value = AttributeValue.objects.get(
            product=product,
            attribute=self.attr_size,
            organization=self.organization
        )
        self.assertEqual(size_value.value, 'XL')
        
        # Cleanup
        os.unlink(csv_path)
    
    def test_import_fails_on_attribute_suffix(self):
        """Test that a row fails completely if an attribute has an incorrect suffix"""
        # Create CSV data with attribute that has a suffix (_hp)
        data = [
            {
                'sku': 'WT-4001',
                'name': 'Wind Turbine 4001',
                'family': 'electronics',
                'horsepower_hp': '500'  # Should be just 'horsepower' in the database
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import failed
        self.assertEqual(import_task.status, 'error')
        self.assertEqual(import_task.processed, 0)
        
        # Check error file contains attribute not found error
        self.assertIsNotNone(import_task.error_file)
        error_content = import_task.error_file.read().decode('utf-8')
        self.assertIn('horsepower_hp', error_content)
        self.assertIn('not found', error_content)
        
        # Check no product was created - entire row should be rolled back
        self.assertFalse(Product.objects.filter(sku='WT-4001', organization=self.organization).exists())
        
        # Cleanup
        os.unlink(csv_path)
    
    def test_import_fails_on_locale_error(self):
        """Test that a row fails completely if there's a locale error"""
        # Create a valid attribute that we'll use
        power_attr = Attribute.objects.create(
            code='power',
            label='Power',
            data_type='number',
            organization=self.organization
        )
        
        # Add the attribute to the family's attribute group
        AttributeGroupItem.objects.create(
            group=self.attr_group,
            attribute=power_attr
        )
        
        # Create CSV data with an invalid locale
        data = [
            {
                'sku': 'WT-4002',
                'name': 'Wind Turbine 4002',
                'family': 'electronics',
                'power-invalid_locale': '800'  # Invalid locale
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family': 'family'
        }
        
        # Create import task
        import_task = self._create_import_task(csv_path, mapping)
        
        # Run import task
        import_csv_task(import_task.id)
        
        # Refresh import task from DB
        import_task.refresh_from_db()
        
        # Check import failed
        self.assertEqual(import_task.status, 'error')
        self.assertEqual(import_task.processed, 0)
        
        # Check error file contains locale not found error
        self.assertIsNotNone(import_task.error_file)
        error_content = import_task.error_file.read().decode('utf-8')
        self.assertIn('Locale', error_content)
        self.assertIn('not found', error_content)
        
        # Check no product was created - entire row should be rolled back
        self.assertFalse(Product.objects.filter(sku='WT-4002', organization=self.organization).exists())
        
        # Cleanup
        os.unlink(csv_path) 