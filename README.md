# KernLogic: Enterprise PIM for Small Manufacturers

## 🌟 Project Overview

KernLogic is a powerful Product Information Management (PIM) system designed for small to medium manufacturers. It centralizes product data and provides an intuitive interface for managing complex product attributes, categories, and digital assets without the complexity and cost of full enterprise solutions.

**Vision:** "Give small manufacturers the power of an ERP's product module without the cost or complexity."

### 🎯 Key Problems Solved

- Eliminates duplicate SKUs caused by Excel- and email-driven stock management
- Prevents stock-outs and over-stocking
- Ensures consistent marketplace descriptions
- Centralizes all inventory data in one secure, high-performance web application
- Manages complex product attributes and specifications
- Handles product families and inheritance
- Supports multi-channel pricing and sales strategies

### 📊 Key Performance Indicators (KPIs)

| KPI | Target v1 | Why it matters |
|-----|-----------|----------------|
| Time to import 1,000 SKUs (CSV) | ≤ 60s | Shows upload + parse speed |
| Dashboard TTI (Time-to-interactive) | ≤ 1s (95th percentile) | UX snappiness |
| CRUD success rate | ≥ 99% | Reliability |
| Weekly active users (pilot) | 60% of invited | Engagement |
| Bug bounce-backs in first month | 0 critical, ≤ 3 medium | Stability |

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- PostgreSQL 12+
- Redis (for Celery tasks)

### Installation

#### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/kernlogic.git
cd kernlogic

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver
```

#### Frontend Setup

```bash
# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

## 🏗️ Architecture

KernLogic follows a modern web application architecture:

### Backend

- **Django 4.2**: Web framework
- **Django REST Framework**: API layer
- **SimpleJWT**: Authentication with JWT tokens
- **PostgreSQL**: Database
- **Celery**: Background task processing
- **Redis**: Task queue and caching
- **DRF Spectacular**: OpenAPI documentation

### Frontend

- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **React Query**: Data fetching and state management
- **React Router 6**: Client-side routing
- **React Hook Form**: Form handling
- **Zod**: Schema validation
- **Shadcn UI**: Component library
- **Tremor**: Data visualization
- **Framer Motion**: Animations
- **Tiptap**: Rich text editing

## 📁 Project Structure

```
kernlogic/
├── backend/                   # Django backend
│   ├── accounts/              # User authentication
│   ├── analytics/             # Reporting and data analysis
│   ├── core/                  # Project settings and configurations
│   ├── products/              # Products CRUD operations
│   ├── organizations/         # Multi-tenant organization support
│   ├── teams/                 # Team management
│   ├── manage.py              # Django management script
│   └── requirements.txt       # Python dependencies
│
├── src/                       # React frontend
│   ├── components/            # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── products/          # Product-specific components
│   │   └── ui/                # Base UI components
│   ├── features/              # Feature modules
│   │   ├── products/          # Product management
│   │   ├── dashboard/         # Dashboard and analytics
│   │   ├── attributes/        # Attribute management
│   │   ├── categories/        # Category management
│   │   ├── families/          # Product family management
│   │   ├── imports/           # CSV import functionality
│   │   └── reports/           # Reports and exports
│   ├── contexts/              # React contexts
│   ├── pages/                 # Page components
│   │   ├── marketing/         # Marketing pages
│   │   └── app pages          # Application pages
│   ├── services/              # API services
│   ├── App.tsx                # Main application component
│   └── config.ts              # Application configuration
│
├── package.json               # Frontend dependencies
└── README.md                  # Project documentation
```

## 🔑 Key Features

### 1. User Authentication
- Email/password authentication with JWT tokens
- Access and refresh token mechanism
- Password reset functionality
- Multi-tenant organization support

### 2. Products Management
- Create, read, update, delete product information
- Fields: name, SKU, price, stock, category, description, active status
- Soft delete functionality
- Product history tracking

### 3. Attribute Management
- Flexible attribute definitions (text, number, boolean, select, etc.)
- Attribute grouping for organized display
- Attribute inheritance from product families
- Multi-locale support for internationalization

### 4. Category Management
- Hierarchical category structure
- Category-specific attribute sets
- Category inheritance

### 5. Product Families
- Template-based product creation
- Attribute inheritance
- Override mechanisms for specific products

### 6. Digital Asset Management (just at product detail level)
- Image and document storage
- Asset bundling
- File type validation

### 7. Bulk CSV Import/Export
- Drag-and-drop CSV import
- Validation of imported data
- Duplicate SKU detection
- Background processing for large imports

### 8. Dashboard
- KPI cards (total products, inventory value, low-stock count)
- Latest activity widget
- Data completeness metrics

### 9. Search and Filtering
- Full-text search on product properties
- Filter by category, attribute, family, status
- Advanced filtering options

### 10. Reporting
- Data completeness reports
- Export to Excel/CSV
- Activity audit logs
- Change history tracking

### 11. PDF Export
- Generate product specification sheets
- Custom templates
- High-quality print output

## 🔐 Authentication Flow

1. **Login**:
   - User submits credentials to `/api/token/`
   - Backend validates and returns access and refresh tokens
   - Frontend stores tokens securely

2. **Token Usage**:
   - Access token included in Authorization header as `Bearer {token}`
   - Used for all authenticated API requests

3. **Token Refresh**:
   - When access token expires (401 response), refresh token is used
   - Send refresh token to `/api/token/refresh/`
   - New access token is received and stored

4. **Logout**:
   - Send request to `/api/logout/` to invalidate the refresh token
   - Remove tokens from storage
   - Redirect to login page

## 👥 Personas

| Persona | Key Tasks | Pain Points |
|---------|-----------|-------------|
| María (Inventory Manager) | Bulk updates stock, watches low-stock list | Manual Excel counts, mistakes |
| Jorge (E-com Specialist) | Edits descriptions, categories, tags; exports feed | Copy-paste to multiple platforms |
| Ana (Owner/GM) | Checks value of stock, low-stock KPI, audit log | No real-time visibility |

## 📈 Roadmap (v2+)

- Advanced role-based permissions
- Outbound e-commerce feeds (Shopify, Amazon, etc.)
- Enhanced reporting and analytics
- Bulk operations on product subsets
- API integrations with third-party services
- Workflow automation
- Approval processes
- Advanced search with facets

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
npm test
```

## 📄 License

[MIT License](LICENSE)

---

**Documentation version:** 2.0.0  
**Last updated:** May 2025
