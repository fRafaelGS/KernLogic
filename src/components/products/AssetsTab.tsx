import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileIcon, FileSpreadsheet, FileText, ImageIcon, 
  Upload, X, CheckCircle2, AlertCircle, RefreshCw, 
  ChevronDown, ChevronRight, MoreHorizontal, Download, 
  Archive, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Product, ProductAsset, productService } from '@/services/productService';
import axiosInstance from '@/lib/axiosInstance';
import { PRODUCTS_API_URL } from '@/services/productService';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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

  // Fetch assets on component mount
  useEffect(() => {
    if (product?.id) {
      fetchAssets();
    }
  }, [product?.id]);

  // Process assets into groups whenever they change
  useEffect(() => {
    console.log('[AssetsTab] assets state changed:', assets);
    console.log('[AssetsTab] Is assets an array?', Array.isArray(assets));
    
    if (Array.isArray(assets) && assets.length) {
      groupAssetsByBaseName();
    }
  }, [assets]);

  // Fetch assets from API
  const fetchAssets = async () => {
    if (!product?.id) return;
    
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
  };

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
      toast.error('Cannot upload files - product ID is missing');
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
    const formData = new FormData();
    formData.append('file', upload.file);
    formData.append('name', upload.file.name);
    
    // Log all FormData entries for debugging
    console.log(`Attempting to upload file to ${PRODUCTS_API_URL}/${productId}/assets/`);
    console.log('FormData contents:', [...formData.entries()].map(entry => 
      entry[0] === 'file' ? `${entry[0]}: [File ${upload.file.name}, ${upload.file.size} bytes, ${upload.file.type}]` : `${entry[0]}: ${entry[1]}`
    ));
    
    try {
      // Update progress to indicate we're starting
      updateUploadProgress(upload.id, 10);
      
      // Upload the file to the assets endpoint
      const response = await productService.uploadAsset(
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
      
      // Add the new asset to the list
      setAssets(prev => {
        // If this is primary, make sure other assets are not primary
        const updatedAssets = response.is_primary 
          ? prev.map(asset => ({...asset, is_primary: false}))
          : prev;
          
        const newAssets = [response, ...updatedAssets];
        
        // Update localStorage with new assets
        if (product?.id) {
          try {
            localStorage.setItem(`product_assets_${productId}`, JSON.stringify(newAssets));
          } catch (err) {
            console.error('Failed to save assets to localStorage:', err);
          }
        }
        
        return newAssets;
      });
      
      // Notify parent component if callback exists
      if (onAssetUpdate) {
        onAssetUpdate([response, ...assets]);
      }
      
      toast.success('File uploaded successfully');
      
      // Remove upload item after a delay
      setTimeout(() => {
        setUploading(prev => prev.filter(item => item.id !== upload.id));
      }, 2000);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Upload error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      // Handle different error cases
      if (error?.response?.status === 413) {
        updateUploadStatus(upload.id, 'error', 'File too large');
        toast.error('This file is too large to upload');
      } 
      else if (error?.response?.status === 415) {
        updateUploadStatus(upload.id, 'error', 'File type not supported');
        toast.error('This file type is not supported');
      }
      else {
        updateUploadStatus(upload.id, 'error', 'Upload failed');
        toast.error('Failed to upload file');
      }
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

  // Make an asset primary
  const makeAssetPrimary = async (asset: ProductAsset) => {
    if (asset.is_primary) return; // Already primary

    // Optimistically update UI
    const oldAssets = [...assets];
    const newAssets = assets.map(a => ({
      ...a,
      is_primary: a.id === asset.id
    }));
    
    setAssets(newAssets);
    
    console.log(`Setting asset ${asset.id} as primary for product ${product.id}`);
    
    try {
      const success = await productService.setAssetPrimary(product.id, asset.id);
      
      if (success) {
        toast.success('Primary asset updated');
        
        // Create updated product with new primary image
        const updatedProduct = {
          ...product,
          primary_image_thumb: asset.url,
          primary_image_large: asset.url,
          images: newAssets.filter(a => a.type.toLowerCase() === 'image').map(a => ({
            id: typeof a.id === 'string' ? parseInt(a.id, 10) : Number(a.id),
            url: a.url,
            is_primary: a.is_primary,
            order: a.order || 0
          }))
        };
        
        // Ensure parent components know about the change
        if (onAssetUpdate) {
          onAssetUpdate(newAssets);
        }
        
        // Instead of reloading, update the parent component with the new product details
        if (product?.id) {
          try {
            // Update the product in the backend to make sure changes persist
            await productService.updateProduct(product.id, {
              primary_image_thumb: asset.url,
              primary_image_large: asset.url
            });
            console.log('Product updated with new primary image:', asset.url);
            
            // Fetch the product data again to ensure we have the latest version
            const refreshedProduct = await productService.getProduct(product.id);
            console.log('Product refreshed:', refreshedProduct);
            
            // Update the product in the parent component if a callback is provided
            if (window.parent && window.parent.onProductUpdated) {
              window.parent.onProductUpdated(refreshedProduct);
            }
          } catch (err) {
            console.error('Error updating product:', err);
          }
        }
      } else {
        // Revert if API call failed
        setAssets(oldAssets);
        toast.error('Failed to update primary asset');
      }
    } catch (error) {
      console.error('Error making asset primary:', error);
      setAssets(oldAssets);
      toast.error('Failed to update primary asset');
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
      
      toast.success('Asset deleted');
    } catch (err) {
      console.error('Error deleting asset:', err);
      toast.error('Failed to delete asset');
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
      
      toast.success('Asset archived');
    } catch (err) {
      console.error('Error archiving asset:', err);
      toast.error('Failed to archive asset');
    }
  };

  // Download an asset
  const downloadAsset = (asset: ProductAsset) => {
    if (!asset.url) {
      toast.error('Asset URL is missing');
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
      toast.error('No assets selected');
      return;
    }
    
    assets
      .filter(asset => selectedAssets.has(asset.id))
      .forEach(downloadAsset);
    
    toast.success(`Downloading ${selectedAssets.size} assets`);
  };

  // Archive selected assets
  const archiveSelectedAssets = async () => {
    if (!product?.id || selectedAssets.size === 0) {
      toast.error('No assets selected');
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
      
      toast.success(`${selectedAssets.size} assets archived`);
    } catch (err) {
      console.error('Error archiving assets:', err);
      toast.error('Failed to archive assets');
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

  // Determine asset icon based on file type
  const getAssetIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'spreadsheet':
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'text':
      case 'doc':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileIcon className="h-5 w-5" />;
    }
  };

  // Format file size
  const formatFileSize = (sizeString: string) => {
    // If it's already formatted (e.g., "1.2MB"), return as is
    if (typeof sizeString === 'string' && sizeString.match(/^[\d.]+\s*[KMGT]?B$/i)) {
      return sizeString;
    }
    
    // Try to parse as number (bytes)
    try {
      const bytes = typeof sizeString === 'string' ? parseInt(sizeString, 10) : sizeString;
      
      if (isNaN(bytes)) return 'Unknown size';
      
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    } catch (err) {
      return 'Unknown size';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d yyyy');
    } catch (err) {
      return 'Unknown date';
    }
  };

  // Render loading UI
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Assets</h2>
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
    <div className="p-6 space-y-6">
      {/* Bulk actions toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center">
          <Checkbox 
            id="select-all" 
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            className="mr-2"
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Select All
          </label>
          
          <span className="ml-4 text-sm text-muted-foreground">
            {selectedAssets.size} selected
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadSelectedAssets}
            disabled={selectedAssets.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={archiveSelectedAssets}
            disabled={selectedAssets.size === 0}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>
      
      {/* Dropzone area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-1">Drag files here or click to upload</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Upload images, PDFs, spreadsheets, and other documents
        </p>
        <Button variant="outline" size="sm" type="button">
          Select Files
        </Button>
      </div>
      
      {/* Upload progress indicators */}
      {uploading.length > 0 && (
        <div className="space-y-3 mt-6">
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
      
      {/* Asset gallery grid */}
      {(!Array.isArray(assets) || assets.length === 0) && !uploading.length ? (
        <div className="text-center p-8 bg-muted/40 rounded-lg mt-6">
          <FileIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">No assets yet</h3>
          <p className="text-sm text-muted-foreground">
            Upload files to see them here
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.isArray(assets) && assets
              // Sort assets: primary images first, then by upload date
              .sort((a, b) => {
                // Primary images always come first
                if (a.is_primary && !b.is_primary) return -1;
                if (!a.is_primary && b.is_primary) return 1;
                
                // If both are primary or both aren't, sort by upload date (newest first)
                return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
              })
              .map(asset => (
                <Card key={asset.id} className={cn(
                  "overflow-hidden group",
                  asset.is_primary && "ring-2 ring-primary" // Add a subtle border for primary image
                )}>
                  <div className="relative">
                    {/* Asset preview */}
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {asset.type.toLowerCase() === 'image' ? (
                        <img 
                          src={asset.url} 
                          alt={asset.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Error';
                          }}
                        />
                      ) : (
                        <div className="text-center p-4">
                          {getAssetIcon(asset.type)}
                          <p className="text-xs text-muted-foreground mt-2">
                            {asset.type.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Checkbox overlay */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Checkbox 
                        checked={selectedAssets.has(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                      />
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.type)}
                          <h3 className="text-sm font-medium truncate">{asset.name}</h3>
                        </div>
                        
                        <div className="mt-1 text-xs text-muted-foreground space-y-1">
                          <p>{formatFileSize(asset.size)}</p>
                          <div className="flex items-center justify-between">
                            <span>{formatDate(asset.uploaded_at)}</span>
                            
                            {/* Add the primary button */}
                            {asset.is_primary ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="px-2 py-0 h-6 text-xs hover:bg-primary/10 hover:text-primary"
                                onClick={() => makeAssetPrimary(asset)}
                              >
                                Set as Primary
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Asset menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadAsset(asset)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          
                          {!asset.is_primary && (
                            <DropdownMenuItem onClick={() => makeAssetPrimary(asset)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem onClick={() => archiveAsset(asset.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => deleteAsset(asset.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
    </div>
  );
};

export default AssetsTab; 