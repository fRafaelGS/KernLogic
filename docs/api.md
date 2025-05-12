# KernLogic API Documentation

## Deprecated Endpoints

The following endpoints have been deprecated and will return 410 Gone status codes:

### Products Price History

```
GET /api/products/{product_pk}/price-history/
```

**Deprecated**: This endpoint has been removed. Please use the `/history/` endpoint instead, which provides more comprehensive change history including price changes.

Example response:
```json
{
  "detail": "The /price-history/ endpoint is deprecated. Please use /history/ instead."
}
```

### Products Versions 

```
GET /api/products/{product_pk}/versions/
```

**Deprecated**: This endpoint has been removed. Please use the `/history/` endpoint instead, which provides a unified history view with all product changes.

Example response:
```json
{
  "detail": "The /versions/ endpoint is deprecated. Please use /history/ instead."
}
```

## Recommended Alternatives

### Product History

```
GET /api/products/{product_pk}/history/
```

This endpoint provides a comprehensive history of all changes to a product, including:
- Price changes
- Product updates
- Asset additions/removals
- Status changes
- And more

Example response:
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "event_type": "updated",
      "summary": "Product was updated",
      "payload": {
        "changes": {
          "price": {
            "old": 75.00,
            "new": 100.00
          },
          "name": {
            "old": "Original Product",
            "new": "Test Product"
          }
        }
      },
      "created_at": "2023-01-01T00:00:00Z",
      "created_by_name": "Test User"
    }
  ]
}
``` 