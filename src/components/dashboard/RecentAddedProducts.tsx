import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/services/productService';
import { APP_VERSION } from '@/constants';

const RecentAddedProducts: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [maxItems, setMaxItems] = useState(5);

  useEffect(() => {
    // Fetch products from API
    // Replace with actual API call
    setProducts([
      { id: 1, name: 'Product 1', sku: 'SKU1', price: 10, category: 'Category 1', description: '', is_active: true },
      { id: 2, name: 'Product 2', sku: 'SKU2', price: 20, category: 'Category 2', description: '', is_active: true },
      { id: 3, name: 'Product 3', sku: 'SKU3', price: 30, category: 'Category 3', description: '', is_active: true },
      { id: 4, name: 'Product 4', sku: 'SKU4', price: 40, category: 'Category 4', description: '', is_active: true },
      { id: 5, name: 'Product 5', sku: 'SKU5', price: 50, category: 'Category 5', description: '', is_active: true },
    ]);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.slice(0, maxItems).map((product) => (
        <div 
          key={product?.id} 
          className="px-6 py-4 hover:bg-enterprise-50 cursor-pointer flex items-center space-x-3 group"
          onClick={() => product?.id ? navigate(`${APP_VERSION.ROUTES.PRODUCTS}/${product.id}`) : null}
        >
          {/* Product content */}
          <div className="flex-1">
            <h4 className="font-medium text-enterprise-800">{product.name}</h4>
            <p className="text-xs text-enterprise-500">SKU: {product.sku}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentAddedProducts; 