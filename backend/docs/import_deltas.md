# Import System Changes

## Schema Versions

### V2 Schema: Use family_code (legacy family deprecated)

Starting with V2 of the import schema, the `family_code` field should be used instead of `family`. 
The legacy `family` field is deprecated but supported for backward compatibility.

When mapping columns in the import wizard, map your family column to `family_code`:

```json
{
  "mapping": {
    "sku": "sku",
    "name": "name",
    "family_code": "family_code",  // Preferred way to map family
    // ... other fields
  }
}
```

### Family Column Mapping in the Wizard

**Important:** If your CSV/Excel file has a column named "family" (not "family_code"), you should still map it to the system field "Family" (which internally uses family_code). The correct mapping would be:

```json
{
  "mapping": {
    "family_code": "family"  // Maps Excel column 'family' to system field 'family_code'
  }
}
```

### Field Schema API

The field schema API provides the canonical schema for importable fields. As of May 2023:

- `/api/imports/field-schema/?v=2` - Returns the V2 schema (recommended)
- `/api/imports/field-schema/` - Returns the V1 schema (deprecated)

The V1 schema has been modified to use `family_code` instead of `family` to avoid inconsistencies.
In new implementations, always use the V2 schema.

### Attribute Mapping

Attributes are automatically mapped by column names that match the format:
- `attribute_code`
- `attribute_code-locale`
- `attribute_code-locale-channel`

For example:
- `weight` → Value for default locale/channel
- `weight-es_ES` → Spanish locale value
- `weight-es_ES-web` → Spanish locale for web channel

#### Attribute Header Default Behavior

When attribute headers don't specify a locale or channel, the system uses the organization defaults:

1. **Default Locale**:
   - If the attribute header doesn't include a locale (e.g., just `weight`), the system uses the organization's default locale.
   - If the organization has no default locale, it falls back to the locale specified in the row mapping.

2. **Default Channel**:
   - If the attribute header doesn't include a channel, the system uses the organization's default channel.
   - If the organization has no default channel, it falls back to the channel specified in the row mapping.

This ensures attributes are always associated with the correct locale and channel for your organization.

### Family-Attribute Validation

Products with a family will have their attributes validated against the family definition.
Attributes not associated with the family will cause validation errors.

## Import Best Practices

1. Always include the `family_code` field for products with attributes
2. Format attribute names correctly: all lowercase, underscores for spaces (e.g., `bruto_weight`)
3. Properly escape values with commas inside
4. Use the standard locale and channel codes configured in your organization 