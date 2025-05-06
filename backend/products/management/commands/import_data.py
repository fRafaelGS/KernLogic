import json
import os
import traceback
from contextlib import contextmanager, nullcontext
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from products.models import Product, ProductRelation, Activity, ProductAsset
from django.conf import settings
from django.db.models.signals import post_save, post_delete, pre_save
from accounts.models import Profile
from organizations.models import Organization
from django.utils import timezone
import datetime

User = get_user_model()

@contextmanager
def disable_signals():
    """
    Context manager to temporarily disable Django signals.
    """
    # Store the original signal functions
    saved_signals = {}
    
    # Disable signals
    for signal in [post_save, post_delete, pre_save]:
        saved_signals[signal] = signal.receivers
        signal.receivers = []
    
    try:
        yield
    finally:
        # Restore signals
        for signal, receivers in saved_signals.items():
            signal.receivers = receivers

class Command(BaseCommand):
    help = 'Import data from a JSON file into PostgreSQL database'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the JSON file containing data')
        parser.add_argument('--batch-size', type=int, default=50, help='Number of objects to process in each batch (default: 50)')
        parser.add_argument('--organization-id', type=int, help='ID of the organization to associate imported data with')
        parser.add_argument('--force', action='store_true', help='Force import of all objects even if they exist')
        parser.add_argument('--debug', action='store_true', help='Enable verbose debug output')
        parser.add_argument('--test-product', action='store_true', help='Test import of a single product')
        parser.add_argument('--no-signals', action='store_true', help='Disable Django signals during import')

    def handle(self, *args, **options):
        file_path = options['file_path']
        batch_size = options['batch_size']
        organization_id = options['organization_id']
        self.force = options['force']
        self.debug = options['debug']
        test_product = options['test_product']
        no_signals = options['no_signals']
        
        self.stdout.write(self.style.SUCCESS(f'Starting import from file: {file_path} with batch size: {batch_size}'))
        if self.force:
            self.stdout.write(self.style.WARNING('Force mode enabled - will overwrite existing records'))
        if self.debug:
            self.stdout.write(self.style.WARNING('Debug mode enabled - verbose output will be shown'))
        if no_signals:
            self.stdout.write(self.style.WARNING('Django signals disabled during import'))
        
        # If organization_id is provided, get the organization
        self.organization = None
        if organization_id:
            try:
                self.organization = Organization.objects.get(pk=organization_id)
                self.stdout.write(self.style.SUCCESS(f'Using organization: {self.organization}'))
            except Organization.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Organization with ID {organization_id} does not exist'))
                return
        else:
            # Try to get the first organization in the database
            try:
                self.organization = Organization.objects.first()
                if self.organization:
                    self.stdout.write(self.style.SUCCESS(f'Using first available organization: {self.organization}'))
                else:
                    self.stdout.write(self.style.ERROR(f'No organizations found in the database'))
                    self.stdout.write(self.style.ERROR(f'Please create an organization first or specify an organization ID'))
                    return
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error getting organization: {e}'))
                return
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # Skip the first line if it's not part of the JSON
                first_line = file.readline().strip()
                if not first_line.startswith('['):
                    self.stdout.write(self.style.WARNING(f'Skipping first line: {first_line}'))
                    data = json.loads(file.read())
                else:
                    # If the first line starts with '[', it's part of the JSON
                    file.seek(0)
                    data = json.loads(file.read())
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'Error decoding JSON: {e}'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading file: {e}'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Successfully loaded JSON data with {len(data)} objects'))
        
        # Create a context manager for disabling signals if needed
        context_manager = disable_signals() if no_signals else nullcontext()
        
        with context_manager:
            # If test-product flag is set, try to import just one product for debugging
            if test_product:
                self.stdout.write(self.style.WARNING('Test product mode enabled - importing a single product for debugging'))
                
                # Find a product record in the data
                product_record = None
                for record in data:
                    if record['model'] == 'products.product':
                        product_record = record
                        break
                
                if product_record:
                    self.stdout.write(self.style.SUCCESS(f'Found a product record: {product_record}'))
                    
                    # Print the Product model fields
                    self.stdout.write(self.style.SUCCESS(f'Product model fields: {[f.name for f in Product._meta.get_fields()]}'))
                    
                    # Try to import the product directly
                    try:
                        pk = product_record['pk']
                        fields = product_record['fields']
                        
                        # Get the creator if available
                        created_by = None
                        if fields.get('created_by'):
                            try:
                                created_by = User.objects.get(pk=fields['created_by'])
                            except User.DoesNotExist:
                                self.stdout.write(self.style.WARNING(f'User with ID {fields["created_by"]} not found'))
                        
                        # Create a new product with essential fields only
                        try:
                            product = Product(
                                id=pk,
                                name=fields.get('name', ''),
                                description=fields.get('description', ''),
                                sku=fields.get('sku', ''),
                                price=fields.get('price', 0),
                                organization=self.organization,
                                created_by=created_by,
                                created_at=fields.get('created_at', timezone.now()),
                                updated_at=fields.get('updated_at', timezone.now()),
                                category=fields.get('category', ''),
                                brand=fields.get('brand', ''),
                                barcode=fields.get('barcode', ''),
                                tags=fields.get('tags', ''),
                                is_active=fields.get('is_active', True),
                                is_archived=fields.get('is_archived', False)
                            )
                            product.save()
                            self.stdout.write(self.style.SUCCESS(f'Successfully created test product with ID {pk}'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'Error creating test product: {e}'))
                            self.stdout.write(self.style.ERROR(traceback.format_exc()))
                    
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error processing test product: {e}'))
                        self.stdout.write(self.style.ERROR(traceback.format_exc()))
                    
                    return
                else:
                    self.stdout.write(self.style.ERROR('No product records found in the data'))
                    return
            
            # Process data in batches
            model_counts = {
                'User': 0,
                'Profile': 0,
                'Product': 0,
                'ProductRelation': 0,
                'Activity': 0
            }
            
            # Group objects by model type
            grouped_data = self._group_data_by_model(data)
            
            # Print model counts
            if self.debug:
                for model_name, objects in grouped_data.items():
                    self.stdout.write(self.style.SUCCESS(f'Found {len(objects)} {model_name} objects in JSON file'))
            
            # Process each model type
            for model_name, objects in grouped_data.items():
                self.stdout.write(self.style.SUCCESS(f'Processing {len(objects)} {model_name} objects'))
                
                # Process in batches
                for i in range(0, len(objects), batch_size):
                    batch = objects[i:i+batch_size]
                    self.stdout.write(self.style.SUCCESS(f'Processing batch {i//batch_size + 1} of {model_name} ({len(batch)} objects)'))
                    
                    with transaction.atomic():
                        batch_counts = self._process_batch(model_name, batch)
                        
                    # Update counts
                    for model, count in batch_counts.items():
                        model_counts[model] += count
            
        # Print summary
        self.stdout.write(self.style.SUCCESS('Import completed successfully!'))
        for model, count in model_counts.items():
            self.stdout.write(self.style.SUCCESS(f'Imported {count} {model} objects'))

    def _group_data_by_model(self, data):
        """Group data by model type"""
        grouped = {
            'User': [],
            'Profile': [],
            'Product': [],
            'ProductRelation': [],
            'Activity': []
        }
        
        for obj in data:
            model_name = obj['model'].split('.')[-1]
            
            if model_name == 'user':
                grouped['User'].append(obj)
            elif model_name == 'profile':
                grouped['Profile'].append(obj)
            elif model_name == 'product':
                grouped['Product'].append(obj)
            elif model_name == 'productrelation':
                grouped['ProductRelation'].append(obj)
            elif model_name == 'activity':
                grouped['Activity'].append(obj)
        
        return grouped
    
    def _process_batch(self, model_name, batch):
        """Process a batch of objects"""
        model_counts = {
            'User': 0,
            'Profile': 0,
            'Product': 0,
            'ProductRelation': 0,
            'Activity': 0
        }
        
        if model_name == 'User':
            for obj in batch:
                self._process_user(obj['pk'], obj['fields'], model_counts)
        elif model_name == 'Profile':
            for obj in batch:
                self._process_profile(obj['pk'], obj['fields'], model_counts)
        elif model_name == 'Product':
            for obj in batch:
                self._process_product(obj['pk'], obj['fields'], model_counts)
        elif model_name == 'ProductRelation':
            for obj in batch:
                self._process_product_relation(obj['pk'], obj['fields'], model_counts)
        elif model_name == 'Activity':
            for obj in batch:
                self._process_activity(obj['pk'], obj['fields'], model_counts)
        
        return model_counts
    
    def _process_user(self, pk, fields, model_counts):
        """Process a user object"""
        try:
            # Check if the user already exists
            try:
                user = User.objects.get(pk=pk)
                self.stdout.write(self.style.WARNING(f'User with ID {pk} already exists, updating'))
            except User.DoesNotExist:
                # Create new user
                user = User(
                    id=pk,
                    password=fields['password'],
                    last_login=fields.get('last_login'),
                    is_superuser=fields.get('is_superuser', False),
                    username=fields.get('username', ''),
                    first_name=fields.get('first_name', ''),
                    last_name=fields.get('last_name', ''),
                    email=fields.get('email', ''),
                    is_staff=fields.get('is_staff', False),
                    is_active=fields.get('is_active', True),
                    date_joined=fields.get('date_joined'),
                    name=fields.get('name', '')
                )
                user.save()
                
                # Create a default profile for the user
                try:
                    Profile.objects.create(user=user)
                    self.stdout.write(self.style.SUCCESS(f'Created profile for {user.email}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating profile for user {pk}: {e}'))
                
                model_counts['User'] += 1
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing user {pk}: {e}'))
    
    def _process_profile(self, pk, fields, model_counts):
        """Process a profile object - profiles are already created with users, so just update them"""
        try:
            # Get the associated user
            user_id = fields.get('user')
            
            # Skip if the user doesn't exist
            if not User.objects.filter(pk=user_id).exists():
                self.stdout.write(self.style.WARNING(f'User with ID {user_id} does not exist, skipping profile {pk}'))
                return
                
            # Try to get the user's profile
            try:
                profile = Profile.objects.get(user_id=user_id)
                
                # Update avatar if it exists
                if fields.get('avatar'):
                    profile.avatar = fields.get('avatar')
                    profile.save()
                    self.stdout.write(self.style.SUCCESS(f'Updated profile for user {user_id}'))
                    model_counts['Profile'] += 1
                    
            except Profile.DoesNotExist:
                # This shouldn't happen as we create profiles with users
                self.stdout.write(self.style.WARNING(f'Profile for user {user_id} does not exist'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing profile {pk}: {e}'))
    
    def _process_product(self, pk, fields, model_counts):
        """Process a product object"""
        try:
            if self.debug:
                self.stdout.write(self.style.SUCCESS(f'Processing product {pk} with fields: {fields}'))
                self.stdout.write(self.style.SUCCESS(f'Product model fields: {[f.name for f in Product._meta.get_fields()]}'))
            
            # Check if the product already exists
            try:
                product = Product.objects.get(pk=pk)
                if not self.force:
                    self.stdout.write(self.style.WARNING(f'Product with ID {pk} already exists, skipping'))
                    return
                else:
                    self.stdout.write(self.style.WARNING(f'Product with ID {pk} already exists, updating'))
                
                # Update existing product
                for field, value in fields.items():
                    if field == 'created_by':
                        if value:
                            try:
                                product.created_by = User.objects.get(pk=value)
                            except User.DoesNotExist:
                                product.created_by = None
                    elif field == 'organization':
                        # Skip - we'll use the organization from the command
                        continue
                    elif field != 'primary_image':  # Handle image separately
                        setattr(product, field, value)
                
                # Set the organization
                product.organization = self.organization
                
                # Handle primary image field separately if it exists
                if 'primary_image' in fields and fields['primary_image']:
                    # Make sure the media file exists
                    image_path = os.path.join(settings.MEDIA_ROOT, fields['primary_image'])
                    if os.path.exists(image_path):
                        product.primary_image = fields['primary_image']
                
                product.save()
                model_counts['Product'] += 1
                
            except Product.DoesNotExist:
                # Get the creator if available
                created_by = None
                if fields.get('created_by'):
                    try:
                        created_by = User.objects.get(pk=fields['created_by'])
                    except User.DoesNotExist:
                        if self.debug:
                            self.stdout.write(self.style.WARNING(f'User with ID {fields["created_by"]} not found for product {pk}'))
                        pass
                
                # Create new product with all fields except primary_image and organization
                product_data = {k: v for k, v in fields.items() if k != 'primary_image' and k != 'created_by' and k != 'organization'}
                
                if self.debug:
                    self.stdout.write(self.style.SUCCESS(f'Creating product {pk} with data: {product_data}'))
                
                try:
                    product = Product(
                        id=pk,
                        created_by=created_by,
                        organization=self.organization,
                        **product_data
                    )
                    
                    # Handle primary image field separately if it exists
                    if 'primary_image' in fields and fields['primary_image']:
                        # Make sure the media file exists
                        image_path = os.path.join(settings.MEDIA_ROOT, fields['primary_image'])
                        if os.path.exists(image_path):
                            product.primary_image = fields['primary_image']
                    
                    product.save()
                    model_counts['Product'] += 1
                    self.stdout.write(self.style.SUCCESS(f'Successfully created product {pk}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating product {pk}: {e}'))
                    if self.debug:
                        self.stdout.write(self.style.ERROR(traceback.format_exc()))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing product {pk}: {e}'))
            if self.debug:
                self.stdout.write(self.style.ERROR(traceback.format_exc()))
    
    def _process_product_relation(self, pk, fields, model_counts):
        """Process a product relation object"""
        try:
            # Check if the relation already exists
            try:
                relation = ProductRelation.objects.get(pk=pk)
                if not self.force:
                    self.stdout.write(self.style.WARNING(f'ProductRelation with ID {pk} already exists, skipping'))
                    return
                else:
                    self.stdout.write(self.style.WARNING(f'ProductRelation with ID {pk} already exists, updating'))
                    # We'll update it by deleting and recreating
                    relation.delete()
            except ProductRelation.DoesNotExist:
                pass
                
            # Get the related products
            product_id = fields.get('product')
            related_product_id = fields.get('related_product')
            
            # Check if both products exist
            if not Product.objects.filter(pk=product_id).exists() or not Product.objects.filter(pk=related_product_id).exists():
                self.stdout.write(self.style.WARNING(f'One or both products ({product_id}, {related_product_id}) do not exist, skipping relation {pk}'))
                return
            
            try:
                product = Product.objects.get(pk=product_id)
                related_product = Product.objects.get(pk=related_product_id)
                
                # Get the creator if available
                created_by = None
                if fields.get('created_by'):
                    try:
                        created_by = User.objects.get(pk=fields['created_by'])
                    except User.DoesNotExist:
                        pass
                
                # Create new relation
                relation = ProductRelation(
                    id=pk,
                    product=product,
                    related_product=related_product,
                    relationship_type=fields.get('relationship_type', 'related'),
                    is_pinned=fields.get('is_pinned', False),
                    notes=fields.get('notes', ''),
                    created_at=fields.get('created_at'),
                    created_by=created_by,
                    organization=self.organization
                )
                relation.save()
                model_counts['ProductRelation'] += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating relation {pk}: {e}'))
                if self.debug:
                    self.stdout.write(self.style.ERROR(traceback.format_exc()))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing relation {pk}: {e}'))
            if self.debug:
                self.stdout.write(self.style.ERROR(traceback.format_exc()))
    
    def _process_activity(self, pk, fields, model_counts):
        """Process an activity object"""
        try:
            # Check if the activity already exists
            try:
                activity = Activity.objects.get(pk=pk)
                self.stdout.write(self.style.WARNING(f'Activity with ID {pk} already exists, skipping'))
                return
            except Activity.DoesNotExist:
                # Get the user if available
                user = None
                if fields.get('user'):
                    try:
                        user = User.objects.get(pk=fields['user'])
                    except User.DoesNotExist:
                        pass
                
                # Create new activity
                activity = Activity(
                    id=pk,
                    organization=self.organization,
                    user=user,
                    entity=fields.get('entity', ''),
                    entity_id=fields.get('entity_id', ''),
                    action=fields.get('action', ''),
                    message=fields.get('message', ''),
                    created_at=fields.get('created_at')
                )
                activity.save()
                model_counts['Activity'] += 1
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error processing activity {pk}: {e}'))
            if self.debug:
                self.stdout.write(self.style.ERROR(traceback.format_exc())) 