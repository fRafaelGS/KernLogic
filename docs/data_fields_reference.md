# KernLogic - Field Reference

This document serves as a central reference for all data fields used across the KernLogic application. It outlines how fields are used in different contexts (Products Table, Product Detail, Import Page) and the relationships between them.

## Product Fields Overview

| Field Name | Data Type | Required | Description | Used In |
|------------|-----------|----------|-------------|---------|
| `id` | number | Auto | Unique identifier for the product | All views (hidden) |
| `name` | string | Yes | Product name/title | All views |
| `description` | string | No | Detailed product description | Product Detail |
| `sku` | string | Yes | Stock Keeping Unit - unique product identifier | All views |
| `price` | number | Yes | Product price | All views |
| `category` | string | No | Product category | All views |
| `brand` | string | No | Product manufacturer/brand | Products Table, Product Detail |
| `barcode` | string | No | GTIN/UPC/EAN barcode | Products Table, Product Detail |
| `tags` | string[] | No | Array of keyword tags | Products Table, Product Detail |
| `is_active` | boolean | Yes | Product status (active/inactive) | All views |
| `images` | ProductImage[] | No | Array of product images | Product Detail |
| `primary_image_thumb` | string | No | URL to thumbnail of primary image | Products Table, Product Detail |
| `primary_image_large` | string | No | URL to full-size primary image | Product Detail |
| `created_by` | string | Auto | Username who created the product | Product Detail |
| `created_at` | string (ISO date) | Auto | Creation timestamp | Products Table, Product Detail |
| `updated_at` | string (ISO date) | Auto | Last modification timestamp | Products Table, Product Detail |

## Field Usage Contexts

### Products Table View

The Products Table view shows a condensed list of all products with the following fields:

- Thumbnail (from `primary_image_thumb` or first image in `images` array)
- SKU
- Name
- Category
- Brand
- Tags (truncated with "+X more" if many)
- GTIN (barcode)
- Price
- Status (from `is_active`)
- Created date
- Last modified date
- Actions (view, edit, delete)

### Product Detail View

The Product Detail view is divided into several sections:

#### Main Header
- Name
- Status badge (from `is_active`)

#### Description Section
- Description (with rich text editor)

#### Sidebar
- Primary Image (from `primary_image_thumb`/`primary_image_large` or first in `images`)
- SKU (with copy button)
- Name
- Category
- Brand
- Tags (with hover for overflow)
- GTIN (with validation indicator)
- Price (with history tooltip)
- Status badge
- Created information (date and user)
- Last modified information (date and user)

#### Tabs
1. **Overview Tab**
   - Data completeness tracker
   - Core information (duplicates sidebar)
   
2. **Attributes Tab**
   - Technical specifications
   - Custom attributes

3. **Assets Tab**
   - All product images/files
   - Upload functionality
   - Set primary image functionality

4. **History Tab**
   - Activity log
   - Version history

### Import Page

The Import Page allows bulk import of products via CSV/Excel with the following mappable fields:

- SKU (required)
- Name (required)
- Description
- Price (required)
- Category
- Brand
- Barcode
- Tags (comma-separated)
- Status (active/inactive)
- Image URLs

## Field Relationships

### Primary Keys and Identifiers
- `id`: Backend primary key (auto-generated)
- `sku`: Business/user-facing unique identifier

### Hierarchical Relationships
- Product → Category (many-to-one)
- Product → Brand (many-to-one)
- Product → Tags (many-to-many)
- Product → Images (one-to-many)

### Derived Fields
- `is_active` → Status badge display
- `price` → Formatted price display with currency symbol
- `primary_image_thumb`/`primary_image_large` → Derived from first image marked as primary in the `images` array

## Interface Definitions

```typescript
// Core Product interface
export interface Product {
  id?: number;
  name: string;
  description: string;
  sku: string;
  price: number;
  category: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
  images?: ProductImage[] | null;
  primary_image_thumb?: string;
  primary_image_large?: string;
  brand?: string;
  tags?: string[];
  barcode?: string;
  attributes?: Record<string, string>;
}

// Product Image interface
export interface ProductImage {
  id: number;
  url: string;
  order: number;
  is_primary: boolean;
}

// Product Asset interface (extended image/file)
export interface ProductAsset {
  id: number;
  name: string;
  type: string;
  url: string;
  size: string;
  uploaded_by: string;
  uploaded_at: string;
  is_primary?: boolean;
  archived?: boolean;
}
```

## Data Validation Rules

| Field | Validation Rules |
|-------|------------------|
| `name` | Required, max 255 characters |
| `sku` | Required, unique per user, alphanumeric + dash/underscore |
| `price` | Required, non-negative decimal number |
| `barcode` | Optional, valid GTIN-8/12/13 format with checksum validation |
| `is_active` | Required boolean |

## Import Mapping

During CSV/Excel import, columns are mapped as follows:

| CSV Column | Product Field | Notes |
|------------|---------------|-------|
| SKU | `sku` | Required, must be unique |
| Name | `name` | Required |
| Description | `description` | Optional, HTML supported |
| Price | `price` | Required, decimal format |
| Category | `category` | Optional |
| Brand | `brand` | Optional |
| Barcode | `barcode` | Optional, validated |
| Tags | `tags` | Optional, comma-separated list |
| Status | `is_active` | Optional, defaults to active (true) |
| Image URL | Used to download and create `images` | Optional |

## Common Actions and Field Impacts

| Action | Fields Affected | Side Effects |
|--------|-----------------|--------------|
| Create Product | All fields | `created_at` and `created_by` set automatically |
| Update Product | Changed fields | `updated_at` updated automatically |
| Upload Image | `images` array | If first image or marked primary, updates `primary_image_thumb` and `primary_image_large` |
| Bulk Category Change | `category` | Updates `updated_at` for all affected products |
| Bulk Tag Addition | `tags` array | Appends to existing tags, updates `updated_at` |
| Bulk Status Change | `is_active` | Updates `updated_at` for all affected products |

---

This document will be updated as the application evolves and new fields are added. 