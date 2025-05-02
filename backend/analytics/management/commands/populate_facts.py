from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Min, Q
from django.contrib.auth import get_user_model
from products.models import AttributeValue, ProductEvent
from analytics.models import (
    DimTime,
    DimProduct,
    DimAttribute,
    DimLocale,
    DimChannel,
    DimEditor,
    FactProductAttribute
)

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the fact table with product attribute data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Clear existing fact data before loading',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process in a batch',
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Process data for specific date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--editors',
            action='store_true',
            help='Populate editors dimension only',
        )

    def handle(self, *args, **options):
        reset = options.get('reset', False)
        batch_size = options.get('batch_size', 1000)
        date_str = options.get('date')
        editors_only = options.get('editors', False)
        
        self.stdout.write(self.style.SUCCESS(f'Starting to populate fact table...'))
        
        # Load editors dimension first
        self._populate_editors_dimension()
        
        if editors_only:
            return
        
        # Get processing date
        processing_date = None
        if date_str:
            try:
                processing_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
                self.stdout.write(f'Processing data for specific date: {processing_date}')
            except ValueError:
                self.stderr.write(self.style.ERROR(f'Invalid date format: {date_str}. Use YYYY-MM-DD format.'))
                return
        else:
            processing_date = timezone.now().date()
            self.stdout.write(f'Processing data for today: {processing_date}')
            
        # Get time dimension record for processing date
        try:
            time_dim = DimTime.objects.get(date=processing_date)
        except DimTime.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'Time dimension for {processing_date} does not exist. Run load_dims first.'))
            return
        
        # Reset fact table if requested
        if reset:
            self._reset_facts(time_dim)
            
        # Process attribute values and create fact records
        self._process_attribute_values(time_dim, batch_size)
        
        # Update enrichment velocity statistics
        self._update_enrichment_velocity(time_dim)
        
        # Update localization quality statistics
        self._update_localization_quality(time_dim)
        
        self.stdout.write(self.style.SUCCESS('Fact table populated successfully!'))

    def _populate_editors_dimension(self):
        """Populate the DimEditor dimension with user data"""
        self.stdout.write('Populating editors dimension...')
        
        # Get all users
        users = User.objects.all()
        
        # Get existing editor IDs
        existing_editors = set(DimEditor.objects.values_list('user_id', flat=True))
        
        # Create new editors
        editor_dimensions = []
        for user in users:
            if user.id not in existing_editors:
                editor_dimensions.append(DimEditor(
                    user_id=user.id,
                    username=user.username,
                    email=user.email
                ))
        
        # Bulk create editors
        if editor_dimensions:
            DimEditor.objects.bulk_create(editor_dimensions, batch_size=100)
            self.stdout.write(f'Created {len(editor_dimensions)} new editor dimension records.')
        
        # Update existing editors
        updated_count = 0
        for user in users:
            if user.id in existing_editors:
                editor = DimEditor.objects.get(user_id=user.id)
                if editor.username != user.username or editor.email != user.email:
                    editor.username = user.username
                    editor.email = user.email
                    editor.save()
                    updated_count += 1
        
        if updated_count > 0:
            self.stdout.write(f'Updated {updated_count} existing editor dimension records.')

    def _reset_facts(self, time_dim):
        """Clear existing fact data for the specified time dimension"""
        self.stdout.write(f'Clearing existing fact data for {time_dim.date}...')
        
        with transaction.atomic():
            deleted_count = FactProductAttribute.objects.filter(time=time_dim).delete()[0]
            self.stdout.write(f'Deleted {deleted_count} existing fact records.')

    def _process_attribute_values(self, time_dim, batch_size):
        """Process attribute values and create fact records"""
        self.stdout.write('Processing attribute values...')
        
        # Get all attribute values
        attribute_values = AttributeValue.objects.select_related(
            'product', 'attribute'
        ).all()
        
        fact_records = []
        processed_count = 0
        skipped_count = 0
        
        # Get existing fact signatures to avoid duplicates
        existing_facts = set(FactProductAttribute.objects.filter(time=time_dim).values_list(
            'product_id', 'attribute_id', 'locale_id', 'channel_id'
        ))
        
        # Process attribute values
        for attr_value in attribute_values:
            try:
                # Skip if product or attribute doesn't exist in dimension tables
                if not DimProduct.objects.filter(product_id=attr_value.product_id).exists():
                    continue
                    
                if not DimAttribute.objects.filter(attribute_id=attr_value.attribute_id).exists():
                    continue
                    
                # Check for locale
                locale_id = attr_value.locale
                if locale_id and not DimLocale.objects.filter(code=locale_id).exists():
                    continue
                    
                # Check for channel
                channel_id = attr_value.channel
                if channel_id and not DimChannel.objects.filter(code=channel_id).exists():
                    continue
                
                # Create unique signature to check for duplicates
                fact_signature = (
                    attr_value.product_id,
                    attr_value.attribute_id,
                    locale_id,
                    channel_id
                )
                
                # Skip if fact record already exists
                if fact_signature in existing_facts:
                    skipped_count += 1
                    continue
                
                # Determine if attribute value is "completed"
                # This logic depends on how you define completeness
                completed = self._is_value_completed(attr_value.value)
                
                # Determine if this is a translation (non-default locale)
                is_translated = locale_id is not None and locale_id != 'en_US'  # Assuming en_US is default
                
                # Create fact record
                fact_records.append(FactProductAttribute(
                    product_id=attr_value.product_id,
                    attribute_id=attr_value.attribute_id,
                    time=time_dim,
                    locale_id=locale_id,
                    channel_id=channel_id,
                    organization_id=attr_value.organization_id,
                    value=attr_value.value,
                    completed=completed,
                    is_translated=is_translated,
                    updated_at=timezone.now()
                ))
                
                processed_count += 1
                
                # Bulk create when batch size is reached
                if len(fact_records) >= batch_size:
                    FactProductAttribute.objects.bulk_create(fact_records, batch_size=batch_size)
                    self.stdout.write(f'Created {len(fact_records)} fact records.')
                    fact_records = []
                    
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Error processing attribute value {attr_value.id}: {str(e)}'))
        
        # Create remaining fact records
        if fact_records:
            FactProductAttribute.objects.bulk_create(fact_records, batch_size=batch_size)
            self.stdout.write(f'Created {len(fact_records)} fact records.')
            
        self.stdout.write(f'Processed {processed_count} attribute values, skipped {skipped_count} duplicates.')

    def _update_enrichment_velocity(self, time_dim):
        """Update enrichment velocity statistics"""
        self.stdout.write('Updating enrichment velocity statistics...')
        
        # Get ProductEvent records for attribute changes
        product_events = ProductEvent.objects.filter(
            event_type__startswith='attribute_'
        ).values('product_id', 'created_by').annotate(
            edit_count=Count('id'),
            first_edit=Min('created_at')
        )
        
        updated_count = 0
        
        # Update fact records with enrichment velocity data
        for event in product_events:
            product_id = event['product_id']
            user_id = event['created_by']
            edit_count = event['edit_count']
            first_edit = event['first_edit']
            
            # Skip if editor doesn't exist
            if user_id and not DimEditor.objects.filter(user_id=user_id).exists():
                continue
            
            # Get all fact records for this product
            fact_records = FactProductAttribute.objects.filter(
                product_id=product_id,
                time=time_dim
            )
            
            if fact_records.exists():
                fact_records.update(
                    edit_count=edit_count,
                    first_published_at=first_edit,
                    last_edited_by_id=user_id
                )
                updated_count += fact_records.count()
        
        self.stdout.write(f'Updated enrichment velocity for {updated_count} fact records.')

    def _update_localization_quality(self, time_dim):
        """Update localization quality statistics"""
        self.stdout.write('Updating localization quality statistics...')
        
        # Find all FactProductAttribute records that have a locale
        fact_records = FactProductAttribute.objects.filter(
            time=time_dim,
            locale__isnull=False
        ).exclude(locale='en_US')  # Exclude default locale
        
        # Set translated_at to the current time for these records
        if fact_records.exists():
            fact_records.update(
                is_translated=True,
                translated_at=timezone.now()
            )
            
            self.stdout.write(f'Updated localization quality for {fact_records.count()} fact records.')

    def _is_value_completed(self, value):
        """Determine if an attribute value is considered "completed"
        This logic depends on how you define completeness
        """
        if value is None:
            return False
            
        # For string values
        if isinstance(value, str):
            return len(value.strip()) > 0
            
        # For lists
        if isinstance(value, list):
            return len(value) > 0
            
        # For dicts
        if isinstance(value, dict):
            return len(value) > 0
            
        # For booleans
        if isinstance(value, bool):
            return True
            
        # For numbers
        if isinstance(value, (int, float)):
            return True
            
        # Default case
        return bool(value) 