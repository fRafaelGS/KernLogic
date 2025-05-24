import React, { useState, useEffect, useMemo } from 'react';
import { Product, productService, ProductAttribute, ProductAsset, ProductActivity, PRODUCTS_API_URL as PRODUCTS_PATH, ProductPrice } from '@/services/productService';
import { IncompleteProduct, getDashboardSummary, getRecentActivity, getIncompleteProducts } from '@/services/dashboardService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ImageIcon, AlertTriangle, PlusIcon, AlertCircle,
  Check, ChevronDown, ChevronUp, List
} from 'lucide-react';
import ProductDetailDescription from '@/components/products/ProductDetailDescription';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

import axios from 'axios';
import axiosInstance from '@/lib/axiosInstance';
import { cn } from '@/lib/utils';
// Import the CompletenessDrilldown component
import { CompletenessDrilldown } from './CompletenessDrilldown';
// Add lodash type declaration at the top
// @ts-ignore
import { debounce } from 'lodash';
import RelatedProductsPanel from './RelatedProductsPanel';
// Import the AssetsTab component
import { AssetsTab } from './AssetsTab';
import { Skeleton } from "@/components/ui/skeleton";
import ProductHistoryTab from './ProductHistoryTab';
import { Suspense } from 'react';
import { ProductAttributesPanel } from '@/components/ProductAttributesPanel'
import { ENABLE_CUSTOM_ATTRIBUTES } from '@/config/featureFlags'
import { Badge } from '@/components/ui/badge'
import { FieldStatusModal } from './FieldStatusModal'
import { normalizeCategory } from '@/types/categories'
import { getAssetUrl } from '@/utils/isImageAsset'
import { PriceTab } from './PriceTab'
import { LocaleCode } from '@/services/types'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { config, API_ENDPOINTS, API_CURRENCIES } from '@/config/config'

// ====== ATTRIBUTES INTERFACES (EXACT MATCH TO SPEC) ======

// Attribute option for select/multiselect types
interface AttributeOption {
  id: number;
  value: string;
  label: string;
}

// Available attribute from the attribute set
interface AvailableAttribute {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  dataType: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'rich_text' | 'price' | 'media' | 'measurement' | 'url' | 'email' | 'phone';
  unit?: string;
  isMandatory: boolean;
  options?: AttributeOption[];
  validationRule?: string;
  createdAt: string;
}

// Attribute value assigned to a product
interface AttributeValue {
  attributeId: number;
  value: string | number | boolean | Array<string | number> | { amount: number; currency?: string } | { assetId: number; assetType?: string } | { amount: number; unit?: string } | string | { url: string } | { email: string } | { phone: string };
  updatedAt: string;
  locale: string;
}

// Group for organizing attributes
interface AttributeGroup {
  id: number;
  name: string;
}

interface ProductDetailTabsProps {
  product: Product;
  prices: ProductPrice[];
  isPricesLoading: boolean;
  onProductUpdate: (updatedProduct: Product) => Promise<void>;
}

export const ProductDetailTabs = ({ 
  product, 
  prices, 
  isPricesLoading, 
  onProductUpdate 
}: ProductDetailTabsProps): JSX.Element => {
  // Get reference to productDetailTabs config section
  const detailTabsConfig = config.productDetailTabs;
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // States for dynamic data
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  
  // Add the missing state declarations
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [attributeSetId, setAttributeSetId] = useState<number | null>(null);
  
  // Add debugging effect for attributes tab
  useEffect(() => {
    // Log rendering info whenever the active tab or product ID changes
    if (activeTab === 'attributes') {
      // Remove this console.log as it's just for debugging
    }
  }, [activeTab, product.id]);
  
  // States for the enhanced attributes tab
  const [availableAttributes, setAvailableAttributes] = useState<AvailableAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { defaultLocale, defaultChannel } = useOrgSettings()
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(defaultLocale)

  // Data completeness state
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  // Loading states
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // New state for completeness data
  const [productCompletenessDetails, setProductCompletenessDetails] = useState<IncompleteProduct | null>(null);
  const [isLoadingCompleteness, setIsLoadingCompleteness] = useState<boolean>(false);
  
  // Get current user and permissions from auth context
  const { user, checkPermission } = useAuth();
  
  // Permissions check
  const hasViewPermission = checkPermission('product.view');
  const hasEditPermission = checkPermission('product.change');
  const hasAddPermission = checkPermission('product.add');
  const hasRevertPermission = checkPermission('product.revert');
  
  // Calculate filtered missing fields (moved outside conditional rendering)
  const filteredMissingFields = useMemo(() => {
    if (!productCompletenessDetails?.missing_fields) return [];
    
    // Check if we have real images
    const hasRealImages = assets.some(asset => {
      const name = (asset.name || '').toLowerCase();
      const url = (asset.url || '').toLowerCase();
      const type = (asset.type || '').toLowerCase();
      
      const isImageByExt = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name) || 
                          /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
      const isImageByType = type.includes('image/') && !type.includes('pdf');
      
      return isImageByExt || isImageByType;
    });

    // Check if we have tags
    const hasTags = product.tags && Array.isArray(product.tags) && product.tags.length > 0;
    
    // Check if we have a valid category (supporting both hierarchical and legacy formats)
    const hasCategory = 
      // Check hierarchical category (array format)
      (Array.isArray(product.category) && product.category.length > 0) || 
      // Check object format category
      (typeof product.category === 'object' && product.category !== null && 'id' in product.category) ||
      // Check legacy string format
      (typeof product.category === 'string' && product.category.trim() !== '');
      
    // Check if we have a GTIN/barcode
    const hasBarcode = product.barcode && product.barcode.trim() !== '';

    // Create filtered missing fields array
    return productCompletenessDetails.missing_fields.filter(item => {
      const fieldLower = item.field.toLowerCase();
      
      // Filter out image-related fields if we have images
      if (hasRealImages && ["image", "photo", "picture"].some(term => fieldLower.includes(term))) {
        return false;
      }
      
      // Filter out tag-related fields if we have tags
      if (hasTags && ["tag", "tags", "keyword", "keywords"].some(term => fieldLower.includes(term))) {
        return false;
      }
      
      // Filter out category-related fields if we have a category
      if (hasCategory && ["category", "categories"].some(term => fieldLower.includes(term))) {
        return false;
      }
      
      // Filter out GTIN/barcode-related fields if we have a barcode
      if (hasBarcode && ["gtin", "barcode", "upc", "ean"].some(term => fieldLower.includes(term))) {
        return false;
      }
      
      return true;
    });
  }, [productCompletenessDetails?.missing_fields, assets, product.tags, product.category, product.barcode]);
  
  // Categorize missing fields by priority based on field type (core vs attribute)
  const categorizedMissingFields = useMemo(() => {
    if (!filteredMissingFields.length) return { critical: [], recommended: [], optional: [] };
    
    // Critical fields explicitly include core fields and specific attributes like GTIN and Category
    const critical = filteredMissingFields.filter(item => 
      // Core fields don't have attribute_id or attribute_code
      (!item.attribute_id && !item.attribute_code) ||
      // Also include any field related to GTIN/barcode or Category as critical 
      // regardless of whether it's a core field or attribute
      ["gtin", "barcode", "upc", "ean", "category", "categories"].some(term => 
        item.field.toLowerCase().includes(term)
      )
    );
    
    // Other fields with attribute_id or attribute_code that aren't already in critical
    const attributeFields = filteredMissingFields.filter(item => 
      (item.attribute_id || item.attribute_code) && 
      !critical.some(criticalItem => criticalItem.field === item.field)
    );
    
    // Further categorize attributes by weight
    const recommended = attributeFields.filter(item => item.weight >= 50);
    const optional = attributeFields.filter(item => item.weight < 50);
    
    return { critical, recommended, optional };
  }, [filteredMissingFields]);
  
  // Load data when component mounts or product changes
  useEffect(() => {
    if (product.id) {
      fetchAttributes();
      // Always fetch assets on initial load, regardless of activeTab
      fetchAssets();
      fetchActivities();
      
      // Fetch attribute data according to spec
      fetchAttributeSet();
    }
  }, [product.id]); // Only depend on product.id, not activeTab

  // This effect refreshes assets data when switching to the assets tab
  useEffect(() => {
    // Refresh assets when switching to assets tab
    if (activeTab === 'assets' && product.id) {
      // Remove non-essential console log
      fetchAssets();
      
      // Set up a polling interval to check for asset changes while on this tab
      const refreshInterval = setInterval(() => {
        fetchAssets();
      }, 10000); // Check every 10 seconds
      
      // Clean up the interval when changing tabs
      return () => clearInterval(refreshInterval);
    }
  }, [activeTab, product.id]);

  // Fetch attributes from API
  const fetchAttributes = async () => {
    if (!product.id) return;
    
    setLoadingAttributes(true);
    try {
      const data = await productService.getProductAttributes(product.id);
      setAttributes(data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      // Fallback to mock data if API fails
      setAttributes([
        { id: 1, name: 'Material', value: 'Aluminum', group: 'Physical', locale: 'en-US', updated_at: '2023-10-15T12:30:00Z', isMandatory: true },
        { id: 2, name: 'Dimensions', value: '10 x 15 x 5 cm', group: 'Physical', locale: 'en-US', updated_at: '2023-10-15T12:30:00Z', isMandatory: true },
        { id: 3, name: 'Weight', value: '0.5 kg', group: 'Physical', locale: 'en-US', updated_at: '2023-10-15T12:30:00Z', isMandatory: false },
        { id: 4, name: 'Color', value: 'Silver', group: 'Appearance', locale: 'en-US', updated_at: '2023-10-16T09:15:00Z', isMandatory: false },
        { id: 5, name: 'Finish', value: 'Brushed', group: 'Appearance', locale: 'en-US', updated_at: '2023-10-16T09:15:00Z', isMandatory: false },
        { id: 6, name: 'HS Code', value: '8415.10.9000', group: 'Regulatory', locale: 'en-US', updated_at: '2023-11-01T14:22:00Z', isMandatory: true },
        { id: 7, name: 'Country of Origin', value: 'China', group: 'Regulatory', locale: 'en-US', updated_at: '2023-11-01T14:22:00Z', isMandatory: true },
      ]);
    } finally {
      setLoadingAttributes(false);
    }
  };

  // Fetch assets from API
  const fetchAssets = async () => {
    if (!product?.id) return;
    
    setLoadingAssets(true);
    
    // Try to fetch from API first
    let fetchedAssets: ProductAsset[] = [];
    try {
      // Attempt to get assets from API
      fetchedAssets = await productService.getProductAssets(product.id);
      
      // If we got a valid response with at least one asset
      if (Array.isArray(fetchedAssets) && fetchedAssets.length > 0) {
        
        // Normalize asset data structure to ensure consistency
        const normalizedAssets = fetchedAssets.map(asset => ({
          ...asset,
          // Ensure type is set for proper detection
          type: asset.type || asset.asset_type || (
            /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(asset.url?.toLowerCase() || '') ? 'image' : 'unknown'
          ),
          // Ensure basic properties exist
          name: asset.name || `Asset ${asset.id}`,
          size: asset.size || "0",
          uploaded_at: asset.uploaded_at || new Date().toISOString(),
          uploaded_by: asset.uploaded_by || 'system'
        }));
        
        setAssets(normalizedAssets);
        
        // Cache the assets in localStorage
        localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(normalizedAssets));
        setLoadingAssets(false);
        return;
      } else {
        console.warn('API returned empty asset array, will try cache');
      }
    } catch (err) {
      console.error('Error fetching assets from API:', err);
      // Continue to try cache on error
    }
    
    // If API failed or returned empty, try to use cache
    try {
      const cachedAssetsJSON = localStorage.getItem(`product_assets_${product.id}`);
      if (cachedAssetsJSON) {
        const cachedAssets = JSON.parse(cachedAssetsJSON);
        if (Array.isArray(cachedAssets) && cachedAssets.length > 0) {
          setAssets(cachedAssets);
          setLoadingAssets(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error reading cached assets:', err);
    }
    
    // If we got here, both API and cache failed - set empty assets array
    setAssets([]);
    setLoadingAssets(false);
  };

  // Fetch activities from API
  const fetchActivities = async () => {
    if (!product.id) return;
    
    setLoadingActivities(true);
    
    try {
      const data = await productService.getProductActivities(product.id);
      
      // Ensure data is always an array
      if (Array.isArray(data) && data.length > 0) {
        setActivities(data);
      } else {
        console.warn('No activities returned from API or invalid response format');
        // Don't override existing activities if we get an empty response
        if (activities.length === 0) {
          // Fallback to mock data if API fails
          setActivities([
            { id: 1, type: 'create', user: 'John Doe', timestamp: '2023-10-01T09:00:00Z', details: 'Product created' },
            { id: 2, type: 'update', user: 'John Doe', timestamp: '2023-10-05T14:30:00Z', details: 'Updated price from $85.00 to $89.99' },
            { id: 3, type: 'asset_add', user: 'Jane Smith', timestamp: '2023-10-10T10:15:00Z', details: 'Added product images (2)' },
            { id: 4, type: 'update', user: 'Mike Johnson', timestamp: '2023-10-12T11:45:00Z', details: 'Updated description' },
            { id: 5, type: 'asset_add', user: 'Jane Smith', timestamp: '2023-10-12T14:30:00Z', details: 'Added product manual' },
            { id: 6, type: 'status_change', user: 'Mike Johnson', timestamp: '2023-10-20T16:00:00Z', details: 'Changed status to Active' },
            { id: 7, type: 'update', user: 'John Doe', timestamp: '2023-11-05T09:15:00Z', details: 'Updated category from "Electronics" to "Audio Electronics"' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Only use fallback if no existing data
      if (activities.length === 0) {
        // Fallback to mock data if API fails
        setActivities([
          { id: 1, type: 'create', user: 'John Doe', timestamp: '2023-10-01T09:00:00Z', details: 'Product created' },
          { id: 2, type: 'update', user: 'John Doe', timestamp: '2023-10-05T14:30:00Z', details: 'Updated price from $85.00 to $89.99' },
          { id: 3, type: 'asset_add', user: 'Jane Smith', timestamp: '2023-10-10T10:15:00Z', details: 'Added product images (2)' },
          { id: 4, type: 'update', user: 'Mike Johnson', timestamp: '2023-10-12T11:45:00Z', details: 'Updated description' },
          { id: 5, type: 'asset_add', user: 'Jane Smith', timestamp: '2023-10-12T14:30:00Z', details: 'Added product manual' },
          { id: 6, type: 'status_change', user: 'Mike Johnson', timestamp: '2023-10-20T16:00:00Z', details: 'Changed status to Active' },
          { id: 7, type: 'update', user: 'John Doe', timestamp: '2023-11-05T09:15:00Z', details: 'Updated category from "Electronics" to "Audio Electronics"' },
        ]);
      }
    } finally {
      setLoadingActivities(false);
    }
  };
  
  // Fetch the product's attribute set
  const fetchAttributeSet = async () => {
    if (!product.id) return;
    
    setLoadingAttributes(true);
    try {
      // Use the normalizeCategory helper to handle both string and object formats
      const normalizedCategory = normalizeCategory(product.category);
      const categoryName = normalizedCategory.name;
        
      // Check for common automotive/vehicle categories
      const isAutomotive = categoryName !== '' &&
        ['automotive', 'cars', 'vehicles', 'auto'].some(
          cat => categoryName.toLowerCase().includes(cat)
        );
      
      // Get attribute set ID based on category or use a hardcoded value
      let setId = 3; // Default to 3 (Automotive)
      
      if (categoryName === 'Electronics') {
        setId = 1;
      } else if (categoryName === 'Furniture') {
        setId = 2;
      } else if (isAutomotive) {
        setId = 3;
      }
      
      setAttributeSetId(setId);
      
      // Fetch attributes for this set
      await fetchAvailableAttributes(setId);
      
      // Fetch attribute values for this product
      await fetchAttributeValues();
      
    } catch (error) {
      console.error('Error fetching attribute set:', error);
      // Initialize empty arrays instead of showing error toast
      setAvailableAttributes([]);
      setAttributeGroups([]);
      setLoadingAttributes(false);
    } finally {
      setLoadingAttributes(false);
    }
  };
  
  // Fetch available attributes for the attribute set
  const fetchAvailableAttributes = async (setId: number) => {
    try {
      const response = await productService.getAttributeSet(setId);
      const attributes: AvailableAttribute[] = Array.isArray(response?.attributes)
        ? response.attributes
        : [];             // 👈 never undefined

      setAvailableAttributes(attributes);

      // Extract and set groups
      const groups = Array.isArray(attributes)
        ? Array.from(new Set(attributes.map((attr: AvailableAttribute) => attr.groupId)))
            .map((groupId) => {
              const group = attributes.find((attr: AvailableAttribute) => attr.groupId === groupId);
              return {
                id: groupId,
                name: group?.groupName || 'Uncategorized',
              };
            })
        : [];
      setAttributeGroups(groups);
      if (groups.length > 0) {
        setExpandedGroups([groups[0].name]);
      }
      if (!Array.isArray(response?.attributes)) {
        toast.error('No attributes found for this attribute set.');
      }
    } catch (error) {
      console.error('Error fetching available attributes:', error);
      setAvailableAttributes([]);
      setAttributeGroups([]);
      toast.error('Failed to load available attributes');
    }
  };
  
  // Fetch attribute values for this product
  const fetchAttributeValues = async () => {
    if (!product.id) return;
    try {
      const response = await productService.getAttributeValues(product.id);
      setAttributeValues(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching attribute values:', error);
      toast.error('Failed to load attribute values');
    }
  };

  // Fix 5: Refresh after locale switch
  useEffect(() => {
    if (product.id) {
      fetchAttributeValues();
    }
  }, [selectedLocale, product.id]);

  // Add local implementation to avoid dependency issues
  const isImageAsset = (asset?: ProductAsset): boolean => {
    if (!asset) return false;
    
    // Check content_type or type
    const type = asset.content_type || asset.type || '';
    if (type && type.toLowerCase().startsWith('image/')) {
      return true;
    }
    
    // Check URL extension
    const url = asset.url || '';
    if (url && typeof url === 'string') {
      const extension = url.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'ico', 'heic', 'avif'].includes(extension);
    }
    
    return false;
  };

  // Add an effect to handle assets changes and notify the parent component
  useEffect(() => {
    // Only proceed if we have at least one asset and a product ID
    if (assets.length > 0 && product.id) {
      // Find the primary asset
      const primaryAsset = assets.find(asset => asset.is_primary);
      
      // If we have a primary asset and it's an image, update the parent component
      if (primaryAsset && isImageAsset(primaryAsset)) {
        // Notify parent component about updated product with type casting to avoid TS errors
        onProductUpdate({
          ...product,
          // Use type assertion to handle the primary_asset property
          primary_asset: primaryAsset.id
        } as unknown as Product);
      }
    }
  }, [assets, product.id, isImageAsset, onProductUpdate]);

  // Add a useEffect to fetch completeness data (after the existing useEffect hooks)
  useEffect(() => {
    if (product.id) {
      const fetchProductCompleteness = async () => {
        setIsLoadingCompleteness(true);
        try {
          // Ensure we have a valid organization ID
          let organizationId: number;
          
          if (typeof user?.organization_id === 'string') {
            organizationId = parseInt(user.organization_id, 10);
          } else if (typeof user?.organization_id === 'number') {
            organizationId = user.organization_id;
          } else {
            console.error('Invalid organization ID');
            toast.error('Invalid organization ID');
            setIsLoadingCompleteness(false);
            return;
          }
          
          // Use the dashboardService to fetch product completeness with organization_id and product_id
          const completenessData = await getIncompleteProducts({
            organization_id: organizationId,
            product_id: product.id
          });
          
          // If data array is returned (expected), take the first element
          if (Array.isArray(completenessData) && completenessData.length > 0) {
            setProductCompletenessDetails(completenessData[0]);
            
          } else if (completenessData.length === 0) {
            // Handle case where no data is returned
            console.error('No completeness data found for this product');
            toast.error('Completeness data not found for this product');
          }
        } catch (error) {
          console.error('Error fetching product completeness:', error);
          // Handle errors according to error type
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
              toast.error('Product not found');
            } else {
              toast.error('Failed to load completeness data');
            }
          } else {
            toast.error('Failed to load completeness data');
          }
        } finally {
          setIsLoadingCompleteness(false);
        }
      };

      fetchProductCompleteness();
    }
  }, [product.id, user?.organization_id]);

  // Add a new state for the field status modal near other state declarations
  const [isFieldStatusModalOpen, setIsFieldStatusModalOpen] = useState(false);

  // Add an initial collapsed state of false - keep content expanded by default
  const [isDataCompletenessCollapsed, setIsDataCompletenessCollapsed] = useState(false);

  const [units] = useState(['kg', 'g', 'lb', 'oz', 'cm', 'mm', 'm', 'in', 'ft', 'l', 'ml'])

  const [currencies, setCurrencies] = useState<{ iso_code: string; symbol: string; name: string }[]>([])

  useEffect(() => {
    axiosInstance.get(API_CURRENCIES).then(res => setCurrencies(res.data)).catch(() => setCurrencies([]))
    if (typeof product.id === 'number') {
      axiosInstance.get(API_ENDPOINTS.products.assets(product.id)).then(res => setAssets(res.data)).catch(() => setAssets([]))
    } else {
      axiosInstance.get(`/api/products/${product.id}/assets/`).then(res => setAssets(res.data)).catch(() => setAssets([]))
    }
  }, [product.id])

  // Add a fallback implementation if the imported function doesn't exist
  const getAssetUrlSafe = (asset: ProductAsset): string | null => {
    // If the imported function exists, use it
    if (typeof getAssetUrl === 'function') {
      return getAssetUrl(asset);
    }
    
    // Otherwise, provide a fallback implementation
    if (!asset) return null;
    
    // Try to get URL from asset properties
    return asset.url || null;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="overview">{detailTabsConfig.tabs.overview}</TabsTrigger>
        <TabsTrigger value="attributes">{detailTabsConfig.tabs.attributes}</TabsTrigger>
        <TabsTrigger value="assets">{detailTabsConfig.tabs.assets}</TabsTrigger>
        <TabsTrigger value="history">{detailTabsConfig.tabs.history}</TabsTrigger>
        <TabsTrigger value="price">{detailTabsConfig.tabs.price}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
        {/* Product Description Component */}
        <ProductDetailDescription 
          product={product}
          onProductUpdate={onProductUpdate}
        />
        
        {/* Data Completeness Card */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Data Completeness</CardTitle>
              <CardDescription>
                Track the completeness of your product data.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsDataCompletenessCollapsed(prev => !prev)}
              aria-label={isDataCompletenessCollapsed ? "Expand data completeness" : "Collapse data completeness"}
              type="button"
            >
              {isDataCompletenessCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          
          {/* Always show the overall completeness percentage, even when collapsed */}
          <CardContent>
            {isLoadingCompleteness && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-1/6" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            
            {!isLoadingCompleteness && !productCompletenessDetails && (
              <Alert variant="default" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Product completeness data is currently unavailable or could not be loaded. Please try refreshing or contact support if the issue persists.
                </AlertDescription>
              </Alert>
            )}
            
            {!isLoadingCompleteness && productCompletenessDetails && (
              <>
                {/* Always show progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <CardDescription className="text-sm font-medium">Overall Product Completeness</CardDescription>
                    <span className="font-bold text-xl text-primary">
                      {Math.round(productCompletenessDetails.completeness)}%
                    </span>
                  </div>
                  <Progress 
                    value={productCompletenessDetails.completeness} 
                    aria-label={`Product completeness: ${productCompletenessDetails.completeness}%`}
                    className="w-full h-3" 
                  />
                </div>
                
                {/* Conditional content that can be collapsed */}
                {!isDataCompletenessCollapsed && (
                  <div className="animate-in fade-in-0 duration-300">
                    {/* Missing Information Section */}
                    {filteredMissingFields.length > 0 && (
                      <div className="mb-6 space-y-4">
                        <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Missing information
                        </h3>
                        
                        {/* Critical fields */}
                        {categorizedMissingFields.critical.length > 0 && (
                          <div className="border border-red-300 rounded-md p-3 bg-red-50">
                            <h4 className="font-medium text-red-700 mb-2 flex items-center gap-1" aria-label="Critical gaps">
                              <AlertCircle className="h-4 w-4" />
                              Critical gaps
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {categorizedMissingFields.critical.map((item, index) => (
                                <Badge 
                                  key={`critical-${index}`} 
                                  variant="outline" 
                                  className="bg-red-50 text-red-700 border-red-300"
                                >
                                  {item.field}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Recommended fields */}
                        {categorizedMissingFields.recommended.length > 0 && (
                          <div className="border border-amber-200 rounded-md p-3 bg-amber-50">
                            <h4 className="font-medium text-amber-700 mb-2">
                              Recommended
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {categorizedMissingFields.recommended.map((item, index) => (
                                <Badge 
                                  key={`recommended-${index}`} 
                                  variant="outline" 
                                  className="bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  {item.field}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Optional fields */}
                        {categorizedMissingFields.optional.length > 0 && (
                          <div className="border border-slate-200 rounded-md p-3 bg-slate-50">
                            <h4 className="font-medium text-slate-700 mb-2">
                              Optional
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {categorizedMissingFields.optional.slice(0, 10).map((item, index) => (
                                <Badge 
                                  key={`optional-${index}`} 
                                  variant="outline" 
                                  className="bg-slate-50 text-slate-700 border-slate-200"
                                >
                                  {item.field}
                                </Badge>
                              ))}
                            </div>
                            {categorizedMissingFields.optional.length > 10 && (
                              <div className="mt-2 text-xs text-slate-500">
                                +{categorizedMissingFields.optional.length - 10} more optional attributes. 
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="h-auto p-0 text-xs" 
                                  onClick={() => setIsFieldStatusModalOpen(true)}
                                >
                                  View all
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Field Status Breakdown Section */}
                    <h3 className="font-semibold text-lg mb-3 border-b pb-2">Field Status Breakdown:</h3>
                    {productCompletenessDetails?.field_completeness.length ? (
                      <div className="flex flex-col space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {productCompletenessDetails.field_completeness.filter(item => item.complete).length} of {productCompletenessDetails.field_completeness.length} fields complete
                          </p>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsFieldStatusModalOpen(true);
                            }}
                            className="ml-auto"
                          >
                            <List className="h-4 w-4 mr-2" />
                            View all field statuses ({productCompletenessDetails.field_completeness.length})
                          </Button>
                        </div>
                        
                        {/* Status Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-md p-3 bg-green-50 border-green-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Check className="h-4 w-4 mr-2 text-green-600" />
                                <span className="font-medium text-green-700">Complete</span>
                              </div>
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                {productCompletenessDetails.field_completeness.filter(item => item.complete).length}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="border rounded-md p-3 bg-red-50 border-red-200">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                                <span className="font-medium text-red-700">Incomplete</span>
                              </div>
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                {productCompletenessDetails.field_completeness.filter(item => !item.complete).length}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific field completeness details are tracked for this product.</p>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Field Status Modal */}
            <FieldStatusModal
              open={isFieldStatusModalOpen}
              onOpenChange={setIsFieldStatusModalOpen}
              fieldCompleteness={productCompletenessDetails?.field_completeness || []}
              productId={product.id ?? 0}
            />
            
            {/* CompletenessDrilldown component (keep this unchanged) */}
            {showDrilldown && (
              <CompletenessDrilldown
                open={showDrilldown}
                onOpenChange={setShowDrilldown}
                percentage={productCompletenessDetails?.completeness || 0}
                fieldStatus={productCompletenessDetails?.field_completeness || []}
              />
            )}
          </CardContent>
        </Card>
        
        {/* Media Section - Reuse asset data from the API */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{detailTabsConfig.overview.media.title}</CardTitle>
            <CardDescription>
              {detailTabsConfig.overview.media.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAssets ? (
              // Loading skeleton
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : (
              <>
                {/* Always render image grid if we have any assets */}
                {(() => {
                  const imageAssets = assets.filter(asset => {
                    if (!isImageAsset(asset)) {
                      console.warn(`[MediaCard] Dropping non‐image or bad URL: ${asset?.name}`, asset);
                      return false;
                    }
                    return true;
                  });
                  
                  if (imageAssets.length > 0) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {imageAssets
                          .sort((a, b) => (a.is_primary && !b.is_primary) ? -1 : (!a.is_primary && b.is_primary) ? 1 : 0)
                          .slice(0, 4)
                          .map((asset, index) => {
                            const src = getAssetUrlSafe(asset)!; // non-null because we filtered already
                            return (
                              <div 
                                key={`media-card-image-${asset.id}-${index}`}
                                className={cn(
                                  "relative aspect-square rounded-md overflow-hidden border border-slate-200",
                                  asset.is_primary && "ring-2 ring-primary"
                                )}
                              >
                                <img 
                                  src={src}
                                  alt={asset.name || `Product image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={e => {
                                    console.warn(`Error loading image asset: ${src}`, e);
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Image+Error';
                                  }}
                                />
                                {asset.is_primary && (
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="outline" className="bg-primary/70 text-white border-none text-xs">
                                      {detailTabsConfig.overview.media.primaryBadge}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    );
                  } else {
                    return (
                      // Empty state when no images are found
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                        <p>{detailTabsConfig.overview.media.noImagesAvailable}</p>
                        {hasEditPermission && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-4"
                            onClick={() => setActiveTab('assets')}
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            {detailTabsConfig.overview.media.addImages}
                          </Button>
                        )}
                      </div>
                    );
                  }
                })()}
                
                {/* Show "View All" button if there are images */}
                {assets.filter(asset => isImageAsset(asset)).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('assets')}
                    >
                      {detailTabsConfig.overview.media.viewAllImages}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Related Products */}
        <RelatedProductsPanel 
          productId={product.id ?? 0} 
          onRefresh={() => {/* handle refresh if needed */}}
        />
      </TabsContent>
      
      <TabsContent value="attributes" className="space-y-6">
        {ENABLE_CUSTOM_ATTRIBUTES && (
          <ProductAttributesPanel 
            key={`attribute-panel-${product.id}-${product.family || 'no-family'}-${selectedLocale}`}
            productId={product.id ? String(product.id) : ''} 
            locale={selectedLocale || defaultLocale}
            channel={defaultChannel?.code || ''}
            familyId={typeof product.family === 'object' && product.family !== null ? product.family.id : undefined}
            enabled={activeTab === 'attributes'}
          />
        )}
      </TabsContent>
      
      <TabsContent value="assets">
        <AssetsTab 
          product={product} 
        />
      </TabsContent>
      
      <TabsContent value="history" className="space-y-6">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <ProductHistoryTab productId={product.id ?? 0} />
        </Suspense>
      </TabsContent>
      <TabsContent value="price">
        <PriceTab 
          productId={product.id ?? 0} 
          prices={prices}
          isPricesLoading={isPricesLoading}
          onPricesUpdated={async () => await onProductUpdate(product)}
        />
      </TabsContent>
    </Tabs>
  );
};