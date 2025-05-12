import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from products.models import Product, ProductEvent
from prices.models import ProductPrice, Currency, PriceType

@pytest.mark.django_db
class TestPriceFieldsRollback:
    """Test rollback functionality for nested price fields."""
    
    def setup_method(self):
        """Set up test data."""
        # Create test user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        
        # Create a product
        self.product = Product.objects.create(
            name='Test Product',
            sku='TEST-123',
            created_by=self.user
        )
        
        # Create currency and price type
        self.sek_currency = Currency.objects.create(
            iso_code='SEK',
            name='Swedish Krona'
        )
        self.eur_currency = Currency.objects.create(
            iso_code='EUR',
            name='Euro'
        )
        self.base_price_type = PriceType.objects.create(
            code='base',
            label='Base Price'
        )
        self.discount_price_type = PriceType.objects.create(
            code='discount',
            label='Discount Price'
        )
        
        # Create a base price for the product
        self.base_price = ProductPrice.objects.create(
            product=self.product,
            amount=Decimal('100.00'),
            currency=self.sek_currency,
            price_type=self.base_price_type
        )
        
        # Create update events for the price fields
        # 1. Amount change event
        self.amount_event = ProductEvent.objects.create(
            product=self.product,
            created_by=self.user,
            event_type='price_updated',
            summary='Updated price amount',
            payload={
                'price_id': self.base_price.id,
                'changes': {
                    'amount': {
                        'old': '100.00',
                        'new': '120.00'
                    }
                }
            }
        )
        
        # 2. Currency change event
        self.currency_event = ProductEvent.objects.create(
            product=self.product,
            created_by=self.user,
            event_type='price_updated',
            summary='Updated price currency',
            payload={
                'price_id': self.base_price.id,
                'changes': {
                    'currency': {
                        'old': 'SEK',
                        'new': 'EUR'
                    }
                }
            }
        )
        
        # 3. Price type change event
        self.price_type_event = ProductEvent.objects.create(
            product=self.product,
            created_by=self.user,
            event_type='price_updated',
            summary='Updated price type',
            payload={
                'price_id': self.base_price.id,
                'changes': {
                    'price_type': {
                        'old': 'base',
                        'new': 'discount'
                    }
                }
            }
        )
        
        # Set the price to the "updated" values to simulate changes
        self.base_price.amount = Decimal('120.00')
        self.base_price.currency = self.eur_currency
        self.base_price.price_type = self.discount_price_type
        self.base_price.save()
    
    def test_rollback_amount(self, api_client):
        """Test rollback of price amount field."""
        # Authenticate
        api_client.force_authenticate(user=self.user)
        
        # Get the initial count of events
        initial_event_count = ProductEvent.objects.count()
        
        # Perform rollback
        url = reverse('products:product-history-rollback', kwargs={
            'product_pk': self.product.id,
            'pk': self.amount_event.id
        })
        response = api_client.post(url, {'field': 'amount'})
        
        # Check the response
        assert response.status_code == status.HTTP_200_OK
        
        # Refresh the price object from the database
        self.base_price.refresh_from_db()
        
        # Verify the price was rolled back
        assert self.base_price.amount == Decimal('100.00')
        
        # Verify a rollback event was created
        assert ProductEvent.objects.count() == initial_event_count + 1
        
        # Get the latest event
        latest_event = ProductEvent.objects.latest('id')
        
        # Verify the event details
        assert latest_event.event_type == 'rollback'
        assert latest_event.payload['restored_field'] == 'amount'
        assert latest_event.payload['restored_from_event'] == self.amount_event.id
        assert latest_event.payload['old'] == '120.00'
        assert latest_event.payload['new'] == '100.00'
    
    def test_rollback_currency(self, api_client):
        """Test rollback of price currency field."""
        # Authenticate
        api_client.force_authenticate(user=self.user)
        
        # Get the initial count of events
        initial_event_count = ProductEvent.objects.count()
        
        # Perform rollback
        url = reverse('products:product-history-rollback', kwargs={
            'product_pk': self.product.id,
            'pk': self.currency_event.id
        })
        response = api_client.post(url, {'field': 'currency'})
        
        # Check the response
        assert response.status_code == status.HTTP_200_OK
        
        # Refresh the price object from the database
        self.base_price.refresh_from_db()
        
        # Verify the currency was rolled back
        assert self.base_price.currency.iso_code == 'SEK'
        
        # Verify a rollback event was created
        assert ProductEvent.objects.count() == initial_event_count + 1
        
        # Get the latest event
        latest_event = ProductEvent.objects.latest('id')
        
        # Verify the event details
        assert latest_event.event_type == 'rollback'
        assert latest_event.payload['restored_field'] == 'currency'
        assert latest_event.payload['restored_from_event'] == self.currency_event.id
        assert latest_event.payload['old'] == 'EUR'
        assert latest_event.payload['new'] == 'SEK'
    
    def test_rollback_price_type(self, api_client):
        """Test rollback of price type field."""
        # Authenticate
        api_client.force_authenticate(user=self.user)
        
        # Get the initial count of events
        initial_event_count = ProductEvent.objects.count()
        
        # Perform rollback
        url = reverse('products:product-history-rollback', kwargs={
            'product_pk': self.product.id,
            'pk': self.price_type_event.id
        })
        response = api_client.post(url, {'field': 'price_type'})
        
        # Check the response
        assert response.status_code == status.HTTP_200_OK
        
        # Refresh the price object from the database
        self.base_price.refresh_from_db()
        
        # Verify the price type was rolled back
        assert self.base_price.price_type.code == 'base'
        
        # Verify a rollback event was created
        assert ProductEvent.objects.count() == initial_event_count + 1
        
        # Get the latest event
        latest_event = ProductEvent.objects.latest('id')
        
        # Verify the event details
        assert latest_event.event_type == 'rollback'
        assert latest_event.payload['restored_field'] == 'price_type'
        assert latest_event.payload['restored_from_event'] == self.price_type_event.id
        assert latest_event.payload['old'] == 'discount'
        assert latest_event.payload['new'] == 'base'
    
    def test_rollback_no_base_price(self, api_client):
        """Test error when trying to rollback with no base price."""
        # Authenticate
        api_client.force_authenticate(user=self.user)
        
        # Create a new product without a base price
        product_no_price = Product.objects.create(
            name='No Price Product',
            sku='NO-PRICE-123',
            created_by=self.user
        )
        
        # Create a mock event
        mock_event = ProductEvent.objects.create(
            product=product_no_price,
            created_by=self.user,
            event_type='price_updated',
            summary='Updated price amount',
            payload={
                'changes': {
                    'amount': {
                        'old': '100.00',
                        'new': '120.00'
                    }
                }
            }
        )
        
        # Perform rollback
        url = reverse('products:product-history-rollback', kwargs={
            'product_pk': product_no_price.id,
            'pk': mock_event.id
        })
        response = api_client.post(url, {'field': 'amount'})
        
        # Check the response - should be a 400 error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "No base price record to rollback" in response.data['error']
    
    def test_rollback_invalid_field(self, api_client):
        """Test error when trying to rollback an invalid field."""
        # Authenticate
        api_client.force_authenticate(user=self.user)
        
        # Create a mock event with an invalid field
        mock_event = ProductEvent.objects.create(
            product=self.product,
            created_by=self.user,
            event_type='price_updated',
            summary='Updated price amount',
            payload={
                'changes': {
                    'invalid_field': {
                        'old': 'old_value',
                        'new': 'new_value'
                    }
                }
            }
        )
        
        # Perform rollback
        url = reverse('products:product-history-rollback', kwargs={
            'product_pk': self.product.id,
            'pk': mock_event.id
        })
        response = api_client.post(url, {'field': 'invalid_field'})
        
        # Check the response - should be a 400 error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "No changes found for field" in response.data['error'] 