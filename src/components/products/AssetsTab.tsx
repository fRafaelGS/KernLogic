import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileIcon, FileSpreadsheet, FileText, ImageIcon, 
  Upload, X, RefreshCw, ChevronDown, 
  Filter, PlusCircle, Package, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Product, ProductAsset, productService, AssetBundle, QUERY_KEYS } from '@/services/productService';
import axiosInstance from '@/lib/axiosInstance';
import { useToast } from '@/domains/core/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useProductAssets } from '@/hooks/useProductAssets';
import { invalidateProductAndAssets } from '@/utils/queryInvalidation';
import { config, API_ENDPOINTS } from '@/config/config';

// UI Components
import { Button } from '@/domains/core/components/ui/button';
import { Badge } from '@/domains/core/components/ui/badge';
import { Checkbox } from '@/domains/core/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { Progress } from '@/domains/core/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/domains/core/components/ui/dialog';
import { Input } from '@/domains/core/components/ui/input';
import { DatePickerWithRange } from '@/domains/core/components/ui/date-range-picker';
import { Label } from '@/domains/core/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/domains/core/components/ui/collapsible"
import { ScrollArea } from "@/domains/core/components/ui/scroll-area"
import { Separator } from "@/domains/core/components/ui/separator"
import {
  FileTypeIcon,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Search as SearchIcon,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react"

// Feature flag for the asset gallery
const ENABLE_ASSET_GALLERY = true;

// Add import for AssetCard
import { AssetCard } from '@/domains/products/components/productdetail/AssetCard'
import { useDownloadAsset } from '@/hooks/useDownloadAsset'
import { useBulkDownload } from '@/hooks/useBulkDownload'
import { BundleCard } from '@/components/products/BundleCard'
import { assetTypeService } from '@/services/assetTypeService';
import { BulkDownloadToolbar } from '@/components/products/BulkDownloadToolbar';

// Get product asset configuration
const assetConfig = config.productDetailTabs.assets.assetsTab;

interface AssetTabProps {
  product: Product;
}

// Group assets by base name
interface AssetGroup {
  baseName: string;
  assets: ProductAsset[];
  expanded: boolean;
}

// Interface for tracking file uploads
interface UploadingAsset {
  id: string; // Temporary client ID
  file: File;
  progress: number;
  error: string | null;
  status: 'uploading' | 'error' | 'success';
}

export const AssetsTab: React.FC<AssetTabProps> = ({ product }) => {
  const { toast: uiToast } = useToast();
  const queryClient = useQueryClient();

  // Only proceed if feature flag is enabled
  if (!ENABLE_ASSET_GALLERY) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">{assetConfig.coming_soon}</p>
      </div>
    );
  }

  // Use our hook to manage assets
  const {
    assets,
    isLoading: loading,
    isError,
    error,
    refetch,
    uploadAsset,
    isUploading,
    setPrimaryAsset,
    isSettingPrimary,
    deleteAsset,
    isDeleting
  } = useProductAssets(product.id);

  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [uploading, setUploading] = useState<UploadingAsset[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [isMakingPrimary, setIsMakingPrimary] = useState<number | null>(null);
  
  // State for renaming assets
  const [assetToRename, setAssetToRename] = useState<ProductAsset | null>(null);
  const [newAssetName, setNewAssetName] = useState<string>('');

  // Filter state
  const [filters, setFilters] = useState({
    types: new Set<string>(),
    search: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    tags: new Set<string>() // Add tags filter
  });
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  
  // Bundle dialog state
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundles, setBundles] = useState<AssetBundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);

  // Add state for the sidebar expanded status
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Add state for individual filter sections
  const [typeFilterOpen, setTypeFilterOpen] = useState(true);
  const [dateFilterOpen, setDateFilterOpen] = useState(true);
  const [searchFilterOpen, setSearchFilterOpen] = useState(true);
  const [tagsFilterOpen, setTagsFilterOpen] = useState(true);

  // Add a state to track if the sidebar was manually expanded (to prevent auto-collapse)
  const [manuallyExpanded, setManuallyExpanded] = useState(false);

  // Group assets whenever they change
  useEffect(() => {
    groupAssetsByBaseName();
  }, [assets]);

  // Group assets by base name
  const groupAssetsByBaseName = () => {
    if (!Array.isArray(assets)) {
      console.error('Assets is not an array in groupAssetsByBaseName:', typeof assets, assets);
      return;
    }
    
    // Create a map of baseName -> assets
    const groups = new Map<string, ProductAsset[]>();
    
    // Group assets by baseName
    assets.forEach(asset => {
      // Extract baseName (filename without extension)
      const baseName = asset.name?.split('.')[0] || 'Unknown';
      
      if (!groups.has(baseName)) {
        groups.set(baseName, []);
      }
      
      const group = groups.get(baseName);
      if (group) {
        group.push(asset);
      }
    });
    
    // Convert map to array of groups and sort assets within each group
    // Primary first, then by date (newest first)
    const assetGroups = Array.from(groups.entries()).map(([baseName, groupAssets]) => {
      // Sort assets within group: primary images first, then by upload date
      const sortedAssets = [...groupAssets].sort((a, b) => {
        // Primary images always come first
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        
        // If both are primary or both aren't, sort by upload date (newest first)
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      });
      
      return {
        baseName,
        assets: sortedAssets,
        expanded: false
      };
    });
    
    // Sort groups: groups with primary assets first, then alphabetically
    assetGroups.sort((a, b) => {
      const aHasPrimary = a.assets.some(asset => asset.is_primary);
      const bHasPrimary = b.assets.some(asset => asset.is_primary);
      
      if (aHasPrimary && !bHasPrimary) return -1;
      if (!aHasPrimary && bHasPrimary) return 1;
      
      // If both have or don't have primary, sort alphabetically
      return a.baseName.localeCompare(b.baseName);
    });
    
    setAssetGroups(assetGroups);
  };

  // Upload file handler - now uses the hook
  const uploadFile = async (upload: UploadingAsset, productId: number) => {
    if (!productId) {
      updateUploadStatus(upload.id, 'error', 'Product ID is missing');
      return;
    }

    try {
      // Mark as uploading and set initial progress
      updateUploadStatus(upload.id, 'uploading');
      updateUploadProgress(upload.id, 0);
      
      // Call the upload function from our hook
      await uploadAsset({
        file: upload.file,
        onProgress: (progress) => updateUploadProgress(upload.id, progress)
      });
      
      // Mark as success
      updateUploadStatus(upload.id, 'success');
      
      // Remove from the uploading list after a delay
      setTimeout(() => {
        setUploading(current => current.filter(u => u.id !== upload.id));
      }, 2000);
      
    } catch (error) {
      console.error('Error uploading asset:', error);
      updateUploadStatus(upload.id, 'error', 'Failed to upload asset');
    }
  };

  // Update upload progress
  const updateUploadProgress = (uploadId: string, progress: number) => {
    setUploading(current => 
      current.map(upload => 
        upload.id === uploadId ? { ...upload, progress } : upload
      )
    );
  };

  // Update upload status
  const updateUploadStatus = (uploadId: string, status: 'uploading' | 'error' | 'success', errorMessage?: string) => {
    setUploading(current => 
      current.map(upload => 
        upload.id === uploadId 
          ? { 
              ...upload, 
              status, 
              error: status === 'error' ? errorMessage || 'Unknown error' : null 
            } 
          : upload
      )
    );
  };

  // Retry upload
  const retryUpload = (upload: UploadingAsset) => {
    if (product.id) {
      uploadFile(upload, product.id);
    }
  };

  // Cancel upload
  const cancelUpload = (uploadId: string) => {
    setUploading(prev => prev.filter(item => item.id !== uploadId));
  };

  // Get file type based on mime type, name and url
  const getFileType = (asset?: ProductAsset): string => {
    if (!asset) {
      console.warn('Attempted to get file type of undefined or null asset');
      return 'unknown';
    }
    
    // Use assetTypeService for type detection
    return assetTypeService.detectType(asset);
  };

  // Use assetTypeService for image detection
  const isImageAsset = (asset?: ProductAsset): boolean => {
    if (!asset) return false;
    return assetTypeService.isImageAsset(asset);
  };

  // Make asset primary - now uses the hook
  const makeAssetPrimary = async (asset: ProductAsset) => {
    if (!asset || !asset.id || isSettingPrimary) return;
    
    // Set local loading state
    setIsMakingPrimary(asset.id);
    
    try {
      // Call the setPrimaryAsset from our hook
      await setPrimaryAsset(asset.id);
      
    } catch (error) {
      console.error('Error setting primary asset:', error);
      uiToast({
        variant: 'destructive',
        title: 'Error',
        description: assetConfig.messages.primary_error
      });
    } finally {
      setIsMakingPrimary(null);
    }
  };

  // Delete asset - now uses the hook
  const deleteAssetHandler = async (assetId: number) => {
    if (!assetId || isDeleting) return;
    
    try {
      // Call the deleteAsset from our hook
      await deleteAsset(assetId);
      
      // Clear selection if needed
      if (selectedAssets.has(assetId)) {
        setSelectedAssets(current => {
          const updated = new Set(current);
          updated.delete(assetId);
          return updated;
        });
      }
      
    } catch (error) {
      console.error('Error deleting asset:', error);
      uiToast({
        variant: 'destructive',
        title: 'Error',
        description: assetConfig.messages.delete_error
      });
    }
  };

  // Archive an asset with proper invalidation
  const archiveAsset = async (assetId: number) => {
    if (!product?.id) return;
    try {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) return;
      
      await productService.updateAsset(product.id, assetId, {
        is_archived: true,
        content_type: asset?.content_type || asset?.type || ''
      });
      
      // Invalidate the assets query to refresh data
      await invalidateProductAndAssets(queryClient, product.id);
      
      // Refetch bundles in case any were affected
      fetchBundles();
      
      uiToast({ title: 'Success', description: assetConfig.messages.archive_success });
    } catch (err) {
      console.error('Error archiving asset:', err);
      uiToast({ variant: 'destructive', title: 'Error', description: assetConfig.messages.archive_error });
    }
  };

  // Rename an asset with proper invalidation
  const renameAsset = async (asset: ProductAsset, newName: string) => {
    if (!product?.id || !asset?.id) return;
    
    // Validate the new name
    if (!newName.trim()) {
      uiToast({
        variant: 'destructive',
        title: 'Error',
        description: assetConfig.rename.error
      });
      return;
    }
    
    try {
      // Update the asset on the server
      const assetPath = API_ENDPOINTS.products.asset 
        ? API_ENDPOINTS.products.asset(product.id, asset.id)
        : `/api/products/${product.id}/assets/${asset.id}/`;
        
      await axiosInstance.patch(assetPath, { name: newName });
      
      // Invalidate the assets query to refresh data
      await invalidateProductAndAssets(queryClient, product.id);
      
      // Close rename dialog
      setAssetToRename(null);
      setNewAssetName('');
      
      uiToast({
        title: 'Success',
        description: assetConfig.rename.success
      });
    } catch (err) {
      console.error('Error renaming asset:', err);
      uiToast({
        variant: 'destructive',
        title: 'Error',
        description: assetConfig.rename.error
      });
    }
  };

  // Toggle selection of an asset
  const toggleAssetSelection = (assetId: number) => {
    setSelectedAssets(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(assetId)) {
        newSelected.delete(assetId);
      } else {
        newSelected.add(assetId);
      }
      return newSelected;
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d yyyy');
    } catch (err) {
      return 'Unknown date';
    }
  };

  // Determine asset icon based on file type
  const getAssetIcon = (type: string) => {
    // Convert the type to lowercase for consistent matching
    const lowerType = type.toLowerCase();
    
    // Handle image type
    if (lowerType === 'image' || lowerType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    }
    
    // Handle document types
    if (lowerType === 'pdf' || lowerType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    
    // Handle spreadsheet types
    if (['spreadsheet', 'excel', 'csv'].some(t => lowerType.includes(t))) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    
    // Handle text document types
    if (['text', 'doc', 'docx', 'document'].some(t => lowerType.includes(t))) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    
    // Default file icon for other types
    return <FileIcon className="h-5 w-5 text-slate-500" />;
  };

  // Function to fetch bundles
  const fetchBundles = useCallback(async () => {
    if (!product?.id) return;
    
    setBundlesLoading(true);
    try {
      const bundlesList = await productService.getAssetBundles(product.id);
      setBundles(bundlesList);
    } catch (error) {
      console.error('Failed to fetch asset bundles:', error);
      uiToast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load asset bundles'
      });
    } finally {
      setBundlesLoading(false);
    }
  }, [product?.id, uiToast]);

  // Fetch bundles on mount and when product changes
  useEffect(() => {
    if (product?.id) {
      fetchBundles();
    }
  }, [product?.id, fetchBundles]);

  // Update filteredAssets useMemo to include tag filtering
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (!asset) return false
      // Hide archived assets
      if (asset.is_archived) return false
      // Type filter
      if (filters.types.size > 0) {
        // Get file type with safe fallback
        const fileType = getFileType(asset);
        const assetType = fileType ? fileType.toLowerCase() : 'unknown';
        
        if (!filters.types.has(assetType)) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFrom && asset.uploaded_at && new Date(asset.uploaded_at) < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && asset.uploaded_at) {
        // Add one day to dateTo to include the end date (user expectation for date ranges)
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (new Date(asset.uploaded_at) > endDate) {
          return false;
        }
      }

      // Name search
      if (filters.search && asset.name) {
        const assetName = asset.name || '';
        if (!assetName.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
      }
      
      // Tags filter
      if (filters.tags.size > 0) {
        // Ensure assetTags is an array
        const assetTags: string[] = Array.isArray(asset.tags) ? asset.tags : [];
        // Asset must have ALL selected tags
        const hasAllSelectedTags = Array.from(filters.tags).every(
          tag => assetTags.includes(tag)
        );
        if (!hasAllSelectedTags) {
          return false;
        }
      }

      return true;
    });
  }, [assets, filters, getFileType]);

  // Add function to collect all unique tags from assets with better type safety
  const uniqueAssetTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach(asset => {
      if (asset && asset.tags && Array.isArray(asset.tags)) {
        // Only add valid string tags
        asset.tags.forEach(tag => {
          if (tag && typeof tag === 'string') {
            tagSet.add(tag);
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [assets]);

  // Add function to handle asset updates with React Query
  const handleAssetUpdated = (updatedAsset: ProductAsset) => {
    if (!updatedAsset || !product.id) {
      console.error('handleAssetUpdated called with invalid data');
      return;
    }
    
    // Update the asset in the React Query cache
    queryClient.setQueryData(
      QUERY_KEYS.PRODUCT_ASSETS(product.id),
      (oldAssets: ProductAsset[] = []) => {
        return oldAssets.map(asset => 
          asset.id === updatedAsset.id ? { ...asset, ...updatedAsset } : asset
        );
      }
    );
  };

  // Update the toggleSelectAllFiltered function
  const toggleSelectAllFiltered = () => {
    if (selectedAssets.size === filteredAssets.length) {
      // If all filtered assets are selected, deselect all filtered assets
      setSelectedAssets(prev => {
        const newSelection = new Set(prev);
        filteredAssets.forEach(asset => {
          newSelection.delete(asset.id);
        });
        return newSelection;
      });
    } else {
      // Otherwise, select all filtered assets
      setSelectedAssets(prev => {
        const newSelection = new Set(prev);
        filteredAssets.forEach(asset => {
          newSelection.add(asset.id);
        });
        return newSelection;
      });
    }
  };

  const { download: downloadAsset, isLoading: isDownloadingAsset } = useDownloadAsset()
  const { download: downloadBulkAssets, isLoading: isBulkDownloading } = useBulkDownload()

  // Replace the fetchAssets call with refetch from our hook in the async onDrop handler
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!product.id) {
        uiToast({
          variant: 'destructive',
          title: 'Error',
          description: 'Product ID is missing, cannot upload assets'
        });
        return;
      }

      // Process each dropped file
      acceptedFiles.forEach(file => {
        const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Add file to uploading list
        setUploading(prev => [
          ...prev,
          {
            id: uploadId,
            file,
            progress: 0,
            error: null,
            status: 'uploading'
          }
        ]);
        
        // Start upload
        setTimeout(() => {
          uploadFile(
            {
              id: uploadId,
              file,
              progress: 0,
              error: null,
              status: 'uploading'
            },
            product.id as number
          );
        }, 100);
      });
    },
    [product.id, uiToast]
  );

  // Dropzone setup with the defined onDrop callback
  const { 
    getRootProps, 
    getInputProps, 
    isDragActive 
  } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.png', '.jpeg', '.jpg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/zip': ['.zip']
    }
  });

  // Update the mouseEnter handler
  const handleSidebarMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!sidebarExpanded) {
      setSidebarExpanded(true);
      setManuallyExpanded(false); // Not manually expanded if triggered by hover
    }
  };

  // Update the mouseLeave handler
  const handleSidebarMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    // Only auto-collapse on desktop AND if not manually expanded
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop && !manuallyExpanded) {
      setSidebarExpanded(false);
    }
  };

  // Update button onClick handlers
  const handleManualExpand = () => {
    setSidebarExpanded(true);
    setManuallyExpanded(true); // Track that user manually expanded
  };

  const handleManualCollapse = () => {
    setSidebarExpanded(false);
    setManuallyExpanded(false);
    setFilterSidebarOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Sidebar for filters with mouse enter/leave handlers */}
      <aside 
        className={`
          w-full border rounded-md overflow-hidden bg-card
          transition-all duration-300 ease-in-out
          ${sidebarExpanded ? 'md:w-64' : 'md:w-12'}
        `}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        {/* Collapsed state - minimal sidebar */}
        <div className={`${!sidebarExpanded ? 'flex' : 'hidden'} h-full flex-col items-center justify-start pt-4`}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleManualExpand}
            className="h-8 w-8 rounded-full"
          >
            <Filter className="h-4 w-4" />
            <span className="sr-only">Expand filters</span>
          </Button>
        </div>

        {/* Expanded state - more compact header */}
        <div className={`${sidebarExpanded ? 'block' : 'hidden'} h-full overflow-hidden`}>
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">{assetConfig.filters.title}</h3>
            </div>
            <div className="flex items-center gap-1">
              {(filters.types.size > 0 || filters.search || filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {filters.types.size + (filters.search ? 1 : 0) + (filters.dateFrom || filters.dateTo ? 1 : 0)}
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleManualCollapse}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Collapse filters</span>
              </Button>
            </div>
          </div>

          {/* More compact scroll area and content */}
          <ScrollArea className="h-[calc(100vh-160px)]">
            <div className="px-4 py-4 space-y-4">
              {/* File Types Filter - more compact */}
              <Collapsible open={typeFilterOpen} onOpenChange={setTypeFilterOpen} className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <FileTypeIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assetConfig.filters.type}</span>
                    {filters.types.size > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filters.types.size}</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-1.5">
                  {['Image', 'PDF', 'Spreadsheet', 'Document', 'Other'].map(fileType => (
                    <div key={fileType} className="flex items-center pl-4 group hover:bg-muted/50 rounded-md p-1">
                      <Checkbox 
                        id={`filetype-${fileType.toLowerCase()}`}
                        checked={filters.types.has(fileType.toLowerCase())}
                        onCheckedChange={(checked) => {
                          setFilters(f => {
                            const newTypes = new Set(f.types);
                            if (checked) {
                              newTypes.add(fileType.toLowerCase());
                            } else {
                              newTypes.delete(fileType.toLowerCase());
                            }
                            return { ...f, types: newTypes };
                          });
                        }}
                        aria-label={`Filter by ${fileType} files`}
                        className="focus:ring-1 focus:ring-primary/20 h-3.5 w-3.5"
                      />
                      <Label 
                        htmlFor={`filetype-${fileType.toLowerCase()}`}
                        className="ml-2 text-xs group-hover:text-foreground cursor-pointer"
                      >
                        {fileType}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-1" />

              {/* Date Range Filter - more compact */}
              <Collapsible open={dateFilterOpen} onOpenChange={setDateFilterOpen} className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Upload Date</span>
                    {(filters.dateFrom || filters.dateTo) && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">Active</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <div className="pl-4">
                    <Label className="text-xs mb-1 block">{assetConfig.filters.date_range}</Label>
                    <div className="inline-block">
                      <DatePickerWithRange
                        className="w-full max-w-[160px]"
                        date={filters.dateFrom && filters.dateTo ? { from: filters.dateFrom, to: filters.dateTo } : undefined}
                        setDate={(dateRange) => {
                          setFilters(f => ({
                            ...f,
                            dateFrom: dateRange?.from || null,
                            dateTo: dateRange?.to || null
                          }))
                        }}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-1" />

              {/* Search Filter - more compact */}
              <Collapsible open={searchFilterOpen} onOpenChange={setSearchFilterOpen} className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <SearchIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Search</span>
                    {filters.search && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">Active</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="pl-4">
                    <div className="space-y-1">
                      <Label htmlFor="asset-search" className="text-xs">Name Search</Label>
                      <div className="relative">
                        <SearchIcon className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="asset-search"
                          value={filters.search}
                          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                          placeholder={assetConfig.filters.search_placeholder}
                          className="pl-7 py-1 h-8 text-xs max-w-[180px]"
                          aria-label="Search assets by name"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-1" />

              {/* Tags Filter */}
              <Collapsible open={tagsFilterOpen} onOpenChange={setTagsFilterOpen} className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assetConfig.filters.tags}</span>
                    {filters.tags.size > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">{filters.tags.size}</Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-1.5">
                  {uniqueAssetTags.length > 0 ? (
                    uniqueAssetTags.map(tag => (
                      <div key={tag} className="flex items-center pl-4 group hover:bg-muted/50 rounded-md p-1">
                        <Checkbox 
                          id={`tag-${tag}`}
                          checked={filters.tags.has(tag)}
                          onCheckedChange={(checked) => {
                            setFilters(f => {
                              const newTags = new Set(f.tags);
                              if (checked) {
                                newTags.add(tag);
                              } else {
                                newTags.delete(tag);
                              }
                              return { ...f, tags: newTags };
                            });
                          }}
                          aria-label={`Filter by ${tag} tag`}
                          className="focus:ring-1 focus:ring-primary/20 h-3.5 w-3.5"
                        />
                        <Label 
                          htmlFor={`tag-${tag}`}
                          className="ml-2 text-xs group-hover:text-foreground cursor-pointer"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground pl-4">{assetConfig.filters.no_tags_found}</p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Separator className="my-1" />

              {/* Clear Filters Button - updated to include tags */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setFilters({ 
                  types: new Set(), 
                  search: '', 
                  dateFrom: null, 
                  dateTo: null,
                  tags: new Set()
                })}
                className="w-full h-7 text-xs"
                disabled={!filters.types.size && !filters.search && !filters.dateFrom && !filters.dateTo && !filters.tags.size}
              >
                {assetConfig.filters.reset}
              </Button>
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main content area - more compact */}
      <main className="flex-1 p-4">
        {/* Header with title - more compact */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Assets</h2>
          
          {/* Mobile filter toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="flex items-center gap-2 h-8"
            >
              <Filter className="h-3 w-3" />
              {assetConfig.filters.title}
              {(filters.types.size > 0 || filters.search || filters.dateFrom || filters.dateTo) && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-xs">
                  {filters.types.size + (filters.search ? 1 : 0) + (filters.dateFrom || filters.dateTo ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Bulk actions toolbar - more compact */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div className="flex items-center">
            <Checkbox 
              id="select-all" 
              checked={selectedAssets.size > 0 && selectedAssets.size === filteredAssets.length}
              onCheckedChange={toggleSelectAllFiltered}
              className="mr-2 h-3.5 w-3.5"
            />
            <label htmlFor="select-all" className="text-xs font-medium">
              Select All
            </label>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedAssets.size} of {filteredAssets.length} selected
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BulkDownloadToolbar
              productId={product?.id || 0}
              selectedIds={Array.from(selectedAssets)}
              onDownload={() => {
                if (product?.id) {
                  downloadBulkAssets(product.id, Array.from(selectedAssets));
                }
              }}
              disabled={selectedAssets.size === 0 || isBulkDownloading}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBundleDialogOpen(true)}
              disabled={selectedAssets.size === 0}
              className="h-7 text-xs"
            >
              <PlusCircle className="h-3 w-3 mr-1" />
              Create Bundle
            </Button>
          </div>
        </div>
        
        {/* Dropzone area - more compact */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-medium mb-1">Drag files here or click to upload</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Upload images, PDFs, spreadsheets, and other documents
          </p>
          <Button variant="outline" size="sm" type="button" className="text-xs h-7">
            Select Files
          </Button>
        </div>
        
        {/* Upload progress indicators */}
        {uploading.length > 0 && (
          <div className="space-y-4 mt-8 mb-10">
            <h3 className="text-sm font-medium">Uploads in progress</h3>
            
            {uploading.map(upload => (
              <div 
                key={upload.id} 
                className="flex items-center border rounded-md p-3 gap-3"
              >
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                  {getAssetIcon(upload.file.type.split('/')[0])}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.file.name}</p>
                  
                  {upload.status === 'uploading' && (
                    <>
                      <Progress value={upload.progress} className="h-2 mt-1 mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Uploading... {upload.progress}%
                      </p>
                    </>
                  )}
                  
                  {upload.status === 'error' && (
                    <p className="text-xs text-red-500">
                      {upload.error || 'Upload failed'}
                    </p>
                  )}
                  
                  {upload.status === 'success' && (
                    <p className="text-xs text-green-500">
                      Upload complete
                    </p>
                  )}
                </div>
                
                {upload.status === 'error' && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => retryUpload(upload)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Retry</span>
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => cancelUpload(upload.id)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Cancel</span>
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Asset grid - smaller cards and spacing */}
        {filteredAssets.length === 0 && !uploading.length ? (
          <div className="text-center p-6 bg-muted/40 rounded-lg mt-4">
            <FileIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-medium mb-1">{assetConfig.empty_states.no_results}</h3>
            <p className="text-xs text-muted-foreground">
              {assetConfig.empty_states.no_results_description}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets
                .sort((a, b) => {
                  if (a.is_primary && !b.is_primary) return -1
                  if (!a.is_primary && b.is_primary) return 1
                  return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
                })
                .map(asset => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    productId={product?.id || 0}
                    onAssetUpdated={handleAssetUpdated}
                    onMakePrimary={makeAssetPrimary}
                    onDelete={deleteAssetHandler}
                    onArchive={(assetId) => archiveAsset(assetId)}
                    onDownload={asset => {
                      if (!isDownloadingAsset && product?.id) {
                        downloadAsset(product.id, asset.id);
                      }
                    }}
                    isImageAsset={isImageAsset}
                    getAssetIcon={getAssetIcon}
                    getFileType={getFileType}
                    onRename={asset => {
                      setAssetToRename(asset);
                      setNewAssetName(asset.name || '');
                    }}
                    isSelected={selectedAssets.has(asset.id)}
                    onSelect={toggleAssetSelection}
                  />
                ))}
            </div>
          </div>
        )}
        
        {/* Bundles Section */}
        <div className="mt-16 border-t pt-10">
          <h2 className="text-xl font-semibold mb-8">{assetConfig.bundle.create_title}</h2>
          
          {/* Rename Asset Dialog */}
          <Dialog 
            open={!!assetToRename} 
            onOpenChange={(open) => {
              if (!open) {
                setAssetToRename(null);
                setNewAssetName('');
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{assetConfig.rename.title}</DialogTitle>
                <DialogDescription>
                  {assetConfig.rename.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex items-center gap-4 py-4">
                {assetToRename && (
                  <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                    {getAssetIcon(assetToRename.type)}
                  </div>
                )}
                <div className="flex-grow">
                  <Input
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    placeholder={assetConfig.rename.name_label}
                    className="w-full"
                    autoFocus
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAssetToRename(null);
                    setNewAssetName('');
                  }}
                >
                  {assetConfig.rename.buttons.cancel}
                </Button>
                <Button 
                  onClick={() => assetToRename && renameAsset(assetToRename, newAssetName)}
                  disabled={!newAssetName.trim() || !!(assetToRename && newAssetName === assetToRename.name)}
                >
                  {assetConfig.rename.buttons.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bundle Dialog */}
          <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{assetConfig.bundle.create_title}</DialogTitle>
                <DialogDescription>
                  {assetConfig.bundle.create_description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bundle-name">{assetConfig.bundle.name_label}</Label>
                  <Input 
                    id="bundle-name"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    placeholder={assetConfig.bundle.name_placeholder}
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Selected Assets ({selectedAssets.size})</h4>
                  {selectedAssets.size === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets selected</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                      <ul className="space-y-1">
                        {Array.from(selectedAssets).map(assetId => {
                          const asset = assets.find(a => a.id === assetId);
                          return asset ? (
                            <li key={asset.id} className="text-sm flex items-center">
                              <span className="w-4 h-4 mr-2 flex-shrink-0">
                                {getAssetIcon(asset.type)}
                              </span>
                              <span className="truncate">{asset.name}</span>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setBundleDialogOpen(false)}
                >
                  {assetConfig.bundle.buttons.cancel}
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!bundleName.trim()) {
                      alert('Please enter a bundle name');
                      return;
                    }
                    
                    if (selectedAssets.size === 0) {
                      alert('Please select at least one asset');
                      return;
                    }
                    
                    try {
                      if (!product?.id) {
                        alert('Missing product ID');
                        return;
                      }
                      
                      const newBundle = await productService.createAssetBundle(
                        product.id as number, // Safe assertion since we checked it's not undefined above
                        bundleName.trim(),
                        Array.from(selectedAssets)
                      );
                      
                      // Refresh bundles
                      fetchBundles();
                      
                      // Reset and close dialog
                      setBundleName('');
                      setBundleDialogOpen(false);
                      
                      // Clear selection
                      setSelectedAssets(new Set());
                      
                      uiToast({
                        title: 'Success',
                        description: assetConfig.bundle.success
                      });
                    } catch (error) {
                      console.error('Failed to create bundle:', error);
                      uiToast({
                        variant: 'destructive',
                        title: 'Error',
                        description: assetConfig.bundle.error
                      });
                    }
                  }}
                >
                  {assetConfig.bundle.buttons.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bundles list */}
          {bundlesLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : Array.isArray(bundles) && bundles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
              {bundles.map(bundle => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  productId={product?.id || 0}
                  assets={assets}
                  onDelete={bundleId => {
                    if (window.confirm('Are you sure you want to delete this bundle?')) {
                      if (product?.id) {
                        productService.deleteAssetBundle(product.id, bundleId)
                          .then(() => fetchBundles())
                          .catch(err => {
                            console.error('Failed to delete bundle:', err)
                            uiToast({
                              variant: 'destructive',
                              title: 'Error',
                              description: 'Failed to delete asset bundle'
                            })
                          })
                      }
                    }
                  }}
                  isImageAsset={isImageAsset}
                  getAssetIcon={getAssetIcon}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-muted/40 rounded-lg">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No Asset Bundles Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select multiple assets and click "Create Bundle" to create your first bundle.
              </p>
              <Button
                variant="outline"
                onClick={() => setBundleDialogOpen(true)}
                disabled={selectedAssets.size === 0}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssetsTab; 