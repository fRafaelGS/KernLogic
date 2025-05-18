import logging
from products.models import Category, Family, Product, Attribute, AttributeValue, AttributeGroup, SalesChannel, Locale
from prices.models import ProductPrice, PriceType, Currency
from django.db import transaction
from decimal import Decimal
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

# Per-task caches (should be reset per import task)
_category_cache = {}
_family_cache = {}
_attribute_cache = {}
_attribute_group_cache = {}
_channel_cache = {}
_locale_cache = {}


def resolve_category_breadcrumb(path: str, org) -> Category:
    """
    Resolve a category from a breadcrumb path (e.g. 'Paint > Clear Coats').
    Creates categories as needed under the org.
    """
    global _category_cache
    if not path:
        return None
    key = (org.id, path.strip())
    if key in _category_cache:
        return _category_cache[key]
    names = [p.strip() for p in path.split('>') if p.strip()]
    parent = None
    for name in names:
        cat, created = Category.objects.get_or_create(
            name=name, parent=parent, organization=org
        )
        parent = cat
    _category_cache[key] = parent
    return parent


def resolve_family(code: str, org) -> Family:
    """
    Resolve a family by code for the org.
    """
    global _family_cache
    if not code:
        return None
    key = (org.id, code.strip())
    if key in _family_cache:
        return _family_cache[key]
    try:
        fam = Family.objects.get(code=code.strip(), organization=org)
        _family_cache[key] = fam
        return fam
    except Family.DoesNotExist:
        return None


def upsert_product(row: dict, org) -> Product:
    """
    Create or update a product by SKU for the org.
    """
    sku = row.get('sku')
    if not sku:
        raise ValueError('SKU is required')
    prod, created = Product.objects.get_or_create(
        sku=sku, organization=org,
        defaults={
            'name': row.get('name'),
            'description': row.get('description'),
            'brand': row.get('brand'),
            'gtin': row.get('gtin'),
            'is_active': row.get('is_active', True),
            'tags': row.get('tags', []),
            'created_by': row.get('created_by'),
        }
    )
    # Update fields if not created
    if not created:
        for field in ['name', 'description', 'brand', 'gtin', 'is_active', 'tags']:
            if row.get(field) is not None:
                setattr(prod, field, row[field])
        prod.save()
    # Set category and family if present
    if row.get('category'):
        cat = resolve_category_breadcrumb(row['category'], org)
        if cat:
            prod.category = cat
    if row.get('family'):
        fam = resolve_family(row['family'], org)
        if fam:
            prod.family = fam
    prod.save()
    return prod


def attach_attribute_values(product: Product, attributes_json: dict, locale, channel):
    """
    Attach attribute values to a product, respecting locale and channel.
    """
    if not attributes_json:
        return
    for code, value in attributes_json.items():
        attr = Attribute.objects.filter(code=code, organization=product.organization).first()
        if not attr:
            logger.warning(f'Attribute {code} not found for org {product.organization}')
            continue
        av, _ = AttributeValue.objects.update_or_create(
            product=product, attribute=attr, locale=locale, channel=channel,
            defaults={'value': value}
        )


def attach_price_if_present(product: Product, amount: Decimal, channel, currency):
    """
    Attach a price to the product if amount is present.
    """
    if amount is None:
        return
    price_type = PriceType.objects.filter(is_default=True).first()
    if not price_type:
        price_type = PriceType.objects.get_or_create(code='STANDARD', defaults={'label': 'Standard'})[0]
    ProductPrice.objects.update_or_create(
        product=product, channel=channel, currency=currency, price_type=price_type,
        defaults={'amount': amount}
    ) 