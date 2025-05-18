import logging
from django.db import transaction
from products.models import Attribute, AttributeGroup, Family, AttributeGroupItem, FamilyAttributeGroup
from ..constants import ATTRIBUTE_TYPES, VALIDATION_RULES
from ..models import ImportTask
from products.models import (
    AttributeGroup,
    Attribute,
    Family,
    AttributeGroupItem,
    FamilyAttributeGroup,
    SalesChannel,
    Locale
)
import pandas as pd
import numpy as np
import time

logger = logging.getLogger(__name__)

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
    
    # Validate data type
    if data_type not in ATTRIBUTE_TYPES:
        valid_types = ", ".join(ATTRIBUTE_TYPES)
        raise ValueError(f"Invalid attribute type: {data_type}. Must be one of: {valid_types}")
    
    # Find or create the attribute group
    try:
        group = AttributeGroup.objects.get(name=group_code, organization=org)
    except AttributeGroup.DoesNotExist:
        raise ValueError(f"Attribute group with code '{group_code}' does not exist")
    
    # Convert is_localizable and is_scopable to booleans
    is_localizable = row.get('is_localizable', False)
    if isinstance(is_localizable, str):
        is_localizable = is_localizable.lower() in ('true', 'yes', '1', 't')
    
    is_scopable = row.get('is_scopable', False)
    if isinstance(is_scopable, str):
        is_scopable = is_scopable.lower() in ('true', 'yes', '1', 't')
    
    # Create or update the attribute
    attr, created = Attribute.objects.update_or_create(
        organization=org,
        code=code,
        defaults={
            'label': code.replace('_', ' ').title(),  # Generate a human-readable label
            'data_type': data_type,
            'is_localisable': is_localizable,
            'is_scopable': is_scopable,
            'created_by': created_by
        }
    )
    
    # Associate the attribute with the group if not already associated
    if not AttributeGroupItem.objects.filter(attribute=attr, group=group).exists():
        # Get the highest existing order in this group
        try:
            max_order = AttributeGroupItem.objects.filter(group=group).order_by('-order')[0].order
        except IndexError:
            max_order = 0
            
        # Create the group item with the next order
        AttributeGroupItem.objects.create(
            attribute=attr,
            group=group,
            order=max_order + 1
        )
    
    return attr


def upsert_family(row: dict, org, created_by=None) -> Family:
    """
    Create or update a product family for the organization.
    Also creates the attribute associations.
    
    Args:
        row: Dictionary containing family data (code, label_en, attribute_codes)
        org: Organization instance
        created_by: User who initiated the import
        
    Returns:
        Family instance
    
    Raises:
        ValueError: If required fields are missing
    """
    code = row.get('code')
    label = row.get('label_en')
    attribute_codes = row.get('attribute_codes')
    
    if not code:
        raise ValueError("Family code is required")
    if not label:
        raise ValueError("Family label is required")
    if not attribute_codes:
        raise ValueError("Family attribute codes are required")
    
    # Parse attribute codes (handle different formats)
    if isinstance(attribute_codes, str):
        # Try splitting by different delimiters
        if '|' in attribute_codes:
            attr_codes = [c.strip() for c in attribute_codes.split('|') if c.strip()]
        elif ',' in attribute_codes:
            attr_codes = [c.strip() for c in attribute_codes.split(',') if c.strip()]
        else:
            # Single attribute code
            attr_codes = [attribute_codes.strip()]
    elif isinstance(attribute_codes, list):
        attr_codes = attribute_codes
    else:
        raise ValueError(f"Invalid attribute_codes format: {type(attribute_codes)}")
    
    # Create or update the family
    with transaction.atomic():
        family, created = Family.objects.update_or_create(
            organization=org,
            code=code,
            defaults={
                'label': label,
                'created_by': created_by
            }
        )
        
        # Get all attributes referenced by code
        attributes = list(Attribute.objects.filter(organization=org, code__in=attr_codes))
        
        # Check if all attribute codes were found
        found_codes = {attr.code for attr in attributes}
        missing_codes = set(attr_codes) - found_codes
        if missing_codes:
            logger.warning(f"Attributes not found for family {code}: {', '.join(missing_codes)}")
        
        # Get all groups containing these attributes
        group_ids = AttributeGroupItem.objects.filter(
            attribute__in=attributes
        ).values_list('group_id', flat=True).distinct()
        
        groups = AttributeGroup.objects.filter(id__in=group_ids)
        
        # Create family-attribute group associations if they don't exist
        for group in groups:
            FamilyAttributeGroup.objects.get_or_create(
                family=family,
                attribute_group=group,
                organization=org,
                defaults={'required': False}
            )
        
        # Increment the family version
        family.version = (family.version or 1) + 1
        family.save()
    
    return family

def parse_attribute_header(header: str):
    """
    Parse an attribute header based on Akeneo-style convention.
    Format: <attribute_code>-<locale?>-<channel?>
    
    Also supports more complex formats with locale display names.
    
    Args:
        header (str): The header string to parse
    
    Returns:
        tuple: (attribute_code, locale_code, channel_code)
    """
    # First check if this might be a "Display Name (code)" format
    locale_match = None
    channel_match = None
    
    # Handle special case with display name format: attr-Language (code)-channel
    if '(' in header and ')' in header:
        parts = header.split('-')
        attr_code = parts[0]
        
        # Process remaining parts looking for locale and channel
        for i in range(1, len(parts)):
            part = parts[i]
            if '(' in part and ')' in part:
                # This looks like a locale with display name
                locale_match = part
            else:
                # This might be a channel
                channel_match = part
        
        return attr_code, locale_match, channel_match
    
    # Standard parsing for normal attribute headers
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
        # Invalid format - try a best-effort approach
        attr_code = parts[0]
        locale = parts[1] if len(parts) > 1 else None
        channel = parts[2] if len(parts) > 2 else None
        return attr_code, locale, channel


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