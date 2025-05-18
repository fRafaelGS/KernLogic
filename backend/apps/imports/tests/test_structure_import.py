from django.test import TestCase, override_settings
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import json
import os
import tempfile
import csv
import io
from ..models import ImportTask
from products.models import AttributeGroup, Attribute, Family
from organizations.models import Organization

User = get_user_model()

def create_csv_file(rows, filename='test.csv'):
    """Helper to create a CSV file for testing"""
    csv_file = io.StringIO()
    writer = csv.writer(csv_file)
    for row in rows:
        writer.writerow(row)
    csv_file.seek(0)
    return SimpleUploadedFile(filename, csv_file.read().encode('utf-8'), content_type='text/csv')

@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class StructureImportTestCase(TestCase):
    """Test case for the structure import endpoints and functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create a test user
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password')
        
        # Create an organization
        self.organization = Organization.objects.create(name='Test Organization')
        self.organization.members.add(self.user)
        
        # Set up the API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # URLs for the import endpoints
        self.attr_groups_url = reverse('attribute-groups-import-list')
        self.attributes_url = reverse('attributes-import-list')
        self.families_url = reverse('families-import-list')
        
        # URLs for the schema endpoints
        self.field_schema_url = reverse('imports-field-schema')
        self.attr_groups_schema_url = reverse('attribute-groups-schema')
        self.attributes_schema_url = reverse('attributes-schema')
        self.families_schema_url = reverse('families-schema')
    
    def test_field_schema_v2(self):
        """Test that the field schema v2 endpoint returns the correct schema"""
        response = self.client.get(f"{self.field_schema_url}?v=2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('family', [field['id'] for field in response.data])
        self.assertNotIn('attribute_group', [field['id'] for field in response.data])
        self.assertNotIn('attributes', [field['id'] for field in response.data])
    
    def test_attribute_group_schema(self):
        """Test that the attribute group schema endpoint returns the correct schema"""
        response = self.client.get(self.attr_groups_schema_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('code', [field['id'] for field in response.data])
        self.assertIn('label_en', [field['id'] for field in response.data])
        self.assertIn('sort_order', [field['id'] for field in response.data])
    
    def test_attribute_schema(self):
        """Test that the attribute schema endpoint returns the correct schema"""
        response = self.client.get(self.attributes_schema_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('code', [field['id'] for field in response.data])
        self.assertIn('type', [field['id'] for field in response.data])
        self.assertIn('group_code', [field['id'] for field in response.data])
    
    def test_family_schema(self):
        """Test that the family schema endpoint returns the correct schema"""
        response = self.client.get(self.families_schema_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('code', [field['id'] for field in response.data])
        self.assertIn('label_en', [field['id'] for field in response.data])
        self.assertIn('attribute_codes', [field['id'] for field in response.data])
    
    def test_attribute_group_import(self):
        """Test importing attribute groups"""
        # Create CSV file for attribute groups
        csv_data = [
            ['Group Code', 'Label', 'Order'],
            ['technical', 'Technical Specs', '10'],
            ['physical', 'Physical Attributes', '20']
        ]
        csv_file = create_csv_file(csv_data, 'attribute_groups.csv')
        
        # Create a mapping
        mapping = {
            'Group Code': 'code',
            'Label': 'label_en',
            'Order': 'sort_order'
        }
        
        # Make the API call
        data = {
            'csv_file': csv_file,
            'mapping': json.dumps(mapping),
            'duplicate_strategy': 'overwrite'
        }
        response = self.client.post(self.attr_groups_url, data, format='multipart')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the import task was created
        task_id = response.data['id']
        task = ImportTask.objects.get(id=task_id)
        self.assertEqual(task.status, 'queued')  # Task is initially queued
        
        # For full end-to-end testing, we'd need to run the Celery task synchronously,
        # but that's complex and may involve database rollbacks. For now, we'll just
        # verify the task was created with the right parameters.
        self.assertEqual(task.organization, self.organization)
        self.assertEqual(task.created_by, self.user)
        self.assertEqual(json.loads(task.mapping), mapping)
    
    def test_attribute_group_import_invalid_file(self):
        """Test error handling for invalid file uploads"""
        # No file
        response = self.client.post(self.attr_groups_url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Invalid file type
        text_file = SimpleUploadedFile("test.txt", b"this is not a CSV", content_type='text/plain')
        data = {
            'csv_file': text_file,
            'mapping': json.dumps({}),
            'duplicate_strategy': 'skip'
        }
        response = self.client.post(self.attr_groups_url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_attribute_import(self):
        """Test importing attributes"""
        # First create an attribute group
        group = AttributeGroup.objects.create(
            name='technical',
            organization=self.organization,
            created_by=self.user
        )
        
        # Create CSV file for attributes
        csv_data = [
            ['Code', 'Type', 'Group', 'Localizable', 'Scopable'],
            ['color', 'text', 'technical', 'true', 'false'],
            ['weight', 'number', 'technical', 'false', 'false']
        ]
        csv_file = create_csv_file(csv_data, 'attributes.csv')
        
        # Create a mapping
        mapping = {
            'Code': 'code',
            'Type': 'type',
            'Group': 'group_code',
            'Localizable': 'is_localizable',
            'Scopable': 'is_scopable'
        }
        
        # Make the API call
        data = {
            'csv_file': csv_file,
            'mapping': json.dumps(mapping),
            'duplicate_strategy': 'overwrite'
        }
        response = self.client.post(self.attributes_url, data, format='multipart')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the import task was created
        task_id = response.data['id']
        task = ImportTask.objects.get(id=task_id)
        self.assertEqual(task.status, 'queued')  # Task is initially queued
        self.assertEqual(task.organization, self.organization)
        self.assertEqual(task.created_by, self.user)
        self.assertEqual(json.loads(task.mapping), mapping)
    
    def test_family_import(self):
        """Test importing families"""
        # First create an attribute group and attributes
        group = AttributeGroup.objects.create(
            name='technical',
            organization=self.organization,
            created_by=self.user
        )
        attr1 = Attribute.objects.create(
            code='color',
            label='Color',
            data_type='text',
            organization=self.organization,
            created_by=self.user
        )
        attr2 = Attribute.objects.create(
            code='weight',
            label='Weight',
            data_type='number',
            organization=self.organization,
            created_by=self.user
        )
        
        # Create CSV file for families
        csv_data = [
            ['Code', 'Label', 'Attributes'],
            ['clothing', 'Clothing', 'color|weight'],
            ['accessories', 'Accessories', 'color']
        ]
        csv_file = create_csv_file(csv_data, 'families.csv')
        
        # Create a mapping
        mapping = {
            'Code': 'code',
            'Label': 'label_en',
            'Attributes': 'attribute_codes'
        }
        
        # Make the API call
        data = {
            'csv_file': csv_file,
            'mapping': json.dumps(mapping),
            'duplicate_strategy': 'overwrite'
        }
        response = self.client.post(self.families_url, data, format='multipart')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the import task was created
        task_id = response.data['id']
        task = ImportTask.objects.get(id=task_id)
        self.assertEqual(task.status, 'queued')  # Task is initially queued
        self.assertEqual(task.organization, self.organization)
        self.assertEqual(task.created_by, self.user)
        self.assertEqual(json.loads(task.mapping), mapping) 