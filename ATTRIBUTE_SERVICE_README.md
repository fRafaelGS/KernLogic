# Attribute Service Locale/Channel Handling

## Background

Our application needs to handle locales (languages) and channels (sales/distribution channels) for product attributes. A key challenge is that different API endpoints expect different parameter formats:

1. Some endpoints expect string codes (`locale='en_US'`, `channel='ecommerce'`)
2. Others expect numeric IDs (`locale_id=1`, `channel_id=2`)

## Implementation Details

### Core Functionality

- **Organization defaults**: The app fetches and caches organization default locale and channel
- **Code-to-ID mapping**: Helper functions convert locale/channel codes to numeric IDs
- **Parameter handling**: Each API method formats parameters appropriately for its endpoint

### API Parameter Format by Endpoint

| Endpoint | Method | Locale Format | Channel Format |
|----------|--------|--------------|---------------|
| `/products/{id}/attributes/` | GET | `locale` (string code) | `channel` (string code) |
| `/products/{id}/attribute-groups/` | GET | `locale_id` (numeric) | `channel_id` (numeric) |
| `/products/{id}/attributes/` | POST | `locale_id` (numeric) | `channel_id` (numeric) |
| `/products/{id}/attributes/{valueId}/` | PATCH | `locale_id` (numeric) | `channel_id` (numeric) |

### Caching Strategy

To minimize API calls, we implement caching at multiple levels:

1. **Organization defaults**: Cache the organization's default locale and channel
2. **Locale mapping**: Cache the mapping between locale codes and IDs
3. **Channel mapping**: Cache the mapping between channel codes and IDs

## Testing

A test script (`test_attribute_service.js`) is available to verify:
- Code-to-ID conversion
- Correct parameter formatting for different requests
- Attribute value creation with proper locale_id/channel_id

## Common Issues

- **"Field 'id' expected a number but got 'en_US'"**: This occurs when a string code is passed to an endpoint expecting a numeric ID
- **"Object of type Locale is not JSON serializable"**: This happens when a Locale object is passed directly instead of its ID

## Best Practices

When adding new methods:
1. Check whether the endpoint expects string codes or numeric IDs
2. Use the appropriate parameter names (`locale` vs `locale_id`, `channel` vs `channel_id`)
3. Convert codes to IDs when needed using the provided helper functions 