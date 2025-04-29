from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import tempfile
import pandas as pd
import os
import json
from .models import ImportTask
from unittest.mock import patch

User = get_user_model()

class ImportTaskModelTests(TestCase):
    """Tests for the ImportTask model."""
    
    def setUp(self):
        # Create a test user with username (required)
        self.user = User.objects.create_user(
            username='testuser',  # Username is required
            email='test@example.com',
            password='testpass123',
            name='Test User'
        )
        
        # Create a test CSV file
        self.temp_file = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
        self.temp_file.close()
        
        # Write test data to CSV
        test_df = pd.DataFrame({
            'Product Name': ['Test Product 1', 'Test Product 2'],
            'SKU': ['SKU001', 'SKU002'],
            'Price': [19.99, 29.99],
        })
        test_df.to_csv(self.temp_file.name, index=False)
        
        # Create a test ImportTask
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        self.task = ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='queued',
            created_by=self.user
        )
    
    def tearDown(self):
        # Clean up temp file
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
    
    def test_task_str_representation(self):
        """Test the string representation of the ImportTask model."""
        self.assertEqual(
            str(self.task),
            f"Import {self.task.id} (queued): 0/? rows"
        )
    
    def test_progress_percentage(self):
        """Test the progress_percentage property."""
        # When total_rows is None
        self.assertEqual(self.task.progress_percentage, 0)
        
        # When there's progress
        self.task.total_rows = 100
        self.task.processed = 50
        self.assertEqual(self.task.progress_percentage, 50)
        
        # When progress exceeds total (should cap at 100%)
        self.task.processed = 150
        self.assertEqual(self.task.progress_percentage, 100)
    
    def test_is_completed(self):
        """Test the is_completed property."""
        # Test queued status (not completed)
        self.task.status = 'queued'
        self.assertFalse(self.task.is_completed)
        
        # Test running status (not completed)
        self.task.status = 'running'
        self.assertFalse(self.task.is_completed)
        
        # Test success status (completed)
        self.task.status = 'success'
        self.assertTrue(self.task.is_completed)
        
        # Test error status (completed)
        self.task.status = 'error'
        self.assertTrue(self.task.is_completed)
        
        # Test partial_success status (completed)
        self.task.status = 'partial_success'
        self.assertTrue(self.task.is_completed)


class ImportTaskAPITests(TestCase):
    """Tests for the ImportTask API."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create a test user with username (required)
        self.user = User.objects.create_user(
            username='testuser',  # Username is required
            email='test@example.com',
            password='testpass123',
            name='Test User'
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create a test CSV file
        self.temp_file = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
        self.temp_file.close()
        
        # Write test data to CSV
        test_df = pd.DataFrame({
            'Product Name': ['Test Product 1', 'Test Product 2'],
            'SKU': ['SKU001', 'SKU002'],
            'Price': [19.99, 29.99],
        })
        test_df.to_csv(self.temp_file.name, index=False)
    
    def tearDown(self):
        # Clean up temp file
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)
    
    @patch('apps.imports.tasks.import_csv_task.delay')
    def test_create_import_task(self, mock_task):
        """Test creating a new import task."""
        url = reverse('imports-list')
        
        # Prepare the data
        with open(self.temp_file.name, 'rb') as f:
            mapping = {'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'}
            data = {
                'csv_file': f,
                'mapping': json.dumps(mapping),
            }
            
            response = self.client.post(url, data, format='multipart')
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ImportTask.objects.count(), 1)
        
        # Check that the task was enqueued
        task_id = response.data['id']
        mock_task.assert_called_once_with(task_id=task_id)
    
    def test_list_import_tasks(self):
        """Test listing import tasks."""
        # Create a few tasks
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='success',
            created_by=self.user
        )
        
        # Get the list
        url = reverse('imports-list')
        response = self.client.get(url)
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_retrieve_import_task(self):
        """Test retrieving a specific import task."""
        # Create a task
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        task = ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='success',
            created_by=self.user
        )
        
        # Get the task
        url = reverse('imports-detail', args=[task.id])
        response = self.client.get(url)
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], task.id)
        
    @patch('apps.imports.views.pd.read_csv')
    def test_preview_action(self, mock_read_csv):
        """Test the preview action."""
        # Create a mock DataFrame for preview
        mock_df = pd.DataFrame({
            'Product Name': ['Test Product 1'],
            'SKU': ['SKU001'],
            'Price': [19.99],
        })
        mock_read_csv.return_value = mock_df
        
        # Create a task
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        task = ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='queued',
            created_by=self.user
        )
        
        # Call the preview action
        url = reverse('imports-preview', args=[task.id])
        response = self.client.get(url)
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('columns', response.data)
        self.assertIn('rows', response.data)
    
    def test_cancel_action(self):
        """Test the cancel action."""
        # Create a task
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        task = ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='running',
            created_by=self.user
        )
        
        # Call the cancel action
        url = reverse('imports-cancel', args=[task.id])
        response = self.client.post(url)
        
        # Check the response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'canceled')
        
        # Refresh the task from DB
        task.refresh_from_db()
        self.assertEqual(task.status, 'error')
    
    def test_cancel_completed_task_fails(self):
        """Test that canceling a completed task fails."""
        # Create a completed task
        with open(self.temp_file.name, 'rb') as f:
            csv_file = SimpleUploadedFile('test.csv', f.read())
            
        task = ImportTask.objects.create(
            csv_file=csv_file,
            mapping={'Product Name': 'name', 'SKU': 'sku', 'Price': 'price'},
            status='success',
            created_by=self.user
        )
        
        # Try to cancel it
        url = reverse('imports-cancel', args=[task.id])
        response = self.client.post(url)
        
        # Check that it fails
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) 