"""
Services package for the imports app. 

This modular approach organizes services by functionality:
- product_services.py: Product import and manipulation functions
- structure_services.py: Functions for managing attribute groups, attributes, and families
- family_validation.py: Functions for validating family and attribute relationships

The legacy monolithic services.py file is maintained for backward compatibility,
but it now imports and re-exports functions from this modular structure.
For new code, please import directly from these modules.
"""

# Import all functions that should be available directly from the services package
from .family_validation import (
    build_family_attribute_map,
    validate_family,
    validate_attribute_in_family,
    auto_attach_attribute_to_family,
    ERROR_FAMILY_UNKNOWN,
    ERROR_NOT_IN_FAMILY
)

# Import from product_services.py
from .product_services import (
    resolve_category_breadcrumb,
    resolve_family,
    upsert_product,
    attach_attribute_values,
    attach_price_if_present,
    process_tags
)

# Import from structure_services.py
from .structure_services import (
    upsert_attribute_group,
    upsert_attribute,
    upsert_family,
    parse_attribute_header,
    attach_attribute_value_from_header
) 