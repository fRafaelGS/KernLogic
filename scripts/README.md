# KernLogic Schema and Configuration Scripts

This directory contains scripts to extract schema information from the OpenAPI specification and fetch live configuration data from the API.

## Prerequisites

Ensure you have Node.js (v14 or later) and npm installed.

### Install Dependencies

Run the following commands to install the required dependencies:

```bash
# Install JavaScript dependencies for dumpSchemas.js
npm install js-yaml

# Install TypeScript dependencies for fetchLiveConfig.ts
npm install typescript ts-node axios dotenv @types/node
```

## Available Scripts

### 1. Schema Documentation Generator

The `dumpSchemas.js` script extracts schema information from the OpenAPI specification and generates a markdown file with tables for each schema.

#### Usage

```bash
node scripts/dumpSchemas.js
```

#### Output

The script generates a markdown file at `docs/data-model.md` that contains:

- A table of contents with links to each schema section
- A section for each schema with a table of its properties, including:
  - Field name
  - Data type
  - Description (if available)
- Lists of required fields for each schema

Example output in `docs/data-model.md`:

```markdown
# KernLogic Data Model

This document was automatically generated from the OpenAPI specification.

## Table of Contents

- [Product](#schema-product)
- [Attribute](#schema-attribute)
...

## Schema: Product

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | integer | The unique identifier for the product |
| name | string | The name of the product |
...

**Required fields:** id, name, sku
```

### 2. Live Configuration Fetcher

The `fetchLiveConfig.ts` script fetches configuration data from the live API and saves it to JSON files.

#### Prerequisites

Make sure the environment variables are set up correctly:

1. Create or update a `.env` file in the project root with:
   ```
   PRODUCTS_API_BASE_URL=/api
   SERVICE_JWT_TOKEN=your-jwt-token
   ```

2. Replace `your-jwt-token` with a valid JWT token for authentication.

#### Usage

```bash
npx ts-node scripts/fetchLiveConfig.ts
```

#### Output

The script generates the following JSON files in the `fixtures` directory:

- `families.json`: List of all product families
- `attribute-groups.json`: List of all attribute groups
- `attributes.json`: List of all attributes

These fixtures can be used for:

- Development testing without hitting the production API
- Documentation of the current configuration
- Backup of the configuration before making changes
- Analysis of the data model structure

## How to Use the Generated Files

### Data Model Documentation

The `docs/data-model.md` file provides comprehensive documentation of the data model, useful for:

- Onboarding new developers
- Reference during development
- Planning new features or API extensions
- Communicating with stakeholders about data structures

### JSON Fixtures

The JSON fixtures in the `fixtures` directory provide current snapshots of key configuration data, useful for:

- Creating seed data for tests
- Local development without API access
- Generating mock data
- Analyzing the data model relationships

You can load these fixtures in your code with:

```typescript
import families from '../fixtures/families.json'
import attributeGroups from '../fixtures/attribute-groups.json'
import attributes from '../fixtures/attributes.json'
```

## Troubleshooting

### OpenAPI Specification Not Found

If you see an error like "Cannot find OpenAPI specification file", make sure the correct file path is specified in `dumpSchemas.js`:

```javascript
const OPENAPI_FILE = path.join(__dirname, '../backend/KernLogic API (8).yaml')
```

### API Authentication Issues

If `fetchLiveConfig.ts` fails with authorization errors:

1. Check that your JWT token is valid and not expired
2. Verify that the token has the necessary permissions
3. Make sure the API base URL is correct 