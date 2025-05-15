import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileIcon, FileSpreadsheet, FileText, ImageIcon, 
  Upload, X, CheckCircle2, AlertCircle, RefreshCw, 
  ChevronDown, ChevronRight, MoreHorizontal, Download, 
  Archive, Trash2, Edit2, Filter, PlusCircle, FolderDown, Package, Loader2, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Product, ProductAsset, productService, AssetBundle } from '@/services/productService';
import axiosInstance from '@/lib/axiosInstance';
import { PRODUCTS_API_URL } from '@/services/productService';
import { useToast } from '@/components/ui/use-toast';
import { DateRange } from 'react-day-picker';
import { Toast } from '@/components/ui/toast';
import { formatFileSize } from '@/utils/formatFileSize'
import { useQueryClient } from '@tanstack/react-query';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { TagInput } from '@/components/ui/tag-input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronUp,
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
import { AssetCard } from '@/components/products/AssetCard'
import { useDownloadAsset } from '@/hooks/useDownloadAsset'
import { useBulkDownload } from '@/hooks/useBulkDownload'
import { DownloadButton } from '@/components/products/DownloadButton'
import { BulkDownloadToolbar } from '@/components/products/BulkDownloadToolbar'
import { BundleCard } from './BundleCard'

// Add import for our new hook
import { useSetPrimaryAsset } from '@/hooks/useSetPrimaryAsset';
import { pickPrimaryImage } from '@/utils/images';
import { assetTypeService } from '@/services/assetTypeService';

interface AssetTabProps {
  product: Product;
  onAssetUpdate?: (assets: ProductAsset[]) => void;
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

export const AssetsTab: React.FC<AssetTabProps> = ({ product, onAssetUpdate }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only proceed if feature flag is enabled
  if (!ENABLE_ASSET_GALLERY) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Assets gallery is coming soon.</p>
      </div>
    );
  }

  const [assets, setAssets] = useState<ProductAsset[]>(product.assets || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  /* ------------------------------------------------------------------ *
   * fetchAssets() is wrapped in useCallback so the identity is stable; *
   * isFetchingRef stops accidental re-entry.                           *
   * ------------------------------------------------------------------ */
  const isFetchingRef = useRef(false);

  const fetchAssets = useCallback(async () => {
    if (!product?.id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    setLoading(true);
    setError(null);
    
    // Try to fetch from API first
    let fetchedAssets: ProductAsset[] = [];
    try {
      console.log('Attempting to fetch assets for product ID:', product.id);
      fetchedAssets = await productService.getProductAssets(product.id);
      
      // If we got a valid response with assets, use it
      if (Array.isArray(fetchedAssets) && fetchedAssets.length > 0) {
        console.log('Successfully fetched assets from API:', fetchedAssets.length);
        setAssets(fetchedAssets);
        
        // Update cache with fresh server data
        localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(fetchedAssets));
        setLoading(false);
        isFetchingRef.current = false;
        return;
      } else {
        console.warn('API returned empty asset array, will try cache');
      }
    } catch (err) {
      console.error('Error fetching product assets from API:', err);
      // Continue to try cache on error
    }
    
    // If API failed or returned empty, try to use cache
    try {
      const cachedAssetsJSON = localStorage.getItem(`product_assets_${product.id}`);
      if (cachedAssetsJSON) {
        const cachedAssets = JSON.parse(cachedAssetsJSON);
        if (Array.isArray(cachedAssets) && cachedAssets.length > 0) {
          console.log(`Using ${cachedAssets.length} cached assets from localStorage for product ${product.id}`);
          
          // Check if we have exactly one primary asset
          const primaryCount = cachedAssets.filter(asset => asset.is_primary).length;
          
          if (primaryCount !== 1) {
            console.warn(`Found ${primaryCount} primary assets instead of 1, fixing...`);
            // Fix by making only the first asset primary
            const fixedAssets = cachedAssets.map((asset, index) => ({
              ...asset,
              is_primary: index === 0
            }));
            
            // Save fixed assets back to localStorage
            localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(fixedAssets));
            setAssets(fixedAssets);
          } else {
            setAssets(cachedAssets);
          }
          
          setLoading(false);
          isFetchingRef.current = false;
          return; // Exit with cached data
        }
      }
    } catch (err) {
      console.error('Error reading from localStorage:', err);
    }
    
    // If we got here, both API and cache failed - use fallback
    console.warn('No assets from API or cache, using fallback data');
    
    // Generate fallback assets based on product images if available
    if (product.images && product.images.length > 0) {
      console.log('Using product images as fallback');
      const mockAssets: ProductAsset[] = product.images.map((image, index) => ({
        id: 1000 + index,
        name: `Product Image ${index + 1}`,
        type: 'image',
        url: image.url,
        size: 'Unknown',
        resolution: 'Unknown',
        uploaded_by: 'System',
        uploaded_at: new Date().toISOString(),
        is_primary: image.is_primary || index === 0
      }));
      setAssets(mockAssets);
    } else if (product.primary_image_large) {
      console.log('Using primary image as fallback');
      // Use primary image as fallback
      const mockAsset: ProductAsset = {
        id: 1000,
        name: 'Primary Product Image',
        type: 'image',
        url: product.primary_image_large,
        size: 'Unknown',
        resolution: 'Unknown',
        uploaded_by: 'System',
        uploaded_at: new Date().toISOString(),
        is_primary: true
      };
      setAssets([mockAsset]);
    } else {
      console.log('No assets or images available');
      setAssets([]);
    }
    
    setLoading(false);
    isFetchingRef.current = false;
  }, [product?.id]);

  useEffect(() => { 
    fetchAssets();
  }, [fetchAssets]);

  // Save assets to localStorage whenever they change
  useEffect(() => {
    if (product?.id && assets.length > 0) {
      try {
        localStorage.setItem(`product_assets_${product.id}`, JSON.stringify(assets));
        console.log(`Saved ${assets.length} assets to localStorage for product ${product.id}`);
      } catch (err) {
        console.error('Failed to save assets to localStorage:', err);
      }
    }
  }, [assets, product?.id]);

  // Process assets into groups whenever they change
  useEffect(() => {
    console.log('[AssetsTab] assets state changed:', assets);
    console.log('[AssetsTab] Is assets an array?', Array.isArray(assets));
    
    if (Array.isArray(assets) && assets.length) {
      groupAssetsByBaseName();
    }
  }, [assets]);

  // Group assets by base name (for versioning)
  const groupAssetsByBaseName = () => {
    if (!Array.isArray(assets)) {
      console.error('assets is not an array in groupAssetsByBaseName:', assets);
      return;
    }
    
    // Create a map of baseName -> assets
    const groups = new Map<string, ProductAsset[]>();
    
    // Group assets by baseName
    assets.forEach(asset => {
      // Extract baseName (filename without extension)
      const baseName = asset.name.split('.')[0] || 'Unknown';
      
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

  // Toggle group expansion
  const toggleGroupExpansion = (baseNameToToggle: string) => {
    setAssetGroups(groups => 
      groups.map(group => 
        group.baseName === baseNameToToggle
          ? { ...group, expanded: !group.expanded }
          : group
      )
    );
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!product?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot upload files - product ID is missing'
      });
      return;
    }
    
    // Create temporary uploading assets
    const newUploads = acceptedFiles.map(file => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: 0,
      error: null,
      status: 'uploading' as const
    }));
    
    setUploading(prev => [...prev, ...newUploads]);
    
    // Upload each file
    newUploads.forEach(upload => uploadFile(upload, product.id!));
  }, [product?.id]);

  // Dropzone setup
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

  // Upload file to API
  const uploadFile = async (upload: UploadingAsset, productId: number) => {
    try {
      // Update progress to indicate we're starting
      updateUploadProgress(upload.id, 10);
      console.log(`[uploadFile] Uploading ${upload.file.name} (${upload.file.type}) to product ${productId}`);
      
      // Upload the file to the assets endpoint
      const asset = await productService.uploadAsset(
        productId,
        upload.file,
        (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateUploadProgress(upload.id, progress);
          }
        }
      );
      
      // Handle successful upload
      updateUploadStatus(upload.id, 'success');
      console.log(`[uploadFile] Successful upload: Asset ID ${asset.id}, is_primary: ${asset.is_primary}`);
      
      // Add the new asset to the list
      setAssets(prev => {
        // Simply add the new asset to the list without setting it as primary
        const newAssets = [asset, ...prev];
        
        // Notify parent component if callback exists
        if (onAssetUpdate) {
          console.log(`[uploadFile] Notifying parent with ${newAssets.length} assets`);
          onAssetUpdate(newAssets);
        }
        
        return newAssets;
      });
      
      toast({
        title: 'Success',
        description: `${asset.name} uploaded successfully`
      });
      
      // Remove upload item immediately on success
      setUploading(prev => prev.filter(item => item.id !== upload.id));
      
    } catch (error: any) {
      console.error('[uploadFile] Error uploading file:', error);
      
      // Format error message for toast
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      updateUploadStatus(upload.id, 'error', errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
    }
  };

  // Update upload progress
  const updateUploadProgress = (uploadId: string, progress: number) => {
    setUploading(prev => 
      prev.map(item => 
        item.id === uploadId
          ? { ...item, progress }
          : item
      )
    );
  };

  // Update upload status
  const updateUploadStatus = (uploadId: string, status: 'uploading' | 'error' | 'success', errorMessage?: string) => {
    setUploading(prev => 
      prev.map(item => 
        item.id === uploadId
          ? { 
              ...item, 
              status, 
              error: errorMessage || null 
            }
          : item
      )
    );
  };

  // Retry failed upload
  const retryUpload = (upload: UploadingAsset) => {
    if (!product?.id) return;
    
    updateUploadStatus(upload.id, 'uploading');
    updateUploadProgress(upload.id, 0);
    uploadFile(upload, product.id);
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
    
    // Local implementation of type detection to avoid dependency issues
    const detectType = (asset: ProductAsset): string => {
      // Check content_type or type
      const type = asset.content_type || asset.type || '';
      
      // Check based on MIME type
      if (type) {
        if (type.startsWith('image/')) return 'image';
        if (type.startsWith('video/')) return 'video';
        if (type.startsWith('audio/')) return 'audio';
        if (type === 'application/pdf' || type.includes('pdf')) return 'pdf';
        if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return 'spreadsheet';
        if (type.includes('document') || type.includes('word') || type.includes('text/')) return 'document';
        if (type.includes('3d') || type.includes('stl') || type.includes('obj')) return 'model';
      }
      
      // Check URL extension
      const url = asset.url || '';
      if (url && typeof url === 'string') {
        const extension = url.split('.').pop()?.toLowerCase() || '';
        
        // Image extensions
        if (/^(jpe?g|png|gif|svg|webp|bmp|tiff?|ico|heic|avif)$/.test(extension)) {
          return 'image';
        }
        
        // Video extensions
        if (/^(mp4|webm|mov|avi|wmv|flv|mkv|m4v|mpg|mpeg)$/.test(extension)) {
          return 'video';
        }
        
        // Document extensions
        if (/^(docx?|rtf|txt|md|pages|odt|pptx?|odp|key)$/.test(extension)) {
          return 'document';
        }
        
        // Spreadsheet extensions
        if (/^(xlsx?|csv|numbers|ods|gsheet)$/.test(extension)) {
          return 'spreadsheet';
        }
        
        // 3D model extensions
        if (/^(obj|stl|glb|gltf|fbx|3ds|dae|blend)$/.test(extension)) {
          return 'model';
        }
      }
      
      return 'unknown';
    };
    
    // Use our local implementation
    const type = detectType(asset);
    
    // Convert 'model' type to '3d' for backward compatibility
    if (type === 'model') return '3d';
    
    return type;
  };

  // Local implementation of image asset detection to avoid dependency issues
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

  // Make an asset primary (only for images)
  const makeAssetPrimary = async (asset: ProductAsset) => {
    if (asset.is_primary) {
      console.log(`[makeAssetPrimary] Asset ${asset.id} is already primary`);
      return; // Already primary
    }
    
    // Only allow images to be set as primary
    if (!isImageAsset(asset)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Only image files can be set as primary'
      });
      return;
    }
    
    // Set loading state
    setIsMakingPrimary(asset.id);
    console.log(`[makeAssetPrimary] Setting asset ${asset.id} as primary for product ${product.id}`);

    // Use our new mutation hook for setting the primary asset
    setPrimaryAsset(asset.id, {
      onSuccess: () => {
        // Clear loading state
        setIsMakingPrimary(null);
        console.log('[makeAssetPrimary] Primary asset updated successfully');
        
        // If the operation succeeded, update the local assets array to reflect the change
        setAssets(prevAssets => {
          return prevAssets.map(a => ({
            ...a,
            is_primary: a.id === asset.id
          }));
        });
        
        // Force refresh to ensure UI is consistent
        fetchAssets();
        
        // Notify parent component if callback exists
        if (onAssetUpdate) {
          onAssetUpdate(assets.map(a => ({
            ...a,
            is_primary: a.id === asset.id
          })));
        }
      },
      onError: (error: any) => {
        console.error('[makeAssetPrimary] Failed to set primary asset:', error);
        setIsMakingPrimary(null);
        
        // Show error toast to the user
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error?.message || 'Failed to set primary image'
        });
        
        // Refresh assets to ensure UI shows correct state
        fetchAssets();
      }
    });
  };

  // Delete an asset
  const deleteAsset = async (assetId: number) => {
    if (!product?.id) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this asset?');
    if (!confirmDelete) return;
    
    try {
      await axiosInstance.delete(`${PRODUCTS_API_URL}/${product.id}/assets/${assetId}/`);
      
      // Update local state
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
      setSelectedAssets(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(assetId);
        return newSelected;
      });
      
      toast({
        title: 'Success',
        description: 'Asset deleted'
      });
    } catch (err) {
      console.error('Error deleting asset:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete asset'
      });
    }
  };

  // Archive an asset
  const archiveAsset = async (assetId: number) => {
    if (!product?.id) return
    try {
      const asset = assets.find(a => a.id === assetId)
      await productService.updateAsset(product.id, assetId, {
        is_archived: true,
        content_type: asset?.content_type || asset?.type || ''
      })
      // Refetch assets from backend to ensure UI is up to date
      const updatedAssets = await productService.getProductAssets(product.id)
      setAssets(updatedAssets)
      // Refetch bundles in case any were deleted due to asset archive
      fetchBundles()
      toast({ title: 'Success', description: 'Asset archived' })
    } catch (err) {
      console.error('Error archiving asset:', err)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive asset' })
    }
  }

  // Rename an asset
  const renameAsset = async (asset: ProductAsset, newName: string) => {
    if (!product?.id || !asset?.id) return;
    
    // Validate the new name
    if (!newName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Asset name cannot be empty'
      });
      return;
    }
    
    try {
      // Update the asset on the server
      await axiosInstance.patch(
        `${PRODUCTS_API_URL}/${product.id}/assets/${asset.id}/`, 
        { name: newName }
      );
      
      // Update local state
      setAssets(prev => 
        prev.map(a => 
          a.id === asset.id
            ? { ...a, name: newName }
            : a
        )
      );
      
      // Close rename dialog
      setAssetToRename(null);
      setNewAssetName('');
      
      toast({
        title: 'Success',
        description: 'Asset renamed successfully'
      });
    } catch (err) {
      console.error('Error renaming asset:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to rename asset'
      });
    }
  };

  // Archive selected assets
  const archiveSelectedAssets = async () => {
    if (!product?.id || selectedAssets.size === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No assets selected' })
      return
    }
    const confirmArchive = window.confirm(`Are you sure you want to archive ${selectedAssets.size} assets?`)
    if (!confirmArchive) return
    try {
      const selected = assets.filter(a => selectedAssets.has(a.id))
      await productService.bulkArchiveAssets(product.id, selected)
      setAssets(prev => prev.map(asset => selectedAssets.has(asset.id) ? { ...asset, is_archived: true } : asset))
      setSelectedAssets(new Set())
      setAllSelected(false)
      toast({ title: 'Success', description: `${selectedAssets.size} assets archived` })
    } catch (err) {
      console.error('Error archiving assets:', err)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to archive assets' })
    }
  }

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

  // Toggle selection of all assets
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    }
    setAllSelected(!allSelected);
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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load asset bundles'
      });
    } finally {
      setBundlesLoading(false);
    }
  }, [product?.id, toast]);

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
        const assetTags = Array.isArray(asset.tags) ? asset.tags : [];
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

  // Add function to collect all unique tags from assets
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

  // Add function to handle asset updates
  const handleAssetUpdated = (updatedAsset: ProductAsset) => {
    console.log(`Updating asset ${updatedAsset.id} with:`, updatedAsset)
    
    if (!updatedAsset) {
      console.error('handleAssetUpdated called with undefined/null asset')
      return
    }
    
    // Make sure we preserve all properties from the existing asset
    setAssets(prevAssets => {
      return prevAssets.map(asset => {
        if (asset.id === updatedAsset.id) {
          // Create a merged asset that keeps all existing properties but updates with new ones
          const mergedAsset = { ...asset, ...updatedAsset }
          console.log(`Asset updated from:`, asset, `to:`, mergedAsset)
          return mergedAsset
        }
        return asset
      })
    })
    
    // If parent component has an update callback, pass the updated assets
    if (onAssetUpdate) {
      console.log('Notifying parent component of asset update')
      onAssetUpdate(assets.map(asset => 
        asset.id === updatedAsset.id ? { ...asset, ...updatedAsset } : asset
      ))
    }
  }

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

  // Initialize our new hook for setting a primary asset
  const { mutate: setPrimaryAsset } = useSetPrimaryAsset(product?.id || 0);

  return (
    <div className="p-6 space-y-8">
      {/* Main layout with collapsible sidebar and content */}
      <div className="flex">
        {/* Collapsible sidebar: narrow when collapsed, wide when expanded */}
        <aside 
          className={`border-r bg-background transition-all duration-200 ease-in-out relative h-[calc(100vh-120px)] ${sidebarExpanded ? 'w-72' : 'w-14'}`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          role="complementary"
          aria-label="Asset filters"
        >
          {/* Collapsed state - make it more compact */}
          <div className={`${sidebarExpanded ? 'hidden' : 'flex'} h-full flex-col items-center pt-4`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarExpanded(true)} 
                    className="h-10 w-10 rounded-full"
                  >
                    <Filter className="h-5 w-5" />
                    <span className="sr-only">Expand filters</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Filters</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Expanded state - more compact header */}
          <div className={`${sidebarExpanded ? 'block' : 'hidden'} h-full overflow-hidden`}>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-1">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Filter Assets</h3>
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
                  onClick={() => setSidebarExpanded(false)}
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
                <Collapsible defaultOpen className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                    <div className="flex items-center gap-2">
                      <FileTypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">File Types</span>
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
                <Collapsible defaultOpen className="space-y-2">
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
                      <Label className="text-xs mb-1 block">Date Range</Label>
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
                <Collapsible defaultOpen className="space-y-2">
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
                            placeholder="Search by name"
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
                <Collapsible defaultOpen className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tags</span>
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
                      <p className="text-xs text-muted-foreground pl-4">No tags found</p>
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
                  Clear All Filters
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
                Filters
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
              <h3 className="text-base font-medium mb-1">No assets match these filters</h3>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or upload new files.
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
                      onDelete={deleteAsset}
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
            <h2 className="text-xl font-semibold mb-8">Asset Bundles</h2>
            
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
                  <DialogTitle>Rename Asset</DialogTitle>
                  <DialogDescription>
                    Change the name of this asset.
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
                      placeholder="Enter new name"
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
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => assetToRename && renameAsset(assetToRename, newAssetName)}
                    disabled={!newAssetName.trim() || !!(assetToRename && newAssetName === assetToRename.name)}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Bundle Dialog */}
            <Dialog open={bundleDialogOpen} onOpenChange={setBundleDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Asset Bundle</DialogTitle>
                  <DialogDescription>
                    Create a bundle with the selected assets. This allows you to download multiple assets as a single ZIP file.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bundle-name">Bundle Name</Label>
                    <Input 
                      id="bundle-name"
                      value={bundleName}
                      onChange={(e) => setBundleName(e.target.value)}
                      placeholder="Enter a name for this bundle"
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
                    Cancel
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
                        
                        toast({
                          title: 'Success',
                          description: `"${bundleName}" bundle was created successfully`
                        });
                      } catch (error) {
                        console.error('Failed to create bundle:', error);
                        toast({
                          variant: 'destructive',
                          title: 'Error',
                          description: 'Failed to create asset bundle'
                        });
                      }
                    }}
                    disabled={!bundleName.trim() || selectedAssets.size === 0}
                  >
                    Create Bundle
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
                              toast({
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
    </div>
  );
};

export default AssetsTab; 