import React from 'react';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { productService } from '@/services/productService';

// Define product types to match the API
interface ProductPrice {
  amount: string;
  currency_iso: string;
  price_type_code: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  price?: number;
  default_price?: ProductPrice;
}

// Example component types
type PricingUIProps = {
  productId: number;
};

// Legacy pricing component (uses the old single-price field)
const LegacyPricingUI: React.FC<PricingUIProps> = ({ productId }) => {
  const [price, setPrice] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const product = await productService.getProduct(productId);
        setPrice(product.price);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-2">Legacy Price Display</h3>
      {loading ? (
        <p>Loading price...</p>
      ) : (
        <div className="text-2xl">
          ${price !== null ? price.toFixed(2) : '0.00'}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-1">
        Using legacy price field directly from Product model
      </div>
    </div>
  );
};

// New pricing component (uses the new price table)
const NewPricingUI: React.FC<PricingUIProps> = ({ productId }) => {
  const [defaultPrice, setDefaultPrice] = React.useState<ProductPrice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { useNewPricingData } = useFeatureFlags();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (useNewPricingData) {
          // Use the new pricing API
          const product = await productService.getProduct(productId) as Product;
          setDefaultPrice(product.default_price || null);
        } else {
          // Use a transitional approach: get product but look for default_price
          const product = await productService.getProduct(productId) as Product;
          setDefaultPrice(product.default_price || { 
            amount: product.price?.toString() || '0.00', 
            currency_iso: 'USD',
            price_type_code: 'legacy' 
          });
        }
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId, useNewPricingData]);

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h3 className="text-lg font-medium mb-2">New Price Display</h3>
      {loading ? (
        <p>Loading price data...</p>
      ) : defaultPrice ? (
        <div>
          <div className="text-2xl">
            {defaultPrice.currency_iso} {parseFloat(defaultPrice.amount).toFixed(2)}
          </div>
          <div className="text-xs text-blue-500 mt-1 flex items-center">
            {defaultPrice.price_type_code === 'legacy' ? (
              <span>Legacy price - migrated from single price field</span>
            ) : (
              <span>Price type: {defaultPrice.price_type_code}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-muted">No price available</div>
      )}
      <div className="text-xs text-gray-500 mt-1">
        Using {useNewPricingData ? 'new pricing API' : 'transitional approach'}
      </div>
    </div>
  );
};

// Main component that uses feature flags to toggle between components
const PricingFeatureExample: React.FC<{ productId: number }> = ({ productId }) => {
  const { useNewPricingUI } = useFeatureFlags();

  return (
    <div className="space-y-4">
      <div className="p-2 bg-blue-100 text-blue-800 rounded-md text-sm">
        Feature Flag: useNewPricingUI = {useNewPricingUI ? 'on' : 'off'}
      </div>
      
      {useNewPricingUI ? (
        <NewPricingUI productId={productId} />
      ) : (
        <LegacyPricingUI productId={productId} />
      )}
      
      {/* During transition, we can show both UIs side by side for comparison */}
      {false && (
        <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-4">
          <LegacyPricingUI productId={productId} />
          <NewPricingUI productId={productId} />
        </div>
      )}
    </div>
  );
};

export default PricingFeatureExample; 