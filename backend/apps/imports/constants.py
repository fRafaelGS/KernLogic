"""
Constants for the import app.
Defines the canonical schema for importable product fields.
"""

# Canonical schema of importable fields
# This is the single source of truth for what fields can be imported
# and their properties (required, type, etc.)
FIELD_SCHEMA = [
    {"id": "sku", "label": "SKU", "required": True, "type": "string"},
    {"id": "name", "label": "Name", "required": False, "type": "string"},
    {"id": "description", "label": "Description", "required": False, "type": "text"},
    {"id": "gtin", "label": "GTIN", "required": False, "type": "string"},
    {"id": "brand", "label": "Brand", "required": False, "type": "string"},
    {"id": "category", "label": "Category", "required": False, "type": "breadcrumb"},
    {"id": "family", "label": "Family", "required": False, "type": "fk"},
    {"id": "attribute_group", "label": "Attribute Group", "required": False, "type": "fk"},
    {"id": "attributes", "label": "Attributes", "required": False, "type": "json"},
    {"id": "channel", "label": "Channel", "required": False, "type": "fk"},
    {"id": "locale", "label": "Locale", "required": False, "type": "fk"},
    {"id": "tags", "label": "Tags", "required": False, "type": "json"},
] 