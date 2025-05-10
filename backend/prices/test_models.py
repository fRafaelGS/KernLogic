"""
Tests for the prices app models
"""
from django.test import TestCase
from django.db.utils import IntegrityError
from django.utils import timezone

from organizations.models import Organization
from products.models import Product, SalesChannel
from prices.models import Currency, PriceType, ProductPrice


class CurrencyModelTest(TestCase):
    """Test cases for the Currency model"""
    
    def setUp(self):
        self.org1 = Organization.objects.create(name="Test Organization 1")
        self.org2 = Organization.objects.create(name="Test Organization 2")
        
        # Create test currencies
        self.currency1 = Currency.objects.create(
            iso_code="USD",
            symbol="$",
            name="US Dollar",
            decimals=2,
            is_active=True,
            organization=self.org1
        )
        
        self.currency2 = Currency.objects.create(
            iso_code="EUR",
            symbol="€",
            name="Euro",
            decimals=2,
            is_active=True,
            organization=self.org1
        )
    
    def test_str_representation(self):
        """Test the string representation of a Currency"""
        self.assertEqual(str(self.currency1), "US Dollar (USD)")
        self.assertEqual(str(self.currency2), "Euro (EUR)")
    
    def test_same_currency_different_orgs(self):
        """Test that same currency ISO code can be used in different organizations"""
        # Should be able to create same currency for different org
        Currency.objects.create(
            iso_code="USD",
            symbol="$",
            name="US Dollar",
            decimals=2,
            is_active=True,
            organization=self.org2
        )
        
        # Count should now be 3
        self.assertEqual(Currency.objects.count(), 3)
        
        # Check that we have 2 USD currencies (one for each org)
        self.assertEqual(Currency.objects.filter(iso_code="USD").count(), 2)


class PriceTypeModelTest(TestCase):
    """Test cases for the PriceType model"""
    
    def setUp(self):
        self.org1 = Organization.objects.create(name="Test Organization 1")
        self.org2 = Organization.objects.create(name="Test Organization 2")
        
        # Create test price types
        self.price_type1 = PriceType.objects.create(
            code="retail",
            label="Retail Price",
            organization=self.org1
        )
        
        self.price_type2 = PriceType.objects.create(
            code="wholesale",
            label="Wholesale Price",
            organization=self.org1
        )
    
    def test_str_representation(self):
        """Test the string representation of a PriceType"""
        self.assertEqual(str(self.price_type1), "Retail Price (retail)")
        self.assertEqual(str(self.price_type2), "Wholesale Price (wholesale)")
    
    def test_unique_code_per_org(self):
        """Test that price type codes must be unique per organization"""
        # Should be able to create same code for different org
        PriceType.objects.create(
            code="retail",
            label="Retail Price",
            organization=self.org2
        )
        
        # Count should now be 3
        self.assertEqual(PriceType.objects.count(), 3)
        
        # But should not be able to create duplicate code for same org
        with self.assertRaises(IntegrityError):
            PriceType.objects.create(
                code="retail",
                label="Another Retail Price",
                organization=self.org1
            )
    
    def test_slug_creation(self):
        """Test automatic slug creation from label"""
        price_type = PriceType.objects.create(
            label="Special Offer",
            organization=self.org1
        )
        self.assertEqual(price_type.code, "special-offer")


class ProductPriceModelTest(TestCase):
    """Test cases for the ProductPrice model"""
    
    def setUp(self):
        self.org = Organization.objects.create(name="Test Organization")
        
        # Create test currency and price type
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
        
        # Create test product
        self.product = Product.objects.create(
            name="Test Product",
            sku="TP001",
            organization=self.org,
        )
        
        # Create test channel
        self.channel = SalesChannel.objects.create(
            code="web",
            name="Web Store",
            organization=self.org
        )
        
        # Create test product price
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
    
    def test_str_representation(self):
        """Test the string representation of a ProductPrice"""
        expected_str = f"{self.product} - {self.price_type.label} - {self.channel}: {self.currency.symbol}99.99"
        self.assertEqual(str(self.product_price), expected_str)
    
    def test_unique_price_constraints(self):
        """Test uniqueness constraints on product prices"""
        # Should fail to create identical price
        with self.assertRaises(IntegrityError):
            ProductPrice.objects.create(
                product=self.product,
                price_type=self.price_type,
                currency=self.currency,
                channel=self.channel,
                amount=149.99,
                valid_from=self.now,
                organization=self.org
            )
            
        # But should succeed with different channel
        channel2 = SalesChannel.objects.create(
            code="retail",
            name="Retail Store",
            organization=self.org
        )
        
        price2 = ProductPrice.objects.create(
            product=self.product,
            price_type=self.price_type,
            currency=self.currency,
            channel=channel2,
            amount=149.99,
            valid_from=self.now,
            organization=self.org
        )
        
        self.assertIsNotNone(price2.pk) 