# Prices App

This Django app provides a robust pricing system for products in KernLogic.

## Models

### Currency
- Represents the currencies used for product pricing
- ISO 4217 compliant (USD, EUR, etc.)
- Contains symbol, name, and decimal precision
- Linked to organization for multi-tenant support

### PriceType
- Defines different price types (e.g., retail, wholesale, MSRP)
- Each organization can create its own custom price types
- Slugified code for API usage

### ProductPrice
- Represents a specific price for a product
- Links to Product, PriceType, and Currency
- Optional link to SalesChannel
- Supports time-based pricing with valid_from/valid_to
- Organization-scoped for multi-tenant support

## API Endpoints

- `/api/currencies/` - List and manage currencies
- `/api/price-types/` - List and manage price types
- `/api/product-prices/` - List and manage product prices

## Usage Examples

### Get prices for a product
```
GET /api/product-prices/?product=123
```

### Create a new price type
```
POST /api/price-types/
{
  "code": "wholesale",
  "label": "Wholesale Price"
}
```

### Add a price to a product
```
POST /api/product-prices/
{
  "product": 123,
  "price_type": 1,
  "currency": "USD",
  "amount": "99.99",
  "valid_from": "2023-01-01T00:00:00Z"
}
``` 