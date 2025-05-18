import pytest
import pandas as pd
import tempfile
import os
from django.test import TestCase
from apps.imports.tasks import import_csv_task
from apps.imports.models import ImportTask
from products.models import (
    Family, 
    Attribute, 
    AttributeGroup, 
    AttributeGroupItem, 
    FamilyAttributeGroup,
    Product,
    AttributeValue,
    Locale,
    SalesChannel
)
from organizations.models import Organization
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from prices.models import Currency

User = get_user_model()

@pytest.mark.django_db
class TestFamilyCodeImport(TestCase):
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
        
        # Create test family
        self.family = Family.objects.create(
            code='offshore_turbine',
            label='Offshore Turbine',
            organization=self.organization,
            created_by=self.user
        )
        
        # Create attribute group
        self.attr_group = AttributeGroup.objects.create(
            name='technical_specs',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attribute group with family
        self.family_attr_group = FamilyAttributeGroup.objects.create(
            family=self.family,
            attribute_group=self.attr_group,
            organization=self.organization
        )
        
        # Create attributes
        self.attr_weight = Attribute.objects.create(
            code='weight',
            label='Weight',
            data_type='number',
            organization=self.organization,
            created_by=self.user
        )
        
        self.attr_bweight = Attribute.objects.create(
            code='bweight',
            label='Bruto Weight',
            data_type='number',
            organization=self.organization,
            created_by=self.user
        )
        
        # Associate attributes with group
        AttributeGroupItem.objects.create(
            group=self.attr_group,
            attribute=self.attr_weight
        )
        
        AttributeGroupItem.objects.create(
            group=self.attr_group,
            attribute=self.attr_bweight
        )
    
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
            created_by=self.user,
            duplicate_strategy='overwrite'
        )
        import_task.csv_file.save('test_import.csv', ContentFile(content))
        return import_task
    
    def test_import_with_family_code(self):
        """Test that products are imported with correct family_code and attributes"""
        # Create CSV data with family_code and attributes
        data = [
            {
                'sku': 'WT-5001',
                'name': 'OceanGale 9.0 XL',
                'family_code': 'offshore_turbine',
                'description': 'High-capacity 9 MW offshore turbine for deep-sea farms.',
                'gtin': '08765432100226',
                'brand': 'VenturaWind',
                'category': 'Energy > Wind Turbines > Offshore',
                'tags': '9MW,deep-sea',
                'bweight': '260000',
                'weight': '253000'
            }
        ]
        
        # Create CSV file
        csv_path = self._create_csv_file(data)
        
        # Create mapping
        mapping = {
            'sku': 'sku',
            'name': 'name',
            'family_code': 'family_code',
            'description': 'description',
            'gtin': 'gtin',
            'brand': 'brand',
            'category': 'category',
            'tags': 'tags'
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
        
        # Check product was created with correct family
        product = Product.objects.get(sku='WT-5001', organization=self.organization)
        self.assertIsNotNone(product.family)
        self.assertEqual(product.family.code, 'offshore_turbine')
        
        # Check attribute values were created
        weight_value = AttributeValue.objects.filter(
            product=product,
            attribute=self.attr_weight,
            organization=self.organization
        ).first()
        self.assertIsNotNone(weight_value)
        self.assertEqual(weight_value.value, '253000')
        
        bweight_value = AttributeValue.objects.filter(
            product=product,
            attribute=self.attr_bweight,
            organization=self.organization
        ).first()
        self.assertIsNotNone(bweight_value)
        self.assertEqual(bweight_value.value, '260000')
        
        # Cleanup
        os.unlink(csv_path) 