# Data Alchemy Suite

A modern inventory management solution for small manufacturers.

## Overview

Data Alchemy Suite centralizes product information management with a focus on simplicity and performance. It allows inventory managers to:

- Manage thousands of SKUs efficiently
- Track stock levels in real-time
- Import/export product data via CSV
- Search and filter products with advanced criteria
- Maintain consistent product information across systems

## Documentation

- [Installation Guide](docs/installation.md)
- [User Guide](docs/user_guide.md)
- [Data Fields Reference](docs/data_fields_reference.md)
- [API and Route Versioning](docs/api_and_route_versioning.md) - *New*
- [Developer Guide](docs/developer_guide.md)

## Technical Architecture

- Backend: Django + Django REST Framework
- Frontend: React + TypeScript
- State Management: React Query
- UI: Tailwind CSS + shadcn/ui
- Database: PostgreSQL
- Task Queue: Celery + Redis
- Authentication: JWT

## Development

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Redis 6+

### Setup

1. Clone the repository
2. Create a virtual environment: `python -m venv .venv`
3. Activate the virtual environment: 
   - Windows: `.venv\Scripts\activate`
   - macOS/Linux: `source .venv/bin/activate`
4. Install backend dependencies: `pip install -r backend/requirements.txt`
5. Install frontend dependencies: `npm install`

### Running the Application

1. Start the Django server: `python backend/manage.py runserver`
2. Start the frontend dev server: `npm run dev`
3. Access the application at `http://localhost:3000`

## License

© 2023-2024 KernLogic. All rights reserved.
