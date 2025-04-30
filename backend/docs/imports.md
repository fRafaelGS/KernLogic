# Product Imports Documentation

This document describes the product import functionality in KernLogic, including the bulk import feature and handling of duplicate SKUs.

## Overview

The import feature allows users to bulk upload products via CSV or Excel files. The system handles column mapping, validation, and error reporting to streamline the import process.

## Import Process

1. **File Upload**: User uploads a CSV or Excel file with product data.
2. **Column Mapping**: System maps file columns to product fields either automatically or through user-defined mappings.
3. **Validation**: Data is validated against required fields and data type constraints.
4. **Processing**: Valid data is imported into the system, with duplicate detection and handling according to user preferences.
5. **Reporting**: Import results, including success counts and errors, are presented to the user.

## Handling Duplicate SKUs

The system provides three strategies for handling duplicate SKUs during import:

### 1. Skip (Default)

- Any row with a SKU that already exists in the database will be skipped.
- New products are created for unique SKUs.
- Error reports will indicate which rows were skipped due to duplicate SKUs.

### 2. Overwrite

- Existing products will be updated with the new data from the import.
- All fields specified in the import will overwrite the current values.
- Fields not included in the import will remain unchanged.

### 3. Abort

- If any duplicate SKUs are detected, the entire import process will be cancelled.
- No changes will be made to the database.
- An error report will be provided listing all duplicate SKUs found.

## Pre-Flight SKU Check

Before performing a full import, the API provides a way to check which SKUs already exist in the database:

```http
POST /products/sku-check/
Content-Type: application/json

{
  "skus": ["SKU001", "SKU002", "SKU003"]
}
```

Response:

```json
{
  "duplicates": ["SKU001", "SKU002"]
}
```

This allows the UI to provide feedback and options to the user before proceeding with the import.

## API Endpoints

### Check for Duplicate SKUs

```
POST /products/sku-check/
```

Request body:
```json
{
  "skus": ["SKU001", "SKU002", "SKU003"]
}
```

Response:
```json
{
  "duplicates": ["SKU001"]
}
```

### Create Import Task

```
POST /imports/
```

Request body (multipart/form-data):
- `csv_file`: The CSV or Excel file to import
- `mapping`: JSON object mapping file columns to product fields
- `duplicate_strategy`: One of "skip", "overwrite", or "abort" (defaults to "skip")

Response:
```json
{
  "id": 123,
  "status": "queued",
  "status_display": "Queued",
  "processed": 0,
  "total_rows": null
}
```

### Get Import Task Status

```
GET /imports/{id}/
```

Response:
```json
{
  "id": 123,
  "status": "success",
  "status_display": "Success",
  "processed": 100,
  "total_rows": 100,
  "progress_percentage": 100,
  "execution_time": 1.5,
  "error_file": null,
  "created_at": "2023-06-01T12:00:00Z"
}
```

## Error Handling

The import system provides detailed error reports for issues encountered during import:

1. **Validation Errors**: When product data fails validation (e.g., missing required fields, invalid data types).
2. **Duplicate SKUs**: When duplicate SKUs are encountered and need to be reported.
3. **Database Errors**: When database constraints or other database-related errors occur.

Error reports are available via the API and can be downloaded for review. 