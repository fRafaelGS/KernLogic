# KernLogic: Inventory Management for Small Manufacturers

## 🌟 Project Overview

KernLogic is a lightweight ERP-like inventory management system designed for small manufacturers. It provides the power of an enterprise product module without the cost or complexity of full-scale ERP solutions.

**Vision:** "Give small manufacturers the power of an ERP's product module without the cost or complexity."

### 🎯 Key Problems Solved

- Eliminates duplicate SKUs caused by Excel- and email-driven stock management
- Prevents stock-outs and over-stocking
- Ensures consistent marketplace descriptions
- Centralizes all inventory data in one secure, high-performance web application

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
- Node.js 14+
- npm or yarn
- PostgreSQL (optional, SQLite for development)

### Installation

#### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/data-alchemy-suite.git
cd data-alchemy-suite

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver 8080
```

#### Frontend Setup

```bash
# Navigate to the project root
cd ..

# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

#### Test User

For testing purposes, you can use:
- Email: test123@example.com
- Password: test123

## 🏗️ Architecture

KernLogic follows a modern web application architecture:

### Backend

- **Django**: Web framework
- **Django REST Framework**: API layer
- **SimpleJWT**: Authentication with JWT tokens
- **SQLite/PostgreSQL**: Database

### Frontend

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **TailwindCSS**: Utility-first CSS framework
- **React Query**: Data fetching and state management
- **React Router**: Client-side routing
- **React Hook Form**: Form handling
- **Zod**: Schema validation

## 📁 Project Structure

```
data-alchemy-suite/
├── backend/                   # Django backend
│   ├── accounts/              # User authentication
│   ├── core/                  # Project settings and configurations
│   ├── products/              # Products CRUD operations
│   ├── manage.py              # Django management script
│   └── requirements.txt       # Python dependencies
│
├── src/                       # React frontend
│   ├── components/            # Reusable UI components
│   │   ├── layout/            # Layout components
│   │   ├── products/          # Product-specific components
│   │   └── ui/                # Base UI components
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

### 2. Products Management
- Create, read, update, delete product information
- Fields: name, SKU, price, stock, category, description, active status
- Soft delete functionality

### 3. Bulk CSV Upload
- Drag-and-drop CSV import
- Validation of imported data
- Duplicate SKU detection

### 4. Dashboard
- KPI cards (total products, inventory value, low-stock count)
- Latest activity widget

### 5. Search and Filtering
- Full-text search on product properties
- Filter by category, active status

## 🧩 Key Components

### Backend

#### Models

```python
# Product Model
class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    sku = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=100)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
```

#### Serializers

```python
# Product Serializer
class ProductSerializer(serializers.ModelSerializer):
    created_by = serializers.ReadOnlyField(source='created_by.email', required=False)
    price = serializers.FloatField()  # Ensures numeric price values

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'sku', 'price', 'stock', 
                 'category', 'created_by', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['created_at', 'updated_at']
```

#### ViewSets

```python
# Product ViewSet
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]  # For development
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description', 'sku', 'category']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    ordering = ['-created_at']
```

### Frontend

#### Authentication Context

```typescript
// AuthContext.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const navigate = useNavigate();

  // Handles token validation and login
  useEffect(() => {
    // Check for existing token and validate
    // Fall back to test login if needed
  }, []);

  // Login, logout, register functions
  // ...
}
```

#### Product Service

```typescript
// productService.ts
export const productService = {
  // Get all products
  getProducts: async (): Promise<Product[]> => {
    // API call with authentication
  },

  // Create a new product
  createProduct: async (product: ProductFormData): Promise<Product> => {
    // API call with validation
  },

  // Update a product
  updateProduct: async (id: number, product: Partial<Product>): Promise<Product> => {
    // API call
  },

  // Delete a product
  deleteProduct: async (id: number): Promise<void> => {
    // API call for soft delete
  },
};
```

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/user/` - Get current user info

### Products

- `GET /api/products/` - List all products
- `POST /api/products/` - Create new product
- `GET /api/products/:id/` - Get product details
- `PATCH /api/products/:id/` - Update product
- `DELETE /api/products/:id/` - Soft delete product
- `GET /api/products/stats/` - Get product statistics
- `GET /api/products/categories/` - Get all categories

## 🔐 Authentication Flow

1. **Login**:
   - User submits credentials to `/api/auth/login/`
   - Backend validates and returns access and refresh tokens
   - Frontend stores tokens in localStorage

2. **Token Usage**:
   - Access token included in Authorization header as `Bearer {token}`
   - Used for all authenticated API requests

3. **Token Refresh**:
   - When access token expires (401 response), refresh token is used
   - Send refresh token to `/api/auth/refresh/`
   - New access token is received and stored

4. **Logout**:
   - Remove tokens from localStorage
   - Redirect to login page

## 🛠️ Development Guidelines

### Backend

- Follow Django and DRF best practices
- Use descriptive variable names
- Document functions and classes
- Write tests for API endpoints
- Use proper error handling

### Frontend

- Follow React hooks pattern
- Use TypeScript for type safety
- Prefer functional components
- Keep components small and reusable
- Use Tailwind CSS for styling
- Implement proper error handling and loading states

## ⚠️ Common Issues and Troubleshooting

### Authentication Issues

1. **"Cannot access protected routes"**
   - Check that tokens are properly stored in localStorage
   - Verify token expiration
   - Check Authorization header in network requests

2. **"Token refresh not working"**
   - Ensure CORS settings are correct
   - Check for duplicate URL paths in API calls
   - Verify refresh token is being sent properly

### Product Display Issues

1. **"Products not loading"**
   - Check network requests for proper authentication
   - Verify API endpoint is correct
   - Check browser console for errors

2. **"Price display errors"**
   - Ensure price is handled as a number (both client and server)
   - Add fallback handling for string values

3. **"Redirect loops"**
   - Check that authentication state is properly managed
   - Verify protected route component logic

## 🚢 Deployment

### Prerequisites

- PostgreSQL database
- Production server (e.g., Render, Heroku, AWS)
- Environment variables for secrets

### Environment Variables

- `DEBUG`: Set to "False" in production
- `SECRET_KEY`: Django secret key
- `DATABASE_URL`: PostgreSQL connection string
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts

### Deployment Steps

1. **Backend**:
   - Collect static files: `python manage.py collectstatic`
   - Run migrations: `python manage.py migrate`
   - Configure WSGI server (e.g., Gunicorn)

2. **Frontend**:
   - Build production bundle: `npm run build`
   - Configure static file serving

3. **Database**:
   - Ensure database migrations are applied
   - Create backup procedures

4. **Monitoring**:
   - Set up logging (e.g., New Relic)
   - Configure error tracking

## 👥 Personas

| Persona | Key Tasks | Pain Points |
|---------|-----------|-------------|
| María (Inventory Manager) | Bulk updates stock, watches low-stock list | Manual Excel counts, mistakes |
| Jorge (E-com Specialist) | Edits descriptions, categories, tags; exports feed | Copy-paste to multiple platforms |
| Ana (Owner/GM) | Checks value of stock, low-stock KPI, audit log | No real-time visibility |

## 📈 Planned Features (v2+)

- Tag management
- Role-based permissions
- Outbound e-commerce feeds (Shopify, Amazon)
- Enhanced reporting and analytics
- Bulk operations on product subsets
- API integrations with third-party services

## 🧪 Testing

### Backend Tests

```bash
cd backend
python manage.py test
```

### Frontend Tests

```bash
npm test
```

## 📄 License

[MIT License](LICENSE)

## 👏 Contributors

- Original Project by KernLogic Team
- Documentation and fixes by Claude (Anthropic)

---

**Documentation version:** 1.0.0  
**Last updated:** April 24, 2023
