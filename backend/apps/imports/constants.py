"""
Constants for the import app.
Defines the canonical schema for importable product fields.
"""

import re

# Configuration flags
IMPORT_RELAX_TEMPLATE = False  # If True, attributes missing from families will be auto-attached

# Error codes for import validation
ERROR_CODES = {
    "FAMILY_UNKNOWN": "Family does not exist",
    "ATTRIBUTE_NOT_IN_FAMILY": "Attribute is not associated with the product's family",
    "INVALID_DATATYPE": "Value does not match the attribute data type",
    "INVALID_LOCALE": "Locale is not valid for this organization",
    "INVALID_CHANNEL": "Channel is not valid for this organization",
    "DUPLICATE_SKU": "SKU already exists",
    "DUPLICATE_SKU_SKIPPED": "Duplicate SKU skipped per policy setting",
}

# Canonical schema of importable fields
# This is the single source of truth for what fields can be imported
# and their properties (required, type, etc.)

# V1 SCHEMA IS DEPRECATED - This is kept only for backwards compatibility
# The content is now identical to V2 to avoid the family/family_code mismatch
FIELD_SCHEMA = [
    {"id": "sku", "label": "SKU", "required": True, "type": "string"},
    {"id": "name", "label": "Name", "required": False, "type": "string"},
    {"id": "family_code", "label": "Family", "required": False, "type": "fk"},
    {"id": "description", "label": "Description", "required": False, "type": "text"},
    {"id": "gtin", "label": "GTIN", "required": False, "type": "string"},
    {"id": "brand", "label": "Brand", "required": False, "type": "string"},
    {"id": "category", "label": "Category", "required": False, "type": "breadcrumb"},
    {"id": "channel", "label": "Channel", "required": False, "type": "fk"},
    {"id": "locale", "label": "Locale", "required": False, "type": "fk"},
    {"id": "tags", "label": "Tags", "required": False, "type": "json"},
]

# V2 of the field schema for product imports - reintroducing family_code
FIELD_SCHEMA_V2 = [
    {"id": "sku", "label": "SKU", "required": True, "type": "string"},
    {"id": "name", "label": "Name", "required": False, "type": "string"},
    {"id": "family_code", "label": "Family", "required": False, "type": "fk"},
    {"id": "description", "label": "Description", "required": False, "type": "text"},
    {"id": "gtin", "label": "GTIN", "required": False, "type": "string"},
    {"id": "brand", "label": "Brand", "required": False, "type": "string"},
    {"id": "category", "label": "Category", "required": False, "type": "breadcrumb"},
    {"id": "channel", "label": "Channel", "required": False, "type": "fk"},
    {"id": "locale", "label": "Locale", "required": False, "type": "fk"},
    {"id": "tags", "label": "Tags", "required": False, "type": "json"},
]

# Schema for attribute groups import
ATTRIBUTE_GROUP_SCHEMA = [
    {"id": "code", "label": "Code", "required": True, "type": "string"},
    {"id": "label_en", "label": "Label (English)", "required": True, "type": "string"},
    {"id": "sort_order", "label": "Sort Order", "required": False, "type": "integer"},
]

# Schema for attributes import
ATTRIBUTE_SCHEMA = [
    {"id": "code", "label": "Code", "required": True, "type": "string"},
    {"id": "type", "label": "Type", "required": True, "type": "string"},
    {"id": "group_code", "label": "Attribute Group Code", "required": True, "type": "string"},
    {"id": "is_localizable", "label": "Is Localizable", "required": False, "type": "boolean"},
    {"id": "is_scopable", "label": "Is Scopable", "required": False, "type": "boolean"},
    {"id": "validation_rule", "label": "Validation Rule", "required": False, "type": "string"},
]

# Schema for families import
FAMILY_SCHEMA = [
    {"id": "code", "label": "Code", "required": True, "type": "string"},
    {"id": "label_en", "label": "Label (English)", "required": True, "type": "string"},
    {"id": "attribute_codes", "label": "Attribute Codes", "required": True, "type": "string"},
]

# Valid attribute types
ATTRIBUTE_TYPES = [
    'text', 'number', 'boolean', 'date', 'select', 'rich_text', 
    'price', 'media', 'measurement', 'url', 'email', 'phone'
]

# Common validation rules
VALIDATION_RULES = [
    'none', 'email', 'url', 'numeric', 'integer', 'date', 'regex'
]

# Regex for valid attribute headers format: <attr_code>-<locale?>-<channel?>
# Examples: color, color-en_US, color-en_US-web
ATTRIBUTE_HEADER_REGEX = re.compile(r"^[a-z0-9_]+(?:-[a-z]{2}_[A-Z]{2})?(?:-[a-z0-9]+)?$") 