import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Product, productService, ProductAttribute, ProductAsset, ProductActivity, ProductVersion, PriceHistory, PRODUCTS_API_URL as PRODUCTS_PATH, ProductImage } from '@/services/productService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ImageIcon, FileIcon, FileTypeIcon, FileTextIcon, Clipboard, CalendarIcon, 
  History, AlertTriangle, PlusIcon, PencilIcon, AlertCircle, RefreshCcw,
  Check, ChevronDown, ChevronRight, Save, X, Edit2, Calendar, Flag, Pin, InfoIcon,
  List, Settings, Layers
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
import RelatedProductsCarousel from './RelatedProductsCarousel';
// Import the AssetsTab component
import { AssetsTab } from './AssetsTab';
import { Skeleton } from "@/components/ui/skeleton";
import ProductHistoryTab from './ProductHistoryTab';
import { Suspense } from 'react';
import AttributesTab from './AttributesTab';
import { ENABLE_CUSTOM_ATTRIBUTES } from '@/config/featureFlags';
import { PermissionGuard } from '@/components/common/PermissionGuard';

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
  dataType: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  unit?: string;
  isMandatory: boolean;
  options?: AttributeOption[];
  validationRule?: string;
  createdAt: string;
}

// Attribute value assigned to a product
interface AttributeValue {
  attributeId: number;
  value: string | number | boolean | Array<string | number>;
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
  onProductUpdate?: (updatedProduct: Product) => void;
}

export const ProductDetailTabs: React.FC<ProductDetailTabsProps> = ({ product, onProductUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // States for dynamic data
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [activities, setActivities] = useState<ProductActivity[]>([]);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  
  // States for the enhanced attributes tab
  const [availableAttributes, setAvailableAttributes] = useState<AvailableAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<any>(null);
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [selectedLocale, setSelectedLocale] = useState('en-US');
  const [availableLocales, setAvailableLocales] = useState(['en-US', 'es-ES', 'fr-FR', 'de-DE']);
  const [savingAttributeId, setSavingAttributeId] = useState<number | null>(null);
  const [attributeSaveError, setAttributeSaveError] = useState<{id: number, message: string} | null>(null);
  const [attributeSetId, setAttributeSetId] = useState<number | null>(null);
  
  // Data completeness state
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  // Loading states
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingAttributeDefinitions, setLoadingAttributeDefinitions] = useState(false);
  
  // Get current user and permissions from auth context
  const { user, checkPermission } = useAuth();
  
  // Permissions check
  const hasViewPermission = checkPermission('product.view');
  const hasEditPermission = checkPermission('product.change');
  const hasAddPermission = checkPermission('product.add');
  const hasRevertPermission = checkPermission('product.revert');
  
  // Load data when component mounts or product changes
  useEffect(() => {
    if (product.id) {
      fetchAttributes();
      // Always fetch assets on initial load, regardless of activeTab
      fetchAssets();
      fetchActivities();
      fetchVersions();
      fetchPriceHistory();
      
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
      fetchedAssets = await productService.getProductAssets(product.id);
      
      // If we got a valid response with at least one asset
      if (Array.isArray(fetchedAssets) && fetchedAssets.length > 0) {
        console.log('Successfully fetched assets from API:', fetchedAssets.length);
        setAssets(fetchedAssets);
        
        // Cache the assets in localStorage
        localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(fetchedAssets));
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
    
    // If we got here, both API and cache failed - use fallback
    console.warn('No assets from API or cache, using fallback data');
    
    // Create mock assets from product images if available
    if (product.images && product.images.length > 0) {
      const mockAssets = product.images.map((image, index) => ({
        id: 1000 + index, // Use number IDs for mock assets
        name: `Product Image ${index + 1}`,
        url: image.url,
        type: 'image',
        size: "0",
        is_primary: image.is_primary || index === 0,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'system'
      }));
      console.log('Created mock assets from product images:', mockAssets);
      setAssets(mockAssets);
    } else if (product.primary_image_large) {
      // If no images array but has primary image, create a single mock asset
      const mockAsset = {
        id: 1000, // Use number ID for mock asset
        name: 'Primary Product Image',
        url: product.primary_image_large,
        type: 'image',
        size: "0",
        is_primary: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'system'
      };
      console.log('Created single mock asset from primary image:', mockAsset);
      setAssets([mockAsset]);
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

  // Fetch versions from API
  const fetchVersions = async () => {
    if (!product.id) return;
    
    setLoadingVersions(true);
    
    try {
      console.log('Attempting to fetch versions for product ID:', product.id);
      const data = await productService.getProductVersions(product.id);
      
      // Ensure data is always an array
      if (Array.isArray(data) && data.length > 0) {
        console.log('Successfully fetched versions:', data.length);
        setVersions(data);
      } else {
        console.warn('No versions returned from API or invalid response format');
        // Don't override existing versions if we get an empty response
        if (versions.length === 0) {
          console.log('Using mock versions as fallback');
          // Fallback to mock data if API fails
          setVersions([
            { id: 1, version: 'v1.0', timestamp: '2023-10-01T09:00:00Z', user: 'John Doe', summary: 'Initial version' },
            { id: 2, version: 'v1.1', timestamp: '2023-10-05T14:30:00Z', user: 'John Doe', summary: 'Price update' },
            { id: 3, version: 'v1.2', timestamp: '2023-10-12T11:45:00Z', user: 'Mike Johnson', summary: 'Description update' },
            { id: 4, version: 'v1.3', timestamp: '2023-10-20T16:00:00Z', user: 'Mike Johnson', summary: 'Status change' },
            { id: 5, version: 'v1.4', timestamp: '2023-11-05T09:15:00Z', user: 'John Doe', summary: 'Category update' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      // Only use fallback if no existing data
      if (versions.length === 0) {
        console.log('Using mock versions due to error');
        // Fallback to mock data if API fails
        setVersions([
          { id: 1, version: 'v1.0', timestamp: '2023-10-01T09:00:00Z', user: 'John Doe', summary: 'Initial version' },
          { id: 2, version: 'v1.1', timestamp: '2023-10-05T14:30:00Z', user: 'John Doe', summary: 'Price update' },
          { id: 3, version: 'v1.2', timestamp: '2023-10-12T11:45:00Z', user: 'Mike Johnson', summary: 'Description update' },
          { id: 4, version: 'v1.3', timestamp: '2023-10-20T16:00:00Z', user: 'Mike Johnson', summary: 'Status change' },
          { id: 5, version: 'v1.4', timestamp: '2023-11-05T09:15:00Z', user: 'John Doe', summary: 'Category update' },
        ]);
      }
    } finally {
      setLoadingVersions(false);
    }
  };

  // Fetch price history
  const fetchPriceHistory = async () => {
    if (!product.id) return;
    
    try {
      console.log('Attempting to fetch price history for product ID:', product.id);
      const data = await productService.getPriceHistory(product.id);
      
      // Ensure data is always an array
      if (Array.isArray(data) && data.length > 0) {
        console.log('Successfully fetched price history:', data.length);
        setPriceHistory(data);
      } else {
        console.warn('No price history returned from API or invalid response format');
        // Don't override existing price history if we get an empty response
        if (priceHistory.length === 0) {
          console.log('Using mock price history as fallback');
          // Fallback to mock data if API fails
          setPriceHistory([
            { date: '2023-11-10', oldPrice: '85.00', newPrice: '89.99', user: 'John Doe' },
            { date: '2023-09-25', oldPrice: '79.99', newPrice: '85.00', user: 'Jane Smith' },
            { date: '2023-08-15', oldPrice: '75.00', newPrice: '79.99', user: 'Mike Johnson' },
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      // Only use fallback if no existing data
      if (priceHistory.length === 0) {
        console.log('Using mock price history due to error');
        // Fallback to mock data if API fails
        setPriceHistory([
          { date: '2023-11-10', oldPrice: '85.00', newPrice: '89.99', user: 'John Doe' },
          { date: '2023-09-25', oldPrice: '79.99', newPrice: '85.00', user: 'Jane Smith' },
          { date: '2023-08-15', oldPrice: '75.00', newPrice: '79.99', user: 'Mike Johnson' },
        ]);
      }
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
    
    setLoadingAttributeDefinitions(true);
    try {
      // Log the category to debug
      console.log('Product category:', product.category);
      
      // Check for common automotive/vehicle categories with null guard
      const isAutomotive = Boolean(product.category) &&
        ['automotive', 'cars', 'vehicles', 'auto'].some(
          cat => product.category!.toLowerCase().includes(cat)
        );
      
      // Get attribute set ID based on category or use a hardcoded value
      const setId = product.category === 'Electronics' ? 1 : 
                    product.category === 'Furniture' ? 2 : 
                    isAutomotive ? 3 : 3; // Default to 3 (Automotive)
      
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
    } finally {
      setLoadingAttributeDefinitions(false);
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
  
  // Calculate data completeness percentage and missing fields
  const calculateCompleteness = () => {
    if (!product) return { percentage: 0, missingFields: [], fieldStatus: [] };
    
    // Define required fields that should be present for completeness
    const fieldDefinitions = [
      { key: 'name', label: 'Name', weight: 2 },
      { key: 'sku', label: 'SKU', weight: 2 },
      { key: 'price', label: 'Price', weight: 2 },
      { key: 'description', label: 'Description', weight: 1.5 },
      { key: 'category', label: 'Category', weight: 1.5 },
      { key: 'brand', label: 'Brand', weight: 1 },
      { key: 'barcode', label: 'GTIN/Barcode', weight: 1 },
      { key: 'tags', label: 'Tags', weight: 1 },
      { key: 'images', label: 'Images', weight: 1 }
    ];
    
    // Check which fields are complete
    const fieldsStatus = fieldDefinitions.map(field => {
      const value = product[field.key as keyof Product];
      let isComplete = false;
      
      if (field.key === 'tags') {
        isComplete = Array.isArray(value) && value.length > 0;
      } else if (field.key === 'images') {
        isComplete = Array.isArray(value) && value.length > 0 || !!product.primary_image_large;
      } else if (field.key === 'price') {
        isComplete = typeof value === 'number' && value > 0;
      } else {
        isComplete = !!value && (typeof value !== 'string' || value.trim() !== '');
      }
      
      return {
        ...field,
        complete: isComplete
      };
    });
    
    // Process attribute values and identify mandatory attributes
    const mandatoryAttributes = Array.isArray(attributes) && Array.isArray(availableAttributes)
      ? availableAttributes
          .filter(attr => attr.isMandatory)
          .map(attrDef => {
            // Find if this attribute has a value for this product
            const attrValue = attributes.find(attr => 
              attr.attributeId === attrDef.id && 
              attr.locale === selectedLocale
            );
            
            return {
              key: `attr_${attrDef.id}`,
              label: attrDef.groupName ? `${attrDef.groupName}: ${attrDef.name}` : attrDef.name,
              weight: 1.5, // Give mandatory attributes higher weight
              complete: !!attrValue && 
                       attrValue.value !== null && 
                       attrValue.value !== undefined && 
                       (typeof attrValue.value !== 'string' || attrValue.value.trim() !== '')
            };
          })
      : [];
    
    // Combine all fields
    const allFields = [...fieldsStatus, ...mandatoryAttributes];
    
    // Calculate weighted percentage
    const totalWeight = allFields.reduce((sum, field) => sum + field.weight, 0);
    const completedWeight = allFields
      .filter(field => field.complete)
      .reduce((sum, field) => sum + field.weight, 0);
    
    const percentage = Math.round((completedWeight / totalWeight) * 100);
    
    // Get missing fields
    const missingFields = allFields
      .filter(field => !field.complete)
      .map(field => field.label);
    
    return { 
      percentage, 
      missingFields,
      fieldStatus: allFields
    };
  };

  const { 
    percentage: completenessPercentage, 
    missingFields,
    fieldStatus 
  } = calculateCompleteness();
  
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
    
    const error = attributeSaveError?.id === attributeId ? attributeSaveError.message : null;
    
    switch (attributeDef.dataType) {
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
    dataType: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
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
    
    // Find primary image to update product
    const primaryAsset = sortedAssets.find(asset => asset.is_primary && asset.type?.toLowerCase() === 'image');
    
    if (primaryAsset) {
      console.log('Setting primary image:', primaryAsset.url);
      
      // Create product images array with proper typing for ProductImage
      const updatedImages = sortedAssets
        .filter(asset => asset.type?.toLowerCase() === 'image')
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
        images: updatedImages
      };
      
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
      
      // Update local state
      onProductUpdate(updatedProduct);
    }
    
    // Always update assets even if no primary image found
    setAssets(sortedAssets);
  };

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
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
        {/* Data Completeness Card */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Data Completeness</CardTitle>
            <CardDescription>
              Track the completeness of your product data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Data Completeness Content */}
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completeness</span>
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      completenessPercentage < 60 ? 'text-red-500' :
                      completenessPercentage < 80 ? 'text-amber-500' :
                      completenessPercentage < 95 ? 'text-emerald-500' :
                      'text-blue-500'
                    }`}>
                      {completenessPercentage}% - {getCompletenessStatus(completenessPercentage)}
                    </span>
                    <Button 
                      variant="ghost" 
                      className="p-0 h-auto ml-1"
                      onClick={() => setShowDrilldown(true)}
                    >
                      <InfoIcon className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
                
                <Progress 
                  value={completenessPercentage} 
                  className={`h-2 ${
                    completenessPercentage < 60 ? 'bg-red-100' :
                    completenessPercentage < 80 ? 'bg-amber-100' :
                    completenessPercentage < 95 ? 'bg-emerald-100' :
                    'bg-blue-100'
                  }`} 
                />
              </div>
              
              {/* Missing fields */}
              {missingFields.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                    <span className="text-sm font-medium">Missing information</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {missingFields.slice(0, 5).map((field, index) => (
                      <Badge key={index} variant="outline" className="bg-slate-50">
                        {field}
                      </Badge>
                    ))}
                    {missingFields.length > 5 && (
                      <Badge variant="outline" className="bg-slate-50">
                        +{missingFields.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Completeness drilldown */}
              {showDrilldown && (
                <CompletenessDrilldown
                  open={showDrilldown}
                  onOpenChange={setShowDrilldown}
                  percentage={completenessPercentage}
                  fieldStatus={fieldStatus}
                />
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Media Section - Reuse asset data from the API */}
        <Card>
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
            ) : assets.length > 0 ? (
              // Display first 4 assets (or fewer if less available)
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {assets
                  // Better image filtering to ensure we only show actual images
                  .filter(asset => {
                    // Check file extensions for images
                    const name = (asset.name || '').toLowerCase();
                    const url = (asset.url || '').toLowerCase();
                    const type = (asset.type || '').toLowerCase();
                    
                    // Strict image file extension check
                    const isImageByExt = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(name) || 
                                        /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
                    
                    // Check MIME type
                    const isImageByType = type.includes('image/') && !type.includes('pdf');
                    
                    return isImageByExt || isImageByType;
                  })
                  // Primary images first, then by upload date (newest first)
                  .sort((a, b) => {
                    if (a.is_primary && !b.is_primary) return -1;
                    if (!a.is_primary && b.is_primary) return 1;
                    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
                  })
                  .slice(0, 4)
                  .map((asset, index) => (
                    <div 
                      key={asset.id} 
                      className={cn(
                        "relative aspect-square rounded-md overflow-hidden border border-slate-200",
                        asset.is_primary && "ring-2 ring-primary" // Highlight primary image
                      )}
                    >
                      <img 
                        src={asset.url} 
                        alt={asset.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn('Error loading image asset:', asset.url);
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Image+Error';
                        }}
                      />
                      {asset.is_primary && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-primary/70 text-white border-none text-xs">Primary</Badge>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            ) : (
              // Fallback to product.images if they exist, otherwise show empty state
              product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-slate-200">
                      <img 
                        src={image.url} 
                        alt={`${product.name} - Image ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
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
              )
            )}
            
            {assets.filter(asset => {
              // Check file extensions for images using the same filter as above
              const name = (asset.name || '').toLowerCase();
              const url = (asset.url || '').toLowerCase();
              const type = (asset.type || '').toLowerCase();
              
              // Strict image file extension check
              const isImageByExt = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(name) || 
                                  /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
              
              // Check MIME type
              const isImageByType = type.includes('image/') && !type.includes('pdf');
              
              return isImageByExt || isImageByType;
            }).length > 0 && (
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
          </CardContent>
        </Card>
        
        {/* Related Products */}
        <RelatedProductsCarousel 
          productId={product.id} 
          onRefresh={() => {/* handle refresh if needed */}}
        />
      </TabsContent>
      
      <TabsContent value="attributes" className="space-y-6">
        {ENABLE_CUSTOM_ATTRIBUTES && (
          <AttributesTab productId={product.id} />
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