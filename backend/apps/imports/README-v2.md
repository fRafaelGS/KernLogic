# Product Import Validation Enhancements (V2)

This document outlines the enhanced product import validation system that handles the relationships between products, families, and attributes.

## Key Features

### 1. Family Validation
- Products with family references are validated to ensure the family exists in the database
- Provides the error code `FAMILY_UNKNOWN` if the family does not exist

### 2. Attribute-Family Validation
- Validates that attributes assigned to a product are allowed for that product's family
- Provides the error code `ATTRIBUTE_NOT_IN_FAMILY` if an attribute is not associated with the family

### 3. Relaxed Template Mode
- Configurable via the `IMPORT_RELAX_TEMPLATE` setting in `constants.py`
- When enabled, attributes not currently in a family will be auto-attached to the family
- Family version is incremented when attributes are auto-attached
- Useful for dynamic template evolution during initial data setup

### 4. Attribute Column Detection
- Automatically detects and processes attribute columns in the format: `attribute_code-locale-channel`
- Both locale and channel parts are optional (defaults to organization defaults)
- Supports direct value import without needing to use JSON attribute objects

## Configuration Options

### IMPORT_RELAX_TEMPLATE
- Set to `True` to auto-attach attributes to families when they are not already associated
- Set to `False` (default) for strict validation that rejects attributes not in the family

## Error Codes

- `FAMILY_UNKNOWN`: The specified family code does not exist
- `ATTRIBUTE_NOT_IN_FAMILY`: The attribute is not associated with the specified family

## Usage Example

### Import CSV with Attributes

```csv
sku,name,family,color,size,weight
SKU001,Widget A,electronics,Red,Large,2.5
SKU002,Widget B,electronics,Blue,Medium,1.5
```

With the mapping:
```json
{
  "sku": "sku",
  "name": "name",
  "family": "family"
}
```

The attributes `color`, `size`, and `weight` will be automatically detected and processed if they are associated with the `electronics` family.

### Import with Localized Attributes

```csv
sku,name,family,color-en_US,color-fr_FR,size
SKU003,Widget C,electronics,Red,Rouge,Large
```

This will create two separate attribute values for `color` with different locales.

## Implementation Details

The validation logic is implemented in the following files:

- `apps/imports/services/family_validation.py`: Core validation functions
- `apps/imports/constants.py`: Configuration settings and error codes
- `apps/imports/tasks.py`: Updated import task with validation logic

## Testing

Unit and integration tests are available in:
- `apps/imports/tests/test_family_validation.py`: Unit tests for validation functions
- `apps/imports/tests/test_import_family_validation.py`: Integration tests for the import task with validation 