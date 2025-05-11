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

  // Only proceed if feature flag is enabled
  if (!ENABLE_ASSET_GALLERY) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Assets gallery is coming soon.</p>
      </div>
    );
  }

  const [assets, setAssets] = useState<ProductAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [uploading, setUploading] = useState<UploadingAsset[]>([]);
  const [allSelected, setAllSelected] = useState(false);
  const [isMakingPrimary, setIsMakingPrimary] = useState<number | string | null>(null);
  
  // State for renaming assets
  const [assetToRename, setAssetToRename] = useState<ProductAsset | null>(null);
  const [newAssetName, setNewAssetName] = useState<string>('');

  // Filter state
  const [filters, setFilters] = useState({
    types: new Set<string>(),
    search: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
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
        // If this is primary, make sure other assets are not primary
        const updatedAssets = asset.is_primary 
          ? prev.map(a => ({...a, is_primary: false}))
          : prev;
          
        const newAssets = [asset, ...updatedAssets];
        
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
  const getFileType = (asset: ProductAsset): string => {
    console.log(`Detecting type for asset: ${asset.name}`);
    
    // Normalize inputs for more consistent matching
    const url = (asset.url || '').toLowerCase();
    const name = (asset.name || '').toLowerCase();
    const type = (asset.type || '').toLowerCase();
    
    // Check for PDF first (most specific case)
    if (
      name.endsWith('.pdf') || 
      url.endsWith('.pdf') || 
      type.includes('pdf') ||
      type === 'application/pdf'
    ) {
      console.log(`Detected PDF: ${asset.name}`);
      return 'pdf';
    }
    
    // Check for images
    if (
      type.includes('image/') || 
      /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(name) ||
      /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url)
    ) {
      // Warning for TIFF images which might not display properly in browser
      if (name.endsWith('.tiff') || name.endsWith('.tif') || type.includes('tiff')) {
        console.warn(`TIFF image detected (${asset.name}), may not display in all browsers`);
      }
      
      console.log(`Detected image: ${asset.name}`);
      return 'image';
    }
    
    // Check for spreadsheets
    if (
      /\.(xlsx|xls|csv|ods)$/i.test(name) || 
      type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('csv')
    ) {
      console.log(`Detected spreadsheet: ${asset.name}`);
      return 'spreadsheet';
    }
    
    // Check for documents
    if (
      /\.(doc|docx|txt|rtf|odt)$/i.test(name) || 
      type.includes('document') ||
      type.includes('word') ||
      type.includes('text/')
    ) {
      console.log(`Detected document: ${asset.name}`);
      return 'document';
    }
    
    // Handle unknown file types
    console.warn(`Unknown file type for asset: ${asset.name} (type: ${type})`);
    return 'unknown';
  };

  // Check if the asset can be displayed as an image
  const isImageAsset = (asset?: ProductAsset): boolean => {
    if (!asset) return false;
    
    // Check both type fields to handle all cases
    const assetType = asset.type || '';
    
    // Use getFileType for more robust detection
    const fileType = getFileType(asset);
    console.log(`Asset ${asset.name} has file type: ${fileType}`);
    
    // If either check confirms it's an image, return true
    return assetType.toLowerCase() === 'image' || fileType === 'image';
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

    // Optimistically update UI
    const oldAssets = [...assets];
    const newAssets = assets.map(a => ({
      ...a,
      is_primary: a.id === asset.id
    }));
    
    // Update the UI immediately
    setAssets(newAssets);
    
    // Clear localStorage cache to force a refresh from server on next load
    localStorage.removeItem(`product_assets_${product.id}`);
    
    try {
      // Call the service to set the asset as primary
      const success = await productService.setAssetPrimary(product.id, asset.id);
      console.log(`[makeAssetPrimary] setAssetPrimary result: ${success ? 'success' : 'failure'}`);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Primary image updated'
        });
        
        // If onAssetUpdate is provided, pass the updated assets to the parent component
        if (onAssetUpdate) {
          console.log('[makeAssetPrimary] Calling onAssetUpdate with updated assets');
          onAssetUpdate(newAssets);
        }
        
        // Force a refresh of the assets to ensure we have the latest data from the server
        try {
          const refreshedAssets = await productService.getProductAssets(product.id);
          console.log(`[makeAssetPrimary] Refreshed ${refreshedAssets.length} assets from server`);
          setAssets(refreshedAssets);
          
          // Pass the refreshed assets to parent if needed
          if (onAssetUpdate) {
            onAssetUpdate(refreshedAssets);
          }
        } catch (refreshError) {
          console.error('[makeAssetPrimary] Error refreshing assets:', refreshError);
          // Already updated optimistically, so no UI rollback needed
        }
      } else {
        console.error('[makeAssetPrimary] Failed to set asset as primary');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to set as primary image'
        });
        // Revert optimistic update
        setAssets(oldAssets);
      }
    } catch (error) {
      console.error('[makeAssetPrimary] Error setting asset as primary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while setting the primary image'
      });
      // Revert optimistic update
      setAssets(oldAssets);
    } finally {
      // Clear loading state
      setIsMakingPrimary(null);
    }
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
    if (!product?.id) return;
    
    try {
      await axiosInstance.patch(
        `${PRODUCTS_API_URL}/${product.id}/assets/${assetId}/`, 
        { is_archived: true }
      );
      
      // Update local state
      setAssets(prev => 
        prev.map(asset => 
          asset.id === assetId
            ? { ...asset, is_archived: true }
            : asset
        )
      );
      
      toast({
        title: 'Success',
        description: 'Asset archived'
      });
    } catch (err) {
      console.error('Error archiving asset:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to archive asset'
      });
    }
  };

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

  // Download an asset
  const downloadAsset = (asset: ProductAsset) => {
    if (!asset.url) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Asset URL is missing'
      });
      return;
    }
    
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download selected assets
  const downloadSelectedAssets = () => {
    if (selectedAssets.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No assets selected'
      });
      return;
    }
    
    assets
      .filter(asset => selectedAssets.has(asset.id))
      .forEach(downloadAsset);
    
    toast({
      title: 'Success',
      description: `Downloading ${selectedAssets.size} assets`
    });
  };

  // Archive selected assets
  const archiveSelectedAssets = async () => {
    if (!product?.id || selectedAssets.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No assets selected'
      });
      return;
    }
    
    const confirmArchive = window.confirm(`Are you sure you want to archive ${selectedAssets.size} assets?`);
    if (!confirmArchive) return;
    
    try {
      // Create a payload with all asset IDs to archive
      const payload = {
        asset_ids: Array.from(selectedAssets),
        is_archived: true
      };
      
      await axiosInstance.post(
        `${PRODUCTS_API_URL}/${product.id}/assets/bulk-update/`, 
        payload
      );
      
      // Update local state
      setAssets(prev => 
        prev.map(asset => 
          selectedAssets.has(asset.id)
            ? { ...asset, is_archived: true }
            : asset
        )
      );
      
      // Clear selection
      setSelectedAssets(new Set());
      setAllSelected(false);
      
      toast({
        title: 'Success',
        description: `${selectedAssets.size} assets archived`
      });
    } catch (err) {
      console.error('Error archiving assets:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to archive assets'
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

  // Toggle selection of all assets
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map(asset => asset.id)));
    }
    setAllSelected(!allSelected);
  };

  // Format file size
  const formatFileSize = (sizeString: string | number | null | undefined): string => {
    // If it's already formatted (e.g., "1.2MB"), return as is
    if (typeof sizeString === 'string' && sizeString.match(/^[\d.]+\s*[KMGT]?B$/i)) {
      return sizeString;
    }
    
    // Handle null/undefined/empty cases
    if (sizeString === null || sizeString === undefined || sizeString === '') {
      return 'Unknown size';
    }
    
    // Convert string to number if it's a string
    let bytes: number;
    
    if (typeof sizeString === 'string') {
      // Try to parse the string as a number
      bytes = parseInt(sizeString, 10);
    } else {
      bytes = sizeString as number;
    }
    
    // Check if bytes is a valid number
    if (isNaN(bytes) || bytes === 0) {
      console.warn(`Invalid file size value: ${sizeString}`);
      return 'Unknown size';
    }
    
    // Format bytes to appropriate units
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
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

  // Define filteredAssets using useMemo
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Type filter
      if (filters.types.size > 0) {
        const assetType = getFileType(asset).toLowerCase();
        if (!filters.types.has(assetType)) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFrom && new Date(asset.uploaded_at) < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo) {
        // Add one day to dateTo to include the end date (user expectation for date ranges)
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (new Date(asset.uploaded_at) > endDate) {
          return false;
        }
      }

      // Name search
      if (filters.search && !asset.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [assets, filters]);

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

  // Render loading UI
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Assets</h2>
          <Button 
            variant="outline" 
            onClick={() => setFilterSidebarOpen(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {(filters.types.size > 0 || filters.search || filters.dateFrom || filters.dateTo) && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.types.size + (filters.search ? 1 : 0) + (filters.dateFrom || filters.dateTo ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                <Skeleton className="h-full w-full" />
              </div>
              <CardFooter className="p-3">
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render error UI
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-700 mb-2">Failed to load assets</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchAssets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
                      <div className="w-full">
                        <DatePickerWithRange
                          className="scale-90 origin-top-left"
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
                            className="pl-7 py-1 h-7 text-xs"
                            aria-label="Search assets by name"
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator className="my-1" />

                {/* Clear Filters Button - more compact */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFilters({ 
                    types: new Set(), 
                    search: '', 
                    dateFrom: null, 
                    dateTo: null
                  })}
                  className="w-full h-7 text-xs"
                  disabled={!filters.types.size && !filters.search && !filters.dateFrom && !filters.dateTo}
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadSelectedAssets}
                disabled={selectedAssets.size === 0}
                className="h-7 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={archiveSelectedAssets}
                disabled={selectedAssets.size === 0}
                className="h-7 text-xs"
              >
                <Archive className="h-3 w-3 mr-1" />
                Archive
              </Button>
              <Button
                variant="primary"
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
                    <Card key={asset.id} className={cn(
                      "overflow-hidden group rounded-md shadow-sm min-w-0",
                      asset.is_primary && isImageAsset(asset) && "ring-1 ring-primary" // Only add primary ring for images
                    )}>
                      <div className="relative p-3 pb-2">
                        {/* Asset preview - more compact */}
                        <div className="aspect-[4/3] bg-muted flex items-center justify-center rounded-md overflow-hidden">
                          {isImageAsset(asset) ? (
                            <img 
                              src={asset.url} 
                              alt={asset.name}
                              className="w-full h-auto max-h-32 object-contain"
                              onError={(e) => {
                                console.error(`Image load error for ${asset.url}`);
                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Error';
                              }}
                            />
                          ) : (
                            <div className="text-center p-3 flex flex-col items-center justify-center h-full">
                              {getAssetIcon(asset.type)}
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {getFileType(asset).toUpperCase()}
                              </p>
                              <p className="text-xs mt-1 max-w-full truncate px-2">
                                {asset.name}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Checkbox overlay */}
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Checkbox 
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => toggleAssetSelection(asset.id)}
                            className="h-3.5 w-3.5"
                          />
                        </div>
                      </div>
                      
                      <CardContent className="p-3 pt-2 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              {getAssetIcon(asset.type)}
                              <h3 className="text-xs font-medium truncate">{asset.name}</h3>
                            </div>
                            
                            <div className="mt-1 text-xs text-muted-foreground space-y-1">
                              <p className="text-[10px]">{formatFileSize(asset.size)}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px]">{formatDate(asset.uploaded_at)}</span>
                                
                                {/* Primary image badge or button - more compact */}
                                {asset.is_primary && isImageAsset(asset) ? (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-4 px-1 text-[10px]">
                                    <CheckCircle2 className="h-2 w-2 mr-0.5" />
                                    Primary
                                  </Badge>
                                ) : isImageAsset(asset) ? (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="px-1 py-0 h-4 text-[10px] hover:bg-primary/10 hover:text-primary"
                                    onClick={() => makeAssetPrimary(asset)}
                                  >
                                    Set as Primary
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          
                          {/* Asset dropdown menu - more compact */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                                <span className="sr-only">Asset menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem onClick={() => downloadAsset(asset)} className="text-xs">
                                <Download className="h-3 w-3 mr-2" />
                                Download
                              </DropdownMenuItem>
                              
                              {/* Only show Set as Primary for images that aren't already primary */}
                              {!asset.is_primary && isImageAsset(asset) && (
                                <DropdownMenuItem onClick={() => makeAssetPrimary(asset)} className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                  Set as Primary
                                </DropdownMenuItem>
                              )}
                              
                              {/* Add Rename option */}
                              <DropdownMenuItem 
                                onClick={() => {
                                  setAssetToRename(asset);
                                  setNewAssetName(asset.name);
                                }}
                                className="text-xs"
                              >
                                <Edit2 className="h-3 w-3 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => archiveAsset(asset.id)} className="text-xs">
                                <Archive className="h-3 w-3 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => deleteAsset(asset.id)}
                                className="text-destructive text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
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
                    disabled={!newAssetName.trim() || (assetToRename && newAssetName === assetToRename.name)}
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
                        const newBundle = await productService.createAssetBundle(
                          product.id,
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
            ) : bundles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                {bundles.map(bundle => {
                  // Find assets in this bundle
                  const bundleAssets = assets.filter(asset => 
                    bundle.asset_ids.includes(asset.id)
                  );
                  
                  return (
                    <Card key={bundle.id} className="overflow-hidden rounded-lg shadow min-w-0">
                      <CardHeader className="p-6 pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-medium">{bundle.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => productService.downloadAssetBundle(product.id, bundle.id)}
                            title="Download bundle"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(bundle.created_at)}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {bundle.asset_ids.length} assets
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 pt-2 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {bundleAssets.slice(0, 5).map(asset => (
                            <div 
                              key={asset.id} 
                              className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden"
                              title={asset.name}
                            >
                              {isImageAsset(asset) ? (
                                <img 
                                  src={asset.url}
                                  alt={asset.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getAssetIcon(asset.type)
                              )}
                            </div>
                          ))}
                          {bundle.asset_ids.length > 5 && (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs font-medium">
                              +{bundle.asset_ids.length - 5}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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