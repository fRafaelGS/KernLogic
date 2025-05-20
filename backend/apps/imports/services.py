# This file is maintained for backward compatibility but all functionality
# has been moved to the services/ directory. Please use the modular imports
# directly in new code.

# Import all functions from the modular services package
# to maintain backward compatibility
from .services.family_validation import (
    build_family_attribute_map,
    validate_family,
    validate_attribute_in_family,
    auto_attach_attribute_to_family,
    ERROR_FAMILY_UNKNOWN,
    ERROR_NOT_IN_FAMILY
)

from .services.product_services import (
    resolve_category_breadcrumb,
    resolve_family,
    upsert_product,
    attach_attribute_values,
    attach_price_if_present,
    process_tags
)

from .services.structure_services import (
    upsert_attribute_group,
    upsert_attribute,
    upsert_family,
    parse_attribute_header,
    attach_attribute_value_from_header
)

# Set up logging for backward compatibility
import logging
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
    Maps canonical 'gtin' field to model's 'barcode' field.
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
            'barcode': row.get('gtin'),  # Map gtin to barcode
            'is_active': row.get('is_active', True),
            'tags': row.get('tags', []),
            'created_by': row.get('created_by'),
        }
    )
    # Update fields if not created
    if not created:
        for field in ['name', 'description', 'brand', 'is_active', 'tags']:
            if row.get(field) is not None:
                setattr(prod, field, row[field])
        # Map gtin to barcode on update
        if row.get('gtin') is not None:
            prod.barcode = row['gtin']
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


def upsert_attribute_group(row: dict, org, created_by=None) -> AttributeGroup:
    """
    Create or update an attribute group for the organization.
    
    Args:
        row: Dictionary containing group data (code, label_en, sort_order)
        org: Organization instance
        created_by: User who initiated the import
        
    Returns:
        AttributeGroup instance
    
    Raises:
        ValueError: If code or label_en is missing
    """
    code = row.get('code')
    label = row.get('label_en')
    
    if not code:
        raise ValueError("Attribute group code is required")
    if not label:
        raise ValueError("Attribute group label is required")
    
    # Convert sort_order to integer if present
    sort_order = row.get('sort_order')
    if sort_order is not None:
        try:
            sort_order = int(sort_order)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid sort_order value: {sort_order}. Must be an integer.")
    else:
        sort_order = 0
        
    # Create or update the attribute group
    group, created = AttributeGroup.objects.update_or_create(
        organization=org,
        name=code,  # Using code as name for simplicity
        defaults={
            'order': sort_order,
            'created_by': created_by
        }
    )
    
    return group


def upsert_attribute(row: dict, org, created_by=None) -> Attribute:
    """
    Create or update an attribute for the organization.
    
    Args:
        row: Dictionary containing attribute data (code, type, group_code, etc.)
        org: Organization instance
        created_by: User who initiated the import
        
    Returns:
        Attribute instance
    
    Raises:
        ValueError: If required fields are missing or invalid
    """
    code = row.get('code')
    data_type = row.get('type')
    group_code = row.get('group_code')
    
    if not code:
        raise ValueError("Attribute code is required")
    if not data_type:
        raise ValueError("Attribute type is required")
    if not group_code:
        raise ValueError("Attribute group code is required")
    
    # Validate data_type
    if data_type not in ATTRIBUTE_TYPES:
        valid_types = ", ".join(ATTRIBUTE_TYPES)
        raise ValueError(f"Invalid attribute type: {data_type}. Must be one of: {valid_types}")
    
    # Validate validation_rule if present
    validation_rule = row.get('validation_rule')
    if validation_rule and validation_rule not in VALIDATION_RULES:
        valid_rules = ", ".join(VALIDATION_RULES)
        raise ValueError(f"Invalid validation rule: {validation_rule}. Must be one of: {valid_rules}")
    
    # Convert boolean fields
    is_localizable = str(row.get('is_localizable', '')).lower() in ('true', 'yes', '1', 'y')
    is_scopable = str(row.get('is_scopable', '')).lower() in ('true', 'yes', '1', 'y')
    
    # Get or create the attribute group
    try:
        group = AttributeGroup.objects.get(organization=org, name=group_code)
    except AttributeGroup.DoesNotExist:
        raise ValueError(f"Attribute group with code '{group_code}' does not exist. Please import attribute groups first.")
    
    # Create or update the attribute
    attribute, created = Attribute.objects.update_or_create(
        organization=org,
        code=code,
        defaults={
            'label': code,  # Using code as label for now
            'data_type': data_type,
            'is_localisable': is_localizable,
            'is_scopable': is_scopable,
            'created_by': created_by
        }
    )
    
    # Associate attribute with group if needed
    group_item, _ = AttributeGroupItem.objects.get_or_create(
        group=group,
        attribute=attribute,
        defaults={'order': 0}
    )
    
    return attribute


def upsert_family(row: dict, org, created_by=None) -> Family:
    """
    Create or update a product family and associate it with attributes.
    
    Args:
        row: Dictionary containing family data (code, label_en, attribute_codes)
        org: Organization instance
        created_by: User who initiated the import
        
    Returns:
        Family instance
    
    Raises:
        ValueError: If required fields are missing or invalid
    """
    code = row.get('code')
    label = row.get('label_en')
    attribute_codes_str = row.get('attribute_codes')
    
    if not code:
        raise ValueError("Family code is required")
    if not label:
        raise ValueError("Family label is required")
    if not attribute_codes_str:
        raise ValueError("Family attribute_codes is required")
    
    # Parse pipe-separated attribute codes
    attribute_codes = [code.strip() for code in attribute_codes_str.split('|') if code.strip()]
    if not attribute_codes:
        raise ValueError("At least one attribute code must be provided in attribute_codes")
    
    # Create or update the family
    family, created = Family.objects.update_or_create(
        organization=org,
        code=code,
        defaults={
            'label': label,
            'created_by': created_by
        }
    )
    
    # Process attribute codes and link them to the family
    # First, get all attribute groups for the specified attributes
    attribute_groups = {}
    for attr_code in attribute_codes:
        try:
            attribute = Attribute.objects.get(organization=org, code=attr_code)
            # Find the group for this attribute via AttributeGroupItem
            group_items = AttributeGroupItem.objects.filter(attribute=attribute)
            if group_items.exists():
                group = group_items.first().group
                if group.id not in attribute_groups:
                    attribute_groups[group.id] = group
        except Attribute.DoesNotExist:
            raise ValueError(f"Attribute with code '{attr_code}' does not exist. Please import attributes first.")
    
    # Associate each group with the family
    for group in attribute_groups.values():
        FamilyAttributeGroup.objects.update_or_create(
            family=family,
            attribute_group=group,
            organization=org,
            defaults={'required': False}
        )
    
    return family


def parse_attribute_header(header: str):
    """
    Parse an attribute header based on Akeneo-style convention.
    Format: <attribute_code>-<locale?>-<channel?>
    
    Args:
        header (str): The header string to parse
    
    Returns:
        tuple: (attribute_code, locale_code, channel_code)
    """
    parts = header.split('-')
    
    if len(parts) == 1:
        # Just attribute code, no locale or channel
        return parts[0], None, None
    elif len(parts) == 2:
        # Attribute code and locale, no channel
        return parts[0], parts[1], None
    elif len(parts) == 3:
        # Full specification
        attr_code, locale, channel = parts
        # Handle empty locale or channel (indicated by --)
        locale = None if not locale else locale
        channel = None if not channel else channel
        return attr_code, locale, channel
    else:
        # Invalid format
        raise ValueError(f"Invalid attribute header format: {header}")


def attach_attribute_value_from_header(product, header, value, org):
    """
    Attach an attribute value to a product based on parsed header.
    
    Args:
        product (Product): The product to attach the value to
        header (str): The attribute header
        value: The value to set
        org: The organization
        
    Returns:
        AttributeValue: The created or updated attribute value
    
    Raises:
        ValueError: If attribute doesn't exist or header format is invalid
    """
    # Parse header
    attr_code, locale_code, channel_code = parse_attribute_header(header)
    
    # Get attribute
    try:
        attribute = Attribute.objects.get(organization=org, code=attr_code)
    except Attribute.DoesNotExist:
        raise ValueError(f"Attribute '{attr_code}' does not exist")
    
    # Get locale if specified
    locale = None
    if locale_code:
        try:
            locale = Locale.objects.get(organization=org, code=locale_code)
        except Locale.DoesNotExist:
            raise ValueError(f"Locale '{locale_code}' does not exist")
    
    # Get channel if specified
    channel = None
    if channel_code:
        try:
            channel = SalesChannel.objects.get(organization=org, code=channel_code)
        except SalesChannel.DoesNotExist:
            raise ValueError(f"Channel '{channel_code}' does not exist")
    
    # Validate that attribute can have locale/channel if specified
    if locale and not attribute.is_localisable:
        raise ValueError(f"Attribute '{attr_code}' is not localizable but locale '{locale_code}' was specified")
    
    if channel and not attribute.is_scopable:
        raise ValueError(f"Attribute '{attr_code}' is not scopable but channel '{channel_code}' was specified")
    
    # Create or update the attribute value
    av, created = AttributeValue.objects.update_or_create(
        product=product,
        attribute=attribute,
        organization=org,
        locale=locale,
        channel=channel_code,  # Using code string directly as in the model
        defaults={'value': value}
    )
    
    return av 