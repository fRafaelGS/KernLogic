import React, { useState } from 'react';
import { Product } from '@/services/productService';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, ImageIcon, AlertCircle, UploadCloud } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Mock user permissions - in a real app, these would come from auth context
const hasEditPermission = true;

interface ProductDetailSidebarProps {
  product: Product;
}

// Helper function to format date for display and tooltip
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return { display: '-', relative: '' };
  
  const date = new Date(dateString);
  return {
    display: format(date, 'dd MMM yyyy · HH:mm'),
    relative: formatDistanceToNow(date, { addSuffix: true })
  };
};

// Helper to validate GTIN format
const validateGTIN = (gtin: string | undefined): boolean => {
  if (!gtin) return true; // No GTIN is valid for our validator
  
  // Check if it's a valid EAN/UPC format with basic regex
  const isValidFormat = /^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/.test(gtin);
  if (!isValidFormat) return false;
  
  // Implement checksum validation for EAN/UPC
  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop();
  const sum = digits.reduce((acc, val, idx) => {
    return acc + val * (idx % 2 === 0 ? 1 : 3);
  }, 0);
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === calculatedCheckDigit;
};

// Mock price history data
const priceHistory = [
  { date: '15 Nov 2023', oldPrice: '85.00', newPrice: '89.99', user: 'John Doe' },
  { date: '25 Sep 2023', oldPrice: '79.99', newPrice: '85.00', user: 'Jane Smith' },
  { date: '15 Aug 2023', oldPrice: '75.00', newPrice: '79.99', user: 'Mike Johnson' },
  { date: '30 Jul 2023', oldPrice: '72.50', newPrice: '75.00', user: 'Jane Smith' },
  { date: '10 Jun 2023', oldPrice: '69.99', newPrice: '72.50', user: 'John Doe' },
];

export function ProductDetailSidebar({ product }: ProductDetailSidebarProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  const createdDate = formatDate(product.created_at);
  const modifiedDate = formatDate(product.updated_at);
  
  // Handle thumbnail display
  const thumbUrl = product.primary_image_thumb || 
    product.images?.find(img => img.is_primary)?.url || 
    product.images?.[0]?.url;
  
  const largeImageUrl = product.primary_image_large || 
    product.images?.find(img => img.is_primary)?.url || 
    product.images?.[0]?.url;
  
  const isGtinValid = validateGTIN(product.barcode);
  
  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`, { duration: 1000 }))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Hero image section */}
        {thumbUrl ? (
          <div 
            className="w-full h-48 bg-slate-100 relative cursor-pointer overflow-hidden"
            onClick={() => setImageDialogOpen(true)}
            tabIndex={0}
            aria-label="View product image"
            onKeyDown={(e) => e.key === 'Enter' && setImageDialogOpen(true)}
          >
            <img 
              src={thumbUrl} 
              alt={product.name} 
              className="w-full h-full object-cover hover:scale-105 transition-transform" 
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-slate-100 flex flex-col items-center justify-center">
            <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
            {hasEditPermission && (
              <Button variant="outline" size="sm" className="mt-2">
                <UploadCloud className="h-4 w-4 mr-2" />
                Upload image
              </Button>
            )}
          </div>
        )}
        
        {/* Image preview dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            <div className="w-full h-[500px] flex items-center justify-center bg-slate-100">
              {largeImageUrl ? (
                <img 
                  src={largeImageUrl} 
                  alt={product.name} 
                  className="max-w-full max-h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-24 w-24 text-slate-400" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Core product fields */}
        <div className="p-4 space-y-3">
          <h2 className="font-medium text-sm text-slate-500 uppercase tracking-wider mb-2">
            Core Information
          </h2>
          
          {/* SKU with copy button */}
          <div className="flex justify-between items-center group">
            <span className="text-slate-500">SKU</span>
            <div className="flex items-center">
              <code className="font-mono text-xs bg-slate-50 px-1.5 py-0.5 rounded">
                {product.sku}
              </code>
              <button 
                onClick={() => handleCopyToClipboard(product.sku, 'SKU')}
                className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Copy SKU to clipboard"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
          </div>
          
          {/* Name */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Name</span>
            <span className="font-medium text-right text-sm max-w-[200px] truncate" title={product.name}>
              {product.name}
            </span>
          </div>
          
          {/* Category */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Category</span>
            <span className="font-medium text-right text-sm max-w-[200px] truncate" title={product.category}>
              {product.category || '-'}
            </span>
          </div>
          
          {/* Brand */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Brand</span>
            <span className="font-medium text-right text-sm">
              {product.brand || '-'}
            </span>
          </div>
          
          {/* Tags */}
          <div className="flex justify-between items-start">
            <span className="text-slate-500 mt-1">Tags</span>
            <div className="flex flex-wrap justify-end gap-1 max-w-[70%]">
              {product.tags && product.tags.length > 0 ? (
                <>
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-primary-50 text-primary-700 border-primary-200">
                      {tag}
                    </Badge>
                  ))}
                  
                  {product.tags.length > 3 && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200 cursor-pointer">
                          +{product.tags.length - 3} more
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.slice(3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-primary-50 text-primary-700 border-primary-200">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </>
              ) : (
                <span className="text-right text-sm text-slate-400">-</span>
              )}
            </div>
          </div>
          
          {/* GTIN/Barcode */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">GTIN</span>
            <div className="flex items-center group">
              <code className="font-mono text-xs">
                {product.barcode || '-'}
              </code>
              {product.barcode && (
                <>
                  <button 
                    onClick={() => handleCopyToClipboard(product.barcode || '', 'GTIN')}
                    className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Copy GTIN to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
                  </button>
                  {!isGtinValid && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 ml-1.5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Invalid GTIN checksum</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Price with history tooltip */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Price</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`font-medium ${product.price > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    ${(product.price || 0).toFixed(2)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-xs">Price history:</p>
                    {priceHistory.length > 0 ? (
                      <ul className="text-xs space-y-1">
                        {priceHistory.slice(0, 5).map((entry, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span>{entry.date}</span>
                            <span className="text-slate-500">${entry.oldPrice} → ${entry.newPrice}</span>
                            <span className="text-xs text-slate-400">by {entry.user}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No price changes recorded</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Status</span>
            <Badge
              className={
                product.is_active
                  ? "bg-success-50 text-success-700 border border-success-200"
                  : "bg-danger-50 text-danger-700 border border-danger-200"
              }
            >
              {product.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {/* Created */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <span className="text-slate-500 text-xs">Created</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 text-xs">{createdDate.display}</span>
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.created_by || 'User')}&size=32`} />
                      <AvatarFallback className="text-[8px]">{(product.created_by || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{createdDate.relative} by {product.created_by || 'Unknown user'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Last Modified */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-xs">Last modified</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 text-xs">{modifiedDate.display}</span>
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(product.created_by || 'User')}&size=32`} />
                      <AvatarFallback className="text-[8px]">{(product.created_by || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{modifiedDate.relative} by {product.created_by || 'Unknown user'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 