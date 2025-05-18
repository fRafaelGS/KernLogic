# Imports App

This Django app provides functionality for bulk importing products from CSV and Excel files into the system. It's designed to handle large CSV files efficiently by processing them in chunks.

## Key Features

- **Optimized Performance**: Uses chunked processing to handle large CSV files (5,000+ rows) efficiently
- **Memory Efficient**: Processes data in batches to reduce memory consumption
- **Flexible Formats**: Supports both CSV and Excel file formats
- **Column Mapping**: Allows users to map source CSV column names to database fields
- **Error Handling**: Provides detailed error reports for failed imports
- **Progress Tracking**: Real-time progress tracking during import
- **Cancellation**: Ability to cancel in-progress imports
- **Preview**: Preview the first 10 rows of uploaded files before import
- **Partial Success**: Imports as many valid rows as possible, with detailed error reports

## API Endpoints

The app exposes the following REST API endpoints:

- **POST /api/imports/**: Create a new import task (with CSV/Excel file and column mapping)
- **GET /api/imports/**: List all import tasks for the current user
- **GET /api/imports/{id}/**: Get details for a specific import task
- **GET /api/imports/{id}/preview/**: Preview the first 10 rows of the CSV file
- **POST /api/imports/{id}/cancel/**: Cancel an in-progress import task
- **GET /api/imports/{id}/get_report/**: Download the error report for a failed import

## Field Schema API

The imports app provides a field schema endpoint that returns the canonical list of importable fields for products.

### Endpoint

```
GET /api/field-schema/
```

This endpoint returns a JSON array of field definitions, each with the following properties:

- `id`: Unique identifier for the field
- `label`: Human-readable label for the field
- `required`: Boolean indicating whether the field is required
- `type`: Field data type (string, text, breadcrumb, fk, json)

### Example Response

```json
[
  {
    "id": "sku",
    "label": "SKU",
    "required": true,
    "type": "string"
  },
  {
    "id": "name",
    "label": "Name",
    "required": false,
    "type": "string"
  }
]
```

### Frontend Usage

The frontend should use this endpoint to dynamically build the field mapping UI for CSV imports.
This ensures that any changes to the product data model are automatically reflected in the import interface.

### Implementation Note

The field schema endpoint is defined at `/api/field-schema/` rather than nested under `/api/imports/` for backward compatibility with the frontend.

## Implementation Details

The import process follows these steps:

1. **File Upload**: User uploads a CSV/Excel file and provides column mapping
2. **Task Creation**: A new `ImportTask` is created in the database
3. **Async Processing**: The task is processed asynchronously using Celery
4. **Chunked Processing**: Large files are read in chunks to reduce memory usage
5. **Batch Processing**: Valid rows are saved in batches (100 at a time) for efficiency
6. **Error Collection**: Errors are collected and saved to a report file
7. **Status Updates**: The task status is updated throughout the process

## Example Usage

### Create a new import task

```python
import requests
import json

# Prepare the column mapping (source CSV column -> database field)
mapping = {
    'Product Name': 'name',
    'SKU': 'sku',
    'Price': 'price',
    'Description': 'description',
    'Category': 'category'
}

# Upload the file
files = {'csv_file': open('products.csv', 'rb')}
data = {'mapping': json.dumps(mapping)}

response = requests.post(
    'http://localhost:8000/api/imports/',
    files=files,
    data=data,
    headers={'Authorization': 'Bearer <access_token>'}
)

print(f"Import task created: {response.json()}")
```

## Performance

The optimized implementation can handle:

- **5,000 rows** in approximately 60 seconds
- **10,000 rows** in approximately 120 seconds
- **50,000+ rows** by utilizing chunked processing and batch saving

## Error Handling

The app provides detailed error reporting for various scenarios:

- Invalid column mapping
- Missing required fields
- Data validation errors (e.g., invalid price format)
- Duplicate SKUs
- Database constraints
- File format errors

## Future Improvements

Planned improvements for future versions:

- Support for more file formats (JSON, XML)
- Template-based imports with saved mapping profiles
- Data transformation during import
- Scheduled/recurring imports
- Export functionality 