import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Min, Max
from django.utils import timezone
from products.models import Product, Attribute, AttributeValue
from analytics.models import (
    DimTime, 
    DimProduct, 
    DimAttribute, 
    DimLocale, 
    DimChannel, 
    FactProductAttribute
)

class Command(BaseCommand):
    help = 'Loads dimension tables for the analytics data warehouse'

    def add_arguments(self, parser):
        parser.add_argument(
            '--truncate',
            action='store_true',
            help='Truncate existing dimension tables before loading',
        )
        parser.add_argument(
            '--time-only',
            action='store_true',
            help='Only update the time dimension',
        )
        parser.add_argument(
            '--reference-only',
            action='store_true',
            help='Only update reference dimensions (product, attribute, locale, channel)',
        )

    def handle(self, *args, **options):
        truncate = options.get('truncate', False)
        time_only = options.get('time_only', False)
        reference_only = options.get('reference_only', False)

        self.stdout.write(self.style.SUCCESS(f'Starting to load dimension tables...'))
        
        if truncate:
            self._truncate_dims()
            
        if not reference_only:
            self._load_time_dimension()
            
        if not time_only:
            self._load_product_dimension()
            self._load_attribute_dimension()
            self._load_locale_dimension()
            self._load_channel_dimension()
            
        self.stdout.write(self.style.SUCCESS('Dimension tables loaded successfully!'))

    def _truncate_dims(self):
        """Truncate all dimension tables"""
        self.stdout.write('Truncating dimension tables...')
        
        with transaction.atomic():
            DimTime.objects.all().delete()
            DimProduct.objects.all().delete()
            DimAttribute.objects.all().delete()
            DimLocale.objects.all().delete()
            DimChannel.objects.all().delete()
            
        self.stdout.write(self.style.SUCCESS('All dimension tables truncated.'))

    def _load_time_dimension(self):
        """Load time dimension from product updated_at data and ensure future dates"""
        self.stdout.write('Loading time dimension...')
        
        # Get date range from Product updated_at 
        product_dates = Product.objects.aggregate(
            min_date=Min('updated_at'),
            max_date=Max('updated_at')
        )
        
        # Set default date range if no products exist
        min_date = product_dates.get('min_date')
        if not min_date:
            min_date = timezone.now().replace(day=1)
            
        max_date = product_dates.get('max_date') 
        if not max_date:
            max_date = timezone.now()
            
        # Ensure we have at least 60 days in the future
        future_date = timezone.now() + datetime.timedelta(days=60)
        if max_date < future_date:
            max_date = future_date
            
        # Create a list of dates from min_date to max_date
        current_date = min_date.date()
        end_date = max_date.date()
        
        time_dimensions = []
        existing_dates = set(DimTime.objects.values_list('date', flat=True))
        
        while current_date <= end_date:
            if current_date not in existing_dates:
                time_dimensions.append(DimTime(
                    date=current_date,
                    year=current_date.year,
                    quarter=(current_date.month - 1) // 3 + 1,
                    month=current_date.month,
                    day=current_date.day
                ))
            current_date += datetime.timedelta(days=1)
            
        # Bulk create new time dimensions
        if time_dimensions:
            DimTime.objects.bulk_create(time_dimensions, batch_size=1000)
            self.stdout.write(f'Created {len(time_dimensions)} new time dimension records.')
        else:
            self.stdout.write('No new time dimension records needed.')

    def _load_product_dimension(self):
        """Load product dimension from product data"""
        self.stdout.write('Loading product dimension...')
        
        # Get all products
        products = Product.objects.all()
        
        # Get existing product dimensions
        existing_products = set(DimProduct.objects.values_list('product_id', flat=True))
        
        # Create new product dimensions
        product_dimensions = []
        for product in products:
            if product.id not in existing_products:
                product_dimensions.append(DimProduct(
                    product=product,
                    sku=product.sku,
                    name=product.name,
                    organization_id=product.organization_id or 0
                ))
                
        # Bulk create new product dimensions
        if product_dimensions:
            DimProduct.objects.bulk_create(product_dimensions, batch_size=1000)
            self.stdout.write(f'Created {len(product_dimensions)} new product dimension records.')
        else:
            self.stdout.write('No new product dimension records needed.')
            
        # Update existing product dimensions
        for product in products:
            if product.id in existing_products:
                DimProduct.objects.filter(product_id=product.id).update(
                    sku=product.sku,
                    name=product.name,
                    organization_id=product.organization_id or 0
                )

    def _load_attribute_dimension(self):
        """Load attribute dimension from attribute data"""
        self.stdout.write('Loading attribute dimension...')
        
        # Get all attributes
        attributes = Attribute.objects.all()
        
        # Get existing attribute dimensions
        existing_attributes = set(DimAttribute.objects.values_list('attribute_id', flat=True))
        
        # Create new attribute dimensions
        attribute_dimensions = []
        for attribute in attributes:
            if attribute.id not in existing_attributes:
                attribute_dimensions.append(DimAttribute(
                    attribute=attribute,
                    code=attribute.code,
                    label=attribute.label,
                    data_type=attribute.data_type,
                    organization_id=attribute.organization_id
                ))
                
        # Bulk create new attribute dimensions
        if attribute_dimensions:
            DimAttribute.objects.bulk_create(attribute_dimensions, batch_size=1000)
            self.stdout.write(f'Created {len(attribute_dimensions)} new attribute dimension records.')
        else:
            self.stdout.write('No new attribute dimension records needed.')
            
        # Update existing attribute dimensions
        for attribute in attributes:
            if attribute.id in existing_attributes:
                DimAttribute.objects.filter(attribute_id=attribute.id).update(
                    code=attribute.code,
                    label=attribute.label,
                    data_type=attribute.data_type,
                    organization_id=attribute.organization_id
                )

    def _load_locale_dimension(self):
        """Load locale dimension from attribute value data"""
        self.stdout.write('Loading locale dimension...')
        
        # Get distinct locales from attribute values
        locales = AttributeValue.objects.exclude(locale__isnull=True).values_list('locale', flat=True).distinct()
        
        # Get existing locale dimensions
        existing_locales = set(DimLocale.objects.values_list('code', flat=True))
        
        # Create new locale dimensions
        locale_dimensions = []
        for locale in locales:
            if locale and locale not in existing_locales:
                # Use the locale as the description for now; this could be enhanced with a proper map
                locale_dimensions.append(DimLocale(
                    code=locale,
                    description=f"Locale: {locale}"
                ))
                
        # Bulk create new locale dimensions
        if locale_dimensions:
            DimLocale.objects.bulk_create(locale_dimensions, batch_size=1000)
            self.stdout.write(f'Created {len(locale_dimensions)} new locale dimension records.')
        else:
            self.stdout.write('No new locale dimension records needed.')

    def _load_channel_dimension(self):
        """Load channel dimension from attribute value data"""
        self.stdout.write('Loading channel dimension...')
        
        # Get distinct channels from attribute values
        channels = AttributeValue.objects.exclude(channel__isnull=True).values_list('channel', flat=True).distinct()
        
        # Get existing channel dimensions
        existing_channels = set(DimChannel.objects.values_list('code', flat=True))
        
        # Create new channel dimensions
        channel_dimensions = []
        for channel in channels:
            if channel and channel not in existing_channels:
                # Use the channel as the description for now; this could be enhanced with a proper map
                channel_dimensions.append(DimChannel(
                    code=channel,
                    description=f"Channel: {channel}"
                ))
                
        # Bulk create new channel dimensions
        if channel_dimensions:
            DimChannel.objects.bulk_create(channel_dimensions, batch_size=1000)
            self.stdout.write(f'Created {len(channel_dimensions)} new channel dimension records.')
        else:
            self.stdout.write('No new channel dimension records needed.') 