"""
Tests for the prices app API views
"""
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
import json
from datetime import timedelta

from organizations.models import Organization, Membership, Role
from products.models import Product, SalesChannel
from prices.models import Currency, PriceType, ProductPrice
from orgs.models import Organization as OrgsOrganization

User = get_user_model()


class PricesAPITestBase(APITestCase):
    """Base test class for prices API tests"""
    
    def setUp(self):
        """Set up test data and authenticate client"""
        # Create organization
        self.org = Organization.objects.create(name="Test Organization")
        
        # Create role
        self.role = Role.objects.create(
            name="Admin",
            organization=self.org,
            permissions={
                "product": {
                    "view": True,
                    "add": True,
                    "change": True,
                    "delete": True
                }
            }
        )
        
        # Create user
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="testpassword",
            first_name="Test",
            last_name="User"
        )
        
        # Create membership
        self.membership = Membership.objects.create(
            org=self.org,
            user=self.user,
            role=self.role,
            status="active"
        )
        
        # Create org in the orgs app as well (needed for authentication)
        self.orgs_org = OrgsOrganization.objects.create(
            name="Test Organization",
        )
        
        # Authenticate client
        self.client = APIClient()
        response = self.client.post(
            "/api/token/",
            {"email": "testuser@example.com", "password": "testpassword"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        
        # Create test data
        self.currency = Currency.objects.create(
            iso_code="USD",
            symbol="$",
            name="US Dollar",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        self.price_type = PriceType.objects.create(
            code="retail",
            label="Retail Price",
            organization=self.org
        )
        
        self.product = Product.objects.create(
            name="Test Product",
            sku="TP001",
            organization=self.org
        )
        
        self.channel = SalesChannel.objects.create(
            code="web",
            name="Web Store",
            organization=self.org
        )


class CurrencyAPITest(PricesAPITestBase):
    """Test the Currency API endpoints"""
    
    def test_list_currencies(self):
        """Test listing currencies"""
        # Add another currency
        Currency.objects.create(
            iso_code="EUR",
            symbol="€",
            name="Euro",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        url = reverse("currency-list")
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_create_currency(self):
        """Test creating a currency"""
        url = reverse("currency-list")
        data = {
            "iso_code": "GBP",
            "symbol": "£",
            "name": "British Pound",
            "decimals": 2
        }
        
        response = self.client.post(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["iso_code"], "GBP")
        self.assertEqual(response.data["name"], "British Pound")
        
        # Verify in database
        currency = Currency.objects.get(iso_code="GBP", organization=self.org)
        self.assertEqual(currency.symbol, "£")
    
    def test_retrieve_currency(self):
        """Test retrieving a currency"""
        url = reverse("currency-detail", args=["USD"])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["iso_code"], "USD")
        self.assertEqual(response.data["name"], "US Dollar")
    
    def test_update_currency(self):
        """Test updating a currency"""
        url = reverse("currency-detail", args=["USD"])
        data = {
            "symbol": "$",
            "name": "US Dollar Updated",
            "decimals": 2
        }
        
        response = self.client.patch(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "US Dollar Updated")
        
        # Verify in database
        currency = Currency.objects.get(iso_code="USD", organization=self.org)
        self.assertEqual(currency.name, "US Dollar Updated")
    
    def test_delete_currency(self):
        """Test deleting a currency"""
        url = reverse("currency-detail", args=["USD"])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify in database
        self.assertFalse(Currency.objects.filter(iso_code="USD", organization=self.org).exists())


class PriceTypeAPITest(PricesAPITestBase):
    """Test the PriceType API endpoints"""
    
    def test_list_price_types(self):
        """Test listing price types"""
        # Add another price type
        PriceType.objects.create(
            code="wholesale",
            label="Wholesale Price",
            organization=self.org
        )
        
        url = reverse("price-type-list")
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_create_price_type(self):
        """Test creating a price type"""
        url = reverse("price-type-list")
        data = {
            "code": "msrp",
            "label": "Manufacturer's Suggested Retail Price"
        }
        
        response = self.client.post(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["code"], "msrp")
        self.assertEqual(response.data["label"], "Manufacturer's Suggested Retail Price")
        
        # Verify in database
        price_type = PriceType.objects.get(code="msrp", organization=self.org)
        self.assertEqual(price_type.label, "Manufacturer's Suggested Retail Price")
    
    def test_retrieve_price_type(self):
        """Test retrieving a price type"""
        url = reverse("price-type-detail", args=[self.price_type.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["code"], "retail")
        self.assertEqual(response.data["label"], "Retail Price")
    
    def test_update_price_type(self):
        """Test updating a price type"""
        url = reverse("price-type-detail", args=[self.price_type.id])
        data = {
            "label": "Updated Retail Price"
        }
        
        response = self.client.patch(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["label"], "Updated Retail Price")
        
        # Verify in database
        price_type = PriceType.objects.get(id=self.price_type.id)
        self.assertEqual(price_type.label, "Updated Retail Price")
    
    def test_delete_price_type(self):
        """Test deleting a price type"""
        url = reverse("price-type-detail", args=[self.price_type.id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify in database
        self.assertFalse(PriceType.objects.filter(id=self.price_type.id).exists())


class ProductPriceAPITest(PricesAPITestBase):
    """Test the ProductPrice API endpoints"""
    
    def setUp(self):
        """Set up additional test data"""
        super().setUp()
        
        self.now = timezone.now()
        self.product_price = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=self.currency,
            channel=self.channel,
            amount=99.99,
            valid_from=self.now,
            organization=self.org
        )
    
    def test_list_product_prices(self):
        """Test listing product prices"""
        url = reverse("product-prices-list", args=[self.product.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount"], "99.99")
    
    def test_create_product_price(self):
        """Test creating a product price"""
        # Create another price type for the test
        price_type2 = PriceType.objects.create(
            code="wholesale",
            label="Wholesale Price",
            organization=self.org
        )
        
        url = reverse("product-prices-list", args=[self.product.id])
        data = {
            "price_type": price_type2.id,
            "currency": self.currency.iso_code,
            "channel": self.channel.id,
            "amount": "79.99",
            "valid_from": (self.now + timedelta(days=1)).isoformat()
        }
        
        response = self.client.post(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["amount"], "79.99")
        self.assertEqual(response.data["price_type_display"], "Wholesale Price")
        
        # Verify in database
        self.assertEqual(ProductPrice.objects.count(), 2)
        
        # Test that price is linked to the correct product
        price = ProductPrice.objects.get(id=response.data["id"])
        self.assertEqual(price.product.id, self.product.id)
    
    def test_retrieve_product_price(self):
        """Test retrieving a product price"""
        url = reverse("product-prices-detail", args=[self.product.id, self.product_price.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["amount"], "99.99")
        self.assertEqual(response.data["price_type_display"], "Retail Price")
        self.assertEqual(response.data["channel_name"], "Web Store")
    
    def test_update_product_price(self):
        """Test updating a product price"""
        url = reverse("product-prices-detail", args=[self.product.id, self.product_price.id])
        data = {
            "amount": "109.99"
        }
        
        response = self.client.patch(url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["amount"], "109.99")
        
        # Verify in database
        price = ProductPrice.objects.get(id=self.product_price.id)
        self.assertEqual(float(price.amount), 109.99)
    
    def test_delete_product_price(self):
        """Test deleting a product price"""
        url = reverse("product-prices-detail", args=[self.product.id, self.product_price.id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify in database
        self.assertFalse(ProductPrice.objects.filter(id=self.product_price.id).exists())
    
    def test_filter_by_currency(self):
        """Test filtering product prices by currency"""
        # Create another currency and price
        currency2 = Currency.objects.create(
            iso_code="EUR",
            symbol="€",
            name="Euro",
            decimals=2,
            is_active=True,
            organization=self.org
        )
        
        ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=currency2,
            channel=self.channel,
            amount=89.99,
            valid_from=self.now + timedelta(hours=1),
            organization=self.org
        )
        
        # Test filtering
        url = reverse("product-prices-list", args=[self.product.id])
        response = self.client.get(f"{url}?currency={currency2.iso_code}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["currency"], "EUR")
    
    def test_filter_by_date_range(self):
        """Test filtering product prices by date range"""
        # Create prices with different valid_from dates
        tomorrow = self.now + timedelta(days=1)
        next_week = self.now + timedelta(days=7)
        
        ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=self.currency,
            channel=None,  # Test with no channel
            amount=109.99,
            valid_from=tomorrow,
            organization=self.org
        )
        
        ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=self.currency,
            channel=None,
            amount=119.99,
            valid_from=next_week,
            organization=self.org
        )
        
        # Test filtering by date range (from tomorrow to next week)
        url = reverse("product-prices-list", args=[self.product.id])
        response = self.client.get(
            f"{url}?valid_from_after={tomorrow.isoformat()}&valid_from_before={next_week.isoformat()}"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount"], "109.99") 