import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Product, productService, ProductAttribute, ProductAsset, ProductActivity, ProductVersion, PriceHistory, PRODUCTS_API_URL as PRODUCTS_PATH, ProductImage, ProductPrice } from '@/services/productService';
import { IncompleteProduct, dashboardService } from '@/services/dashboardService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ImageIcon, FileIcon, FileTypeIcon, FileTextIcon, Clipboard, CalendarIcon, 
  History, AlertTriangle, PlusIcon, PencilIcon, AlertCircle, RefreshCcw,
  Check, ChevronDown, ChevronUp, ChevronRight, Save, X, Edit2, Calendar, Flag, Pin, InfoIcon,
  List, Settings, Layers, Search
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import axios from 'axios';
import axiosInstance from '@/lib/axiosInstance';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
// Import the CompletenessDrilldown component
import { CompletenessDrilldown } from './CompletenessDrilldown';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Link } from 'react-router-dom';
import { debounce } from 'lodash';
import RelatedProductsPanel from './RelatedProductsPanel';
// Import the AssetsTab component
import { AssetsTab } from './AssetsTab';
import { Skeleton } from "@/components/ui/skeleton";
import ProductHistoryTab from './ProductHistoryTab';
import { Suspense } from 'react';
import { ProductAttributesPanel } from '@/components/ProductAttributesPanel'
import { ENABLE_CUSTOM_ATTRIBUTES } from '@/config/featureFlags'
import { FieldStatusModal } from './FieldStatusModal'
import { normalizeCategory } from '@/types/categories'
import { isImageAsset, getAssetUrl } from '@/utils/isImageAsset'
import { PriceTab } from './PriceTab'
import { LOCALES, LocaleCode } from '@/config/locales'

// ====== ATTRIBUTES INTERFACES (EXACT MATCH TO SPEC) ======
// (Following exactly the backend shape specified in the requirements)

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
  const [activeTab, setActiveTab] = useState('overview');
  
  // States for dynamic data
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  
  // Add debugging effect for attributes tab
  useEffect(() => {
    // Log rendering info whenever the active tab or product ID changes
    if (activeTab === 'attributes') {
      console.log('[Debug] Attributes tab selected', {
        'ENABLE_CUSTOM_ATTRIBUTES': ENABLE_CUSTOM_ATTRIBUTES,
        'product.id exists': !!product.id,
        'productId value': String(product.id) 
      });
    }
  }, [activeTab, product.id]);
  
  // States for the enhanced attributes tab
  const [availableAttributes, setAvailableAttributes] = useState<AvailableAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<any>(null);
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(LOCALES[0].code);
  const [availableLocales, setAvailableLocales] = useState(LOCALES.map(locale => locale.code));
  const [savingAttributeId, setSavingAttributeId] = useState<number | null>(null);
  const [attributeSaveError, setAttributeSaveError] = useState<{id: number, message: string} | null>(null);
  const [attributeSetId, setAttributeSetId] = useState<number | null>(null);
  
  // Data completeness state
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  // Loading states
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // New state for completeness data
  const [productCompletenessDetails, setProductCompletenessDetails] = useState<IncompleteProduct | null>(null);
  const [isLoadingCompleteness, setIsLoadingCompleteness] = useState<boolean>(false);
  
  // Add the missing state declaration near the other state declarations, after the setAttributes state:
  const [productFieldStatus, setProductFieldStatus] = useState<Array<{key: string; label: string; weight: number; complete: boolean}>>([]);
  
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

  // This effect is not needed anymore since we always load assets on mount
  // Alternatively, you could keep it to refresh assets when switching to the assets tab
  useEffect(() => {
    // Refresh assets when switching to assets tab
    if (activeTab === 'assets' && product.id) {
      console.log('Refreshing assets because user navigated to assets tab');
      fetchAssets();
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
      console.log(`Attempting to fetch assets for product ${product.id}`);
      fetchedAssets = await productService.getProductAssets(product.id);
      
      // If we got a valid response with at least one asset
      if (Array.isArray(fetchedAssets) && fetchedAssets.length > 0) {
        console.log('Successfully fetched assets from API:', fetchedAssets.length);
        
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
          console.log(`Using ${cachedAssets.length} cached assets from localStorage`);
          setAssets(cachedAssets);
          setLoadingAssets(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error reading cached assets:', err);
    }
    
    // If we got here, both API and cache failed - use fallback from product images
    console.warn('No assets from API or cache, creating fallback assets from product data');
    
    // Create fallback assets from product images if available
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      console.log('Creating fallback assets from product.images array:', product.images.length);
      const mockAssets: ProductAsset[] = product.images
        .filter(image => !!image.url) // Ensure URL exists
        .map((image, index) => ({
          id: 1000 + index, // Use number IDs for mock assets
          name: `Product Image ${index + 1}`, // Generate a name since ProductImage doesn't have one
          url: image.url,
          type: 'image',
          asset_type: 'image',
          size: "0",
          is_primary: !!image.is_primary || index === 0,
          uploaded_at: new Date().toISOString(),
          uploaded_by: 'system',
          tags: []
        }));
      
      if (mockAssets.length > 0) {
        console.log('Created fallback assets from product images:', mockAssets);
        setAssets(mockAssets);
        
        // Cache these fallback assets
        localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(mockAssets));
        setLoadingAssets(false);
        return;
      }
    } 
    
    // Last resort: if we have a primary image but no images array
    if (product.primary_image_large) {
      console.log('Creating single fallback asset from primary_image_large');
      const mockAsset: ProductAsset = {
        id: 1000, // Use number ID for mock asset
        name: 'Primary Product Image',
        url: product.primary_image_large,
        type: 'image',
        asset_type: 'image',
        size: "0",
        is_primary: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'system',
        tags: []
      };
      
      console.log('Created single mock asset from primary image:', mockAsset);
      setAssets([mockAsset]);
      
      // Cache this fallback asset
      localStorage.setItem(`product_assets_${product.id}`, JSON.stringify([mockAsset]));
    } else {
      // Truly no images available
      console.log('No image data available for this product');
      setAssets([]);
    }
    
    setLoadingAssets(false);
  };

  // Fetch activities from API
  const fetchActivities = async () => {
    if (!product.id) return;
    
    setLoadingActivities(true);
    
    try {
      console.log('Attempting to fetch activities for product ID:', product.id);
      const data = await productService.getProductActivities(product.id);
      
      // Ensure data is always an array
      if (Array.isArray(data) && data.length > 0) {
        console.log('Successfully fetched activities:', data.length);
        setActivities(data);
      } else {
        console.warn('No activities returned from API or invalid response format');
        // Don't override existing activities if we get an empty response
        if (activities.length === 0) {
          console.log('Using mock activities as fallback');
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
        console.log('Using mock activities due to error');
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
  
  // Fetch related products (callback for RelatedProductsCarousel)
  const fetchRelatedProducts = useCallback(async () => {
    if (!product || !product.id) {
      console.warn('Cannot fetch related products: product ID is undefined');
      return;
    }
    
    try {
      // Actually fetch the related products
      await productService.getRelatedProducts(product.id);
      console.log('Related products refreshed successfully');
    } catch (error) {
      console.error('Error refreshing related products:', error);
    }
  }, [product?.id]);
  
  // Fetch the product's attribute set
  const fetchAttributeSet = async () => {
    if (!product.id) return;
    
    setLoadingAttributes(true);
    try {
      // Log the category to debug
      console.log('Product category:', product.category);
      
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
      
      console.log('Using attribute set ID:', setId);
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
  
  // Get the current value for an attribute
  const getAttributeValue = (attributeId: number) => {
    return attributeValues.find(v => 
      v.attributeId === attributeId && v.locale === selectedLocale
    )?.value || null;
  };
  
  // Start editing an attribute
  const handleEditAttribute = (attributeId: number) => {
    // Check if user has permission to edit products
    if (!hasEditPermission) {
      toast.error("You don't have permission to edit product attributes");
      return;
    }
    
    const value = attributeValues.find(v => 
      v.attributeId === attributeId && v.locale === selectedLocale
    );
    
    setEditingAttributeId(attributeId);
    setCurrentEditValue(value?.value || '');
  };
  
  // Cancel editing an attribute
  const handleCancelEdit = () => {
    setCurrentEditValue(null);
    setEditingAttributeId(null);
    setAttributeSaveError(null);
  };
  
  // Validate an attribute value
  const validateAttributeValue = (attributeId: number, value: any): string | null => {
    const attributeDef = availableAttributes.find(def => def.id === attributeId);
    if (!attributeDef) return null;
    
    // Required validation
    if (attributeDef.isMandatory && (value === '' || value === null || value === undefined)) {
      return 'This field is required';
    }
    
    // Type validation
    switch (attributeDef.dataType) {
      case 'number':
        if (isNaN(Number(value))) {
          return 'Must be a valid number';
        }
        break;
      
      case 'text':
        // RegEx validation if specified
        if (attributeDef.validationRule && typeof value === 'string') {
          try {
            const regex = new RegExp(attributeDef.validationRule);
            if (!regex.test(value)) {
              return `Value doesn't match required format`;
            }
          } catch (e) {
            console.error('Invalid regex:', attributeDef.validationRule);
          }
        }
        break;
        
      case 'select':
        // Validate against options
        if (attributeDef.options && attributeDef.options.length > 0) {
          const validOptions = attributeDef.options.map(opt => opt.value);
          if (!validOptions.includes(String(value))) {
            return 'Invalid selection';
          }
        }
        break;
        
      case 'multiselect':
        // Validate each value in array
        if (Array.isArray(value) && attributeDef.options && attributeDef.options.length > 0) {
          const validOptions = attributeDef.options.map(opt => opt.value);
          const invalidValues = value.filter(v => !validOptions.includes(String(v)));
          if (invalidValues.length > 0) {
            return 'Contains invalid selections';
          }
        }
        break;
        
      case 'date':
        // Validate date format
        if (value && !isNaN(Date.parse(String(value)))) {
          return 'Invalid date format';
        }
        break;
      case 'rich_text':
        if (typeof value !== 'string') return 'Must be a string';
        break;
      case 'price':
        if (!value || typeof value !== 'object') return 'Invalid price object';
        if (typeof value.amount !== 'number' || value.amount < 0) return 'Amount must be a non-negative number';
        if (!value.currency || typeof value.currency !== 'string') return 'Currency is required';
        break;
      case 'media':
        if (!value || typeof value !== 'object') return 'Invalid media object';
        if (typeof value.assetId !== 'number' || value.assetId <= 0) return 'Asset ID must be a positive number';
        break;
      case 'measurement':
        if (!value || typeof value !== 'object') return 'Invalid measurement object';
        if (typeof value.amount !== 'number' || value.amount < 0) return 'Amount must be a non-negative number';
        if (!value.unit || typeof value.unit !== 'string') return 'Unit is required';
        break;
      case 'url':
        try { new URL(value) } catch { return 'Invalid URL' }
        break;
      case 'email':
        if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email address';
        break;
      case 'phone':
        if (!/^\+?[1-9]\d{1,14}$/.test(value)) return 'Invalid phone number';
        break;
    }
    
    return null; // No validation errors
  };
  
  // Save the edited attribute value
  const handleSaveAttribute = async (attributeId: number) => {
    // Check if user has permission to edit products
    if (!hasEditPermission) {
      toast.error("You don't have permission to save product attributes");
      return;
    }
    
    const validationError = validateAttributeValue(attributeId, currentEditValue);
    if (validationError) {
      setAttributeSaveError({
        id: attributeId,
        message: validationError,
      });
      return;
    }
    setSavingAttributeId(attributeId);
    setAttributeSaveError(null);
    
    const payload = {
      value: currentEditValue,
      locale: selectedLocale,
    };
    
    try {
      // Check if we need to create or update
      const hasExisting = attributeValues.some(
        v => v.attributeId === attributeId && v.locale === selectedLocale
      );
      
      if (hasExisting) {
        // Update existing attribute value
        await productService.updateAttributeValue(product.id, attributeId, payload);
      } else {
        // Create new attribute value - calls POST instead of PATCH
        await productService.createAttributeValue(product.id, attributeId, payload);
      }
      
      // Refetch values to ensure state is in sync
      await fetchAttributeValues();
      
      // Log activity (call backend if available)
      if (productService.logAttributeActivity) {
        await productService.logAttributeActivity({
          action: 'ATTRIBUTE_VALUE_UPDATED',
          userId: user?.id,
          productId: product.id,
          attributeId,
        });
      }
      
      // Show success message
      const attribute = availableAttributes.find((attr) => attr.id === attributeId);
      toast.success(`${attribute?.name || 'Attribute'} updated successfully`);
      setEditingAttributeId(null);
      setCurrentEditValue(null);
    } catch (error) {
      console.error('Error saving attribute:', error);
      setAttributeSaveError({
        id: attributeId,
        message: 'Failed to save attribute value. Please try again.',
      });
      toast.error('Failed to save attribute');
    } finally {
      setSavingAttributeId(null);
    }
  };
  
  // Add a new attribute (start editing it inline)
  const handleAddAttribute = (attributeId: number) => {
    // Check if user has permission to add attributes
    if (!hasAddPermission) {
      toast.error("You don't have permission to add product attributes");
      return;
    }
    
    const attributeDef = availableAttributes.find((def) => def.id === attributeId);
    if (!attributeDef) return;
    let initialValue: any = '';
    switch (attributeDef.dataType) {
      case 'boolean':
        initialValue = false;
        break;
      case 'number':
        initialValue = 0;
        break;
      case 'multiselect':
        initialValue = [];
        break;
      case 'date':
        initialValue = '';
        break;
      default:
        initialValue = '';
    }
    setEditingAttributeId(attributeId);
    setCurrentEditValue(initialValue);
    // === NEW: add a stub value so the attribute row appears immediately ===
    setAttributeValues(prev => [
      ...prev,
      {
        attributeId,
        value: '',
        locale: selectedLocale,
        updatedAt: new Date().toISOString(),      // fake until saved
      },
    ]);
    setIsAddAttributeOpen(false);
    if (!expandedGroups.includes(attributeDef.groupName)) {
      setExpandedGroups([...expandedGroups, attributeDef.groupName]);
    }
  };
  
  // Get the formatted display value for an attribute
  const getFormattedValue = (attributeId: number) => {
    const value = getAttributeValue(attributeId);
    if (value === null || value === undefined || value === '') return '—';
    
    const attributeDef = availableAttributes.find(def => def.id === attributeId);
    if (!attributeDef) return String(value);
    
    switch (attributeDef.dataType) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'select':
        const option = attributeDef.options?.find(opt => opt.value === value);
        return option?.label || String(value);
      case 'multiselect':
        if (!Array.isArray(value)) return String(value);
        return value.map(v => {
          const opt = attributeDef.options?.find(opt => opt.value === v);
          return opt?.label || String(v);
        }).join(', ');
      case 'date':
        try {
          return format(new Date(String(value)), 'PPP');
        } catch (e) {
          return String(value);
        }
      case 'price': {
        let parsed: any = value
        if (typeof value === 'string') {
          try { parsed = JSON.parse(value) } catch { /* ignore */ }
        }
        if (parsed && typeof parsed === 'object' && 'amount' in parsed) {
          return `${parsed.amount} ${parsed.currency ?? ''}`.trim()
        }
        return String(value)
      }
      case 'measurement': {
        let parsed: any = value
        if (typeof value === 'string') {
          try { parsed = JSON.parse(value) } catch { /* ignore */ }
        }
        if (parsed && typeof parsed === 'object' && 'amount' in parsed) {
          return `${parsed.amount} ${parsed.unit ?? ''}`.trim()
        }
        return String(value)
      }
      case 'url':
        return (
          <a href={String(value)} target='_blank' rel='noopener noreferrer' className='text-primary underline'>
            {String(value)}
          </a>
        ) as unknown as string // cast because function expects string but JSX will be rendered
      case 'email':
      case 'phone':
        return String(value)
      case 'rich_text':
        return (<span dangerouslySetInnerHTML={{ __html: String(value) }} />) as unknown as string
      case 'media': {
        let parsed: any = value
        if (typeof value === 'string') {
          try { parsed = JSON.parse(value) } catch { /* ignore */ }
        }
        if (parsed && typeof parsed === 'object' && 'asset_id' in parsed) {
          return `Asset #${parsed.asset_id}`
        }
        return String(value)
      }
      default:
        return attributeDef.unit ? `${value} ${attributeDef.unit}` : String(value);
    }
  };
  
  // Get the updated timestamp for an attribute
  const getAttributeUpdatedTime = (attributeId: number) => {
    const value = attributeValues.find(v => 
      v.attributeId === attributeId && v.locale === selectedLocale
    );
    if (!value?.updatedAt) return null;
    
    return formatDate(value.updatedAt);
  };
  
  // Filter attributes by group
  const getAttributesByGroup = (groupName: string) => {
    return availableAttributes.filter(def => def.groupName === groupName);
  };
  
  // Get unused attributes for the "Add Attribute" dialog
  const getUnusedAttributes = () => {
    const usedIds = attributeValues.map(v => v.attributeId);   // any locale
    return availableAttributes.filter(attr => !usedIds.includes(attr.id));
  };
  
  // Status text based on percentage
  const getCompletenessStatus = (percentage: number) => {
    if (percentage < 60) return "Poor";
    if (percentage < 80) return "Fair";
    if (percentage < 95) return "Good";
    return "Excellent";
  };
  
  // Helper function to get icon for asset type
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-500" />;
      case 'pdf':
        return <FileTypeIcon className="h-5 w-5 text-red-500" />;
      case '3d':
        return <FileTextIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      display: format(date, 'dd MMM yyyy · HH:mm'),
      relative: formatDistanceToNow(date, { addSuffix: true })
    };
  };

  // Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      <span className="ml-2">Loading...</span>
    </div>
  );
  
  // Render attribute editor based on dataType
  const renderAttributeEditor = (attributeId: number) => {
    const attributeDef = availableAttributes.find(def => def.id === attributeId);
    if (!attributeDef) return null;
    console.debug('Editing attribute:', attributeDef.name, 'type field:', attributeDef.dataType, '/', attributeDef)
    
    const error = attributeSaveError?.id === attributeId ? attributeSaveError.message : null;
    const dt = (attributeDef as any).data_type ?? attributeDef.dataType;
    switch (dt) {
      case 'rich_text':
        return (
          <div data-testid='rich-text-input'>
            <RichTextEditor value={currentEditValue || ''} onChange={setCurrentEditValue} />
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'price':
        return (
          <div data-testid='price-input' className='flex gap-2'>
            <Input
              type='number'
              value={currentEditValue?.amount ?? ''}
              onChange={e => setCurrentEditValue({ ...currentEditValue, amount: Number(e.target.value) })}
              placeholder='Amount'
              className={error ? 'border-red-500' : ''}
            />
            <Select
              value={currentEditValue?.currency || ''}
              onValueChange={currency => setCurrentEditValue({ ...currentEditValue, currency })}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder='Currency' />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c.iso_code} value={c.iso_code}>{c.iso_code} ({c.symbol})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'media':
        return (
          <div data-testid='media-input'>
            {/* Placeholder for MediaPicker */}
            <Input
              type='number'
              value={currentEditValue?.assetId ?? ''}
              onChange={e => setCurrentEditValue({ assetId: Number(e.target.value) })}
              placeholder='Asset ID'
              className={error ? 'border-red-500' : ''}
            />
            {/* TODO: Replace with <MediaPicker assets={assets} ... /> */}
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'measurement':
        return (
          <div data-testid='measurement-input' className='flex gap-2'>
            <Input
              type='number'
              value={currentEditValue?.amount ?? ''}
              onChange={e => setCurrentEditValue({ ...currentEditValue, amount: Number(e.target.value) })}
              placeholder='Amount'
              className={error ? 'border-red-500' : ''}
            />
            <Select
              value={currentEditValue?.unit || ''}
              onValueChange={unit => setCurrentEditValue({ ...currentEditValue, unit })}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder='Unit' />
              </SelectTrigger>
              <SelectContent>
                {units.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'url':
        return (
          <div data-testid='url-input'>
            <Input
              type='url'
              value={currentEditValue || ''}
              onChange={e => setCurrentEditValue(e.target.value)}
              placeholder='Enter URL'
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'email':
        return (
          <div data-testid='email-input'>
            <Input
              type='email'
              value={currentEditValue || ''}
              onChange={e => setCurrentEditValue(e.target.value)}
              placeholder='Enter email'
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'phone':
        return (
          <div data-testid='phone-input'>
            <Input
              type='tel'
              value={currentEditValue || ''}
              onChange={e => setCurrentEditValue(e.target.value)}
              placeholder='Enter phone number'
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className='text-xs text-red-500'>{error}</p>}
          </div>
        )
      case 'text':
        return (
          <div className="space-y-2 w-full">
            <Input
              value={currentEditValue || ''}
              onChange={(e) => setCurrentEditValue(e.target.value)}
              placeholder={`Enter ${attributeDef.name}${attributeDef.unit ? ` (${attributeDef.unit})` : ''}`}
              className={error ? 'border-red-500' : ''}
              aria-required={attributeDef.isMandatory}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2 w-full">
            <div className="flex items-center">
              <Input
                type="number"
                value={currentEditValue === null ? '' : currentEditValue}
                onChange={(e) => setCurrentEditValue(e.target.valueAsNumber || '')}
                placeholder={`Enter ${attributeDef.name}`}
                className={`${error ? 'border-red-500' : ''} ${attributeDef.unit ? 'rounded-r-none' : ''}`}
                aria-required={attributeDef.isMandatory}
              />
              {attributeDef.unit && (
                <div className="bg-slate-100 border border-l-0 border-input px-3 py-2 rounded-r-md text-sm text-slate-600">
                  {attributeDef.unit}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(currentEditValue)}
              onCheckedChange={(checked) => setCurrentEditValue(checked)}
              aria-required={attributeDef.isMandatory}
            />
            <span className="text-sm text-slate-500">
              {Boolean(currentEditValue) ? 'Yes' : 'No'}
            </span>
            {error && <p className="text-xs text-red-500 ml-2">{error}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2 w-full">
            <Select
              value={String(currentEditValue) || ''}
              onValueChange={(value) => setCurrentEditValue(value)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select ${attributeDef.name}`} />
              </SelectTrigger>
              <SelectContent>
                {attributeDef.options?.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
        
      case 'multiselect':
        // For multiselect, we need a more complex component with checkboxes
        const selectedValues = Array.isArray(currentEditValue) ? currentEditValue : [];
        
        return (
          <div className="space-y-2 w-full">
            <div className={`border p-2 rounded-md max-h-40 overflow-y-auto ${error ? 'border-red-500' : 'border-input'}`}>
              {attributeDef.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`option-${option.id}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCurrentEditValue([...selectedValues, option.value]);
                      } else {
                        setCurrentEditValue(
                          selectedValues.filter((value) => value !== option.value)
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`option-${option.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-2 w-full">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${error ? 'border-red-500' : ''}`}
                  aria-required={attributeDef.isMandatory}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {currentEditValue ? format(new Date(currentEditValue), 'PPP') : 
                    <span className="text-slate-500">Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={currentEditValue ? new Date(currentEditValue) : undefined}
                  onSelect={(date) => setCurrentEditValue(date ? date.toISOString() : '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
      default:
        console.warn(`Unsupported attribute type: ${dt}`)
        return (
          <Input
            value={currentEditValue || ''}
            onChange={(e) => setCurrentEditValue(e.target.value)}
            placeholder={`Enter ${attributeDef.name}`}
            className={error ? 'border-red-500' : ''}
            aria-required={attributeDef.isMandatory}
          />
        );
    }
  };

  // Render the "Add Attribute" modal
  const renderAddAttributeModal = () => {
    const unusedAttributes = getUnusedAttributes();
    const filteredAttributes = attributeSearchTerm
      ? unusedAttributes.filter(attr => 
          attr.name.toLowerCase().includes(attributeSearchTerm.toLowerCase()) ||
          attr.groupName.toLowerCase().includes(attributeSearchTerm.toLowerCase())
        )
      : unusedAttributes;
      
    return (
      <Dialog open={isAddAttributeOpen} onOpenChange={setIsAddAttributeOpen}>
        <DialogTrigger asChild>
          <Button 
            className="mb-4" 
            disabled={!hasAddPermission}
            onClick={() => {
              if (!hasAddPermission) {
                toast.error("You don't have permission to add attributes");
                return;
              }
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product Attribute</DialogTitle>
            <DialogDescription>
              Select an attribute to add to this product.
            </DialogDescription>
          </DialogHeader>
          
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              placeholder="Search attributes..." 
              value={attributeSearchTerm}
              onValueChange={setAttributeSearchTerm}
            />
            <CommandList>
              <CommandEmpty>No attributes found.</CommandEmpty>
              <CommandGroup>
                {filteredAttributes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    All available attributes have been added to this product.
                  </p>
                ) : (
                  filteredAttributes.map((attr) => (
                    <CommandItem
                      key={attr.id}
                      onSelect={() => handleAddAttribute(attr.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center">
                          <span className="font-medium">{attr.name}</span>
                          {attr.isMandatory && (
                            <span className="ml-2 text-red-500">*</span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <span>{attr.groupName}</span>
                          <span className="mx-1">•</span>
                          <span>{attr.dataType}</span>
                          {attr.unit && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{attr.unit}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
          
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setIsAddAttributeOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Create a state for the new attribute modal
  const [isCreateAttributeOpen, setIsCreateAttributeOpen] = useState(false);
  const [newAttributeData, setNewAttributeData] = useState<{
    name: string;
    groupId?: number;
    groupName: string;
    dataType: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'rich_text' | 'price' | 'media' | 'measurement' | 'url' | 'email' | 'phone';
    unit?: string;
    isMandatory: boolean;
    options: Array<{ value: string; label: string; id?: number }>;
    validationRule?: string;
  }>({
    name: '',
    groupName: '',
    dataType: 'text',
    isMandatory: false,
    options: [],
  });
  const [creatingAttribute, setCreatingAttribute] = useState(false);
  const [newOptionInput, setNewOptionInput] = useState({ value: '', label: '' });
  const [newGroupInput, setNewGroupInput] = useState('');

  // Handle creating a new attribute
  const handleCreateAttribute = async () => {
    // Validate the form
    if (!newAttributeData.name.trim()) {
      toast.error('Attribute name is required');
      return;
    }

    if (!newAttributeData.groupName.trim()) {
      toast.error('Group is required');
      return;
    }

    // For select/multiselect, ensure we have options
    if (['select', 'multiselect'].includes(newAttributeData.dataType) && newAttributeData.options.length === 0) {
      toast.error('Select/multiselect attributes must have at least one option');
      return;
    }

    setCreatingAttribute(true);
    try {
      // Create the attribute
      if (attributeSetId) {
        console.log('Creating attribute:', JSON.stringify(newAttributeData));
        
        // Add development mock mode for testing
        if (process.env.NODE_ENV === 'development') {
          // Map options to include id for each option
          const optionsWithId: AttributeOption[] = newAttributeData.options.map((option, index) => ({
            id: option.id || index + 1, // Use existing id or create a new one
            value: option.value,
            label: option.label
          }));

          // Create a fake response with ID that matches AvailableAttribute type
          const mockAttribute: AvailableAttribute = {
            id: Math.floor(Math.random() * 1000) + 100,
            name: newAttributeData.name,
            groupId: newAttributeData.groupId || Math.floor(Math.random() * 100) + 1, // Ensure groupId is not optional
            groupName: newAttributeData.groupName,
            dataType: newAttributeData.dataType,
            unit: newAttributeData.unit,
            isMandatory: newAttributeData.isMandatory,
            options: optionsWithId,
            validationRule: newAttributeData.validationRule,
            createdAt: new Date().toISOString()
          };
          
          // Add to available attributes
          setAvailableAttributes(prev => [...prev, mockAttribute]);
          
          // Add the group if it doesn't exist
          const groupExists = attributeGroups.some(g => g.name === mockAttribute.groupName);
          if (!groupExists) {
            setAttributeGroups(prev => [
              ...prev, 
              { 
                id: mockAttribute.groupId, // Use the same ID for consistency
                name: mockAttribute.groupName 
              }
            ]);
          }
          
          // Expand the group
          if (!expandedGroups.includes(mockAttribute.groupName)) {
            setExpandedGroups(prev => [...prev, mockAttribute.groupName]);
          }
          
          // Also add an initial value so it appears in the list
          setAttributeValues(prev => [
            ...prev,
            {
              attributeId: mockAttribute.id,
              value: '',
              locale: selectedLocale,
              updatedAt: new Date().toISOString(),
            },
          ]);
          
          // Success message
          toast.success('Attribute created successfully (Mock)');
          setIsCreateAttributeOpen(false);
          
          // Reset form
          setNewAttributeData({
            name: '',
            groupName: '',
            dataType: 'text',
            isMandatory: false,
            options: [],
          });
          
          setCreatingAttribute(false);
          return;
        }
        
        // Real API call
        const createdAttribute = await productService.createAttribute(
          attributeSetId,
          newAttributeData
        );

        // Reset the form
        setNewAttributeData({
          name: '',
          groupName: '',
          dataType: 'text',
          isMandatory: false,
          options: [],
        });

        // Refresh attribute data
        await fetchAvailableAttributes(attributeSetId);
        
        // Show success message
        toast.success('Attribute created successfully');
        
        // Close the modal
        setIsCreateAttributeOpen(false);
      } else {
        toast.error('Attribute set ID is missing');
      }
    } catch (error) {
      console.error('Error creating attribute:', error);
      toast.error('Failed to create attribute');
    } finally {
      setCreatingAttribute(false);
    }
  };

  // Handle adding an option to a select/multiselect attribute
  const handleAddOption = () => {
    if (!newOptionInput.value.trim() || !newOptionInput.label.trim()) {
      toast.error('Both value and label are required');
      return;
    }

    setNewAttributeData(prev => ({
      ...prev,
      options: [...prev.options, { 
        ...newOptionInput,
        id: prev.options.length + 1 // Add id when creating options
      }]
    }));

    setNewOptionInput({ value: '', label: '' });
  };

  // Handle removing an option
  const handleRemoveOption = (index: number) => {
    setNewAttributeData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Render the "Create Attribute" modal
  const renderCreateAttributeModal = () => {
    return (
      <Dialog open={isCreateAttributeOpen} onOpenChange={setIsCreateAttributeOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4 ml-2">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Attribute
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Attribute</DialogTitle>
            <DialogDescription>
              Define a new attribute for products in this category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Attribute Name */}
            <div className="space-y-2">
              <Label htmlFor="attr-name" className="font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="attr-name"
                value={newAttributeData.name}
                onChange={(e) => setNewAttributeData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Weight, Color, Material"
              />
            </div>

            {/* Attribute Group */}
            <div className="space-y-2">
              <Label htmlFor="attr-group" className="font-medium">
                Group <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col space-y-2">
                <Select
                  value={newAttributeData.groupName}
                  onValueChange={(value) => {
                    if (value === "new-group") {
                      // Keep the previous value until a new one is confirmed
                      return;
                    }
                    setNewAttributeData(prev => ({
                      ...prev,
                      groupName: value,
                      groupId: attributeGroups.find(g => g.name === value)?.id
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributeGroups.map(group => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new-group">+ Create new group</SelectItem>
                  </SelectContent>
                </Select>

                {/* New Group Input (shows when "Create new group" is selected) */}
                {newAttributeData.groupName === "new-group" && (
                  <div className="flex space-x-2">
                    <Input
                      value={newGroupInput}
                      onChange={(e) => setNewGroupInput(e.target.value)}
                      placeholder="New group name"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (newGroupInput.trim()) {
                          setNewAttributeData(prev => ({
                            ...prev,
                            groupName: newGroupInput.trim(),
                            groupId: undefined // Backend will create a new group
                          }));
                          setNewGroupInput('');
                        } else {
                          toast.error('Group name cannot be empty');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Data Type */}
            <div className="space-y-2">
              <Label htmlFor="attr-type" className="font-medium">
                Data Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newAttributeData.dataType}
                onValueChange={(value: any) => setNewAttributeData(prev => ({ ...prev, dataType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                  <SelectItem value="select">Select (Single Choice)</SelectItem>
                  <SelectItem value="multiselect">Multi-select (Multiple Choice)</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="rich_text">Rich Text</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="measurement">Measurement</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unit (for number or text) */}
            {['number', 'text'].includes(newAttributeData.dataType) && (
              <div className="space-y-2">
                <Label htmlFor="attr-unit" className="font-medium">
                  Unit (Optional)
                </Label>
                <Input
                  id="attr-unit"
                  value={newAttributeData.unit || ''}
                  onChange={(e) => setNewAttributeData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., kg, cm, units"
                />
              </div>
            )}

            {/* Options (for select/multiselect) */}
            {['select', 'multiselect'].includes(newAttributeData.dataType) && (
              <div className="space-y-2">
                <Label className="font-medium">
                  Options <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Value (e.g., red)"
                      value={newOptionInput.value}
                      onChange={(e) => setNewOptionInput(prev => ({ ...prev, value: e.target.value }))}
                    />
                    <Input
                      placeholder="Label (e.g., Red)"
                      value={newOptionInput.label}
                      onChange={(e) => setNewOptionInput(prev => ({ ...prev, label: e.target.value }))}
                    />
                    <Button variant="outline" onClick={handleAddOption}>Add</Button>
                  </div>
                  
                  {/* List of options */}
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {newAttributeData.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{option.label}</span>
                          <span className="text-xs text-slate-500 ml-2">({option.value})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Rule */}
            {newAttributeData.dataType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="attr-validation" className="font-medium">
                  Validation Rule (Optional)
                </Label>
                <Input
                  id="attr-validation"
                  value={newAttributeData.validationRule || ''}
                  onChange={(e) => setNewAttributeData(prev => ({ ...prev, validationRule: e.target.value }))}
                  placeholder="RegEx pattern, e.g. ^[0-9]{4}\\.[0-9]{2}\\.[0-9]{4}$"
                />
                <p className="text-xs text-slate-500">
                  Use regular expressions to validate input format.
                </p>
              </div>
            )}

            {/* Required Field */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="attr-required"
                checked={newAttributeData.isMandatory}
                onCheckedChange={(checked) => 
                  setNewAttributeData(prev => ({ ...prev, isMandatory: !!checked }))
                }
              />
              <Label
                htmlFor="attr-required"
                className="font-medium cursor-pointer"
              >
                This attribute is required
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateAttributeOpen(false)}
              disabled={creatingAttribute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAttribute}
              disabled={creatingAttribute}
            >
              {creatingAttribute ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Creating...
                </span>
              ) : (
                'Create Attribute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Fix 5: Refresh after locale switch
  useEffect(() => {
    if (product.id) {
      fetchAttributeValues();
    }
  }, [selectedLocale, product.id]);

  // Handle asset update from AssetsTab (set primary image)
  const handleAssetUpdate = async (updatedAssets: ProductAsset[]) => {
    console.log('ProductDetailTabs received updated assets:', updatedAssets);
    
    // Sort assets to display primary first
    const sortedAssets = [...updatedAssets].sort((a, b) => {
      // Primary images always come first
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      
      // If both are primary or both are not, sort by upload date (newest first)
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });
    
    // Helper function to check if asset is an image - using consistent detection logic
    const isImageAsset = (asset: ProductAsset): boolean => {
      if (!asset || !asset.url) return false;
      
      // Check file extensions
      const name = (asset.name || '').toLowerCase();
      const url = (asset.url || '').toLowerCase();
      const type = (asset.type || asset.asset_type || '').toLowerCase();
      
      // Check for image file extensions
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
      const hasImageExt = imageExtensions.some(ext => 
        name.endsWith(`.${ext}`) || url.endsWith(`.${ext}`)
      );
      
      // Check MIME type
      const isImageType = type.includes('image') || type === 'image';
      
      // Debug logging
      console.log(`[handleAssetUpdate] Asset check: ${asset.name}, type: ${type}, hasImageExt: ${hasImageExt}, isImageType: ${isImageType}, url: ${asset.url}`);
      
      return hasImageExt || isImageType;
    };
    
    // Find primary image to update product
    const primaryAsset = sortedAssets.find(asset => asset.is_primary && isImageAsset(asset));
    
    if (primaryAsset) {
      console.log('Setting primary image:', primaryAsset.url);
      
      // Create product images array with proper typing for ProductImage
      const updatedImages = sortedAssets
        .filter(asset => isImageAsset(asset))
        .map((asset, index) => ({
          id: typeof asset.id === 'string' ? parseInt(asset.id, 10) : Number(asset.id), // Convert to number
          url: asset.url,
          is_primary: asset.is_primary || false,
          order: index // Use index as order
        }));
      
      // Update product with sorted assets and primary image URL
      const updatedProduct = {
        ...product,
        primary_image_thumb: primaryAsset.url,
        primary_image_large: primaryAsset.url,
        images: updatedImages,
        assets: sortedAssets // Add the full assets array to the product
      };
      
      // Log what we're passing to the parent
      console.log('Updating product with primary image:', updatedProduct.primary_image_thumb);
      
      // Update localStorage if needed
      if (product.id) {
        try {
          const storedProduct = localStorage.getItem(`product_${product.id}`);
          if (storedProduct) {
            const parsedProduct = JSON.parse(storedProduct);
            localStorage.setItem(`product_${product.id}`, JSON.stringify({
              ...parsedProduct,
              primary_image_thumb: primaryAsset.url,
              primary_image_large: primaryAsset.url,
              images: updatedImages
            }));
            console.log('Updated product in localStorage with new primary image');
          }
        } catch (err) {
          console.error('Error updating product in localStorage:', err);
        }
        
        // Persist the changes to the backend
        try {
          // Send the updated product to the server
          await productService.updateProduct(product.id, {
            primary_image_thumb: primaryAsset.url,
            primary_image_large: primaryAsset.url,
            images: updatedImages
          });
          console.log('Successfully persisted primary image update to server');
          
          // Force a refresh of assets to ensure we have the latest data
          await fetchAssets();
        } catch (err) {
          console.error('Error persisting primary image update to server:', err);
          toast.error('Failed to save primary image change');
        }
      }
      
      // Ensure we pass the updated product to the parent
      // Do NOT call onProductUpdate after asset upload to avoid unnecessary reloads
      // if (onProductUpdate) {
      //   console.log('Calling onProductUpdate with updated product');
      //   onProductUpdate(updatedProduct);
      // }
    } else {
      console.warn('No primary image found among assets');
    }
    
    // Always update assets even if no primary image found
    setAssets(sortedAssets);
  };

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
          
          // Log product structure to help debug category and GTIN issues
          console.log('Product structure for completeness check:', {
            id: product.id,
            hasCategory: !!product.category,
            categoryType: Array.isArray(product.category) ? 'array' : typeof product.category,
            categoryLength: Array.isArray(product.category) ? product.category.length : 'N/A',
            hasBarcode: !!product.barcode,
            barcode: product.barcode
          });
            
          // Use the dashboardService to fetch product completeness with organization_id and product_id
          const completenessData = await dashboardService.getIncompleteProducts({
            organization_id: organizationId,
            product_id: product.id
          });
          
          // If data array is returned (expected), take the first element
          if (Array.isArray(completenessData) && completenessData.length > 0) {
            setProductCompletenessDetails(completenessData[0]);
            
            // Log the completeness details to debug
            console.log('Product completeness details:', {
              completeness: completenessData[0].completeness,
              missingFieldsCount: completenessData[0].missing_fields_count,
              missingFields: completenessData[0].missing_fields.map(f => f.field)
            });
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
    axiosInstance.get('/api/currencies').then(res => setCurrencies(res.data)).catch(() => setCurrencies([]))
    axiosInstance.get(`/api/products/${product.id}/assets/`).then(res => setAssets(res.data)).catch(() => setAssets([]))
  }, [product.id])

  // 1. Add this helper function inside ProductDetailTabs:
  function handleAddGroupAttributes(groupName: string) {
    if (!hasAddPermission) {
      toast.error('You do not have permission to add attributes')
      return
    }
    const groupAttrs = getAttributesByGroup(groupName)
    const usedIds = attributeValues.map(v => v.attributeId)
    const unusedAttrs = groupAttrs.filter(attr => !usedIds.includes(attr.id))
    if (unusedAttrs.length === 0) {
      toast('All attributes in this group are already added')
      return
    }
    unusedAttrs.forEach(attr => handleAddAttribute(attr.id))
    toast.success(`Added ${unusedAttrs.length} attributes from group '${groupName}'`)
  }

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(value) => {
        // Prevent default scroll behavior when changing tabs
        const currentPosition = window.scrollY;
        setActiveTab(value);
        // Small timeout to ensure we override any potential scroll effects
        setTimeout(() => window.scrollTo(0, currentPosition), 0);
      }}
      className="w-full"
      defaultValue="overview"
    >
      <TabsList className="w-full border-b bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          Overview
        </TabsTrigger>
        {ENABLE_CUSTOM_ATTRIBUTES && (
          <TabsTrigger
            value="attributes"
            className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <Layers className="h-4 w-4 mr-2" />
            Attributes
          </TabsTrigger>
        )}
        <TabsTrigger
          value="assets"
          className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <FileIcon className="h-4 w-4 mr-2" />
          Assets
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </TabsTrigger>
        <TabsTrigger value="price">Price</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
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
              productId={product.id}
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
            <CardTitle>Media</CardTitle>
            <CardDescription>
              Product images and photos
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
                  
                  console.log(`[MediaCard] Found ${imageAssets.length} valid image assets`);
                  
                  if (imageAssets.length > 0) {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {imageAssets
                          .sort((a, b) => (a.is_primary && !b.is_primary) ? -1 : (!a.is_primary && b.is_primary) ? 1 : 0)
                          .slice(0, 4)
                          .map((asset, index) => {
                            const src = getAssetUrl(asset)!; // non-null because we filtered already
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
                                      Primary
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
                        <p>No images available yet</p>
                        {hasEditPermission && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-4"
                            onClick={() => setActiveTab('assets')}
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Images
                          </Button>
                        )}
                      </div>
                    );
                  }
                })()}
                
                {/* Show "View All" button if there are images */}
                {assets.filter(isImageAsset).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('assets')}
                    >
                      View All Images
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Related Products */}
        <RelatedProductsPanel 
          productId={product.id} 
          onRefresh={() => {/* handle refresh if needed */}}
        />
      </TabsContent>
      
      <TabsContent value="attributes" className="space-y-6">
        {ENABLE_CUSTOM_ATTRIBUTES && (
          <ProductAttributesPanel 
            productId={product.id ? String(product.id) : undefined} 
            locale={selectedLocale} 
          />
        )}
      </TabsContent>
      
      <TabsContent value="assets">
        <AssetsTab 
          product={product} 
          onAssetUpdate={handleAssetUpdate}
        />
      </TabsContent>
      
      <TabsContent value="history" className="space-y-6">
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <ProductHistoryTab productId={product.id} />
        </Suspense>
      </TabsContent>
      <TabsContent value="price">
        <PriceTab 
          productId={product.id} 
          prices={prices}
          isPricesLoading={isPricesLoading}
          onPricesUpdated={async () => await onProductUpdate(product)}
        />
      </TabsContent>
    </Tabs>
  );
};

// Helper to get activity text
function getActivityActionText(type: string): string {
  switch (type) {
    case 'create':
      return 'created this product';
    case 'update':
      return 'updated this product';
    case 'asset_add':
      return 'added assets';
    case 'status_change':
      return 'changed status';
    default:
      return 'modified this product';
  }
} 