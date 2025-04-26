import React, { useState, useEffect } from 'react';
import { PencilIcon, AlertCircle, RefreshCcw, PlusIcon, ClockIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { Product } from '@/services/productService';
import { productService } from '@/services/productService';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductDetailDescriptionProps {
  product: Product;
  onProductUpdate?: (updatedProduct: Product) => void;
}

export const ProductDetailDescription: React.FC<ProductDetailDescriptionProps> = ({ 
  product, 
  onProductUpdate 
}) => {
  const [editing, setEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(product.description || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Get current user and permissions from auth context
  const { user, checkPermission } = useAuth();
  
  // Permissions check
  const hasEditPermission = checkPermission ? checkPermission('product.edit') : true;
  
  // Update local state when product prop changes
  useEffect(() => {
    setEditedDescription(product.description || '');
  }, [product.description]);
  
  // Handle saving description
  const handleSaveDescription = async () => {
    // Reset error state
    setSaveError(null);
    
    // Validate character limit
    if (editedDescription.length > 10000) {
      toast.error('Description exceeds maximum length of 10,000 characters');
      return;
    }
    
    // Remove script tags for security
    const sanitizedDescription = editedDescription.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    setSaving(true);
    try {
      // Make a real API call to update the product description
      if (product.id) {
        const updatedProduct = await productService.updateProduct(product.id, { 
          description: sanitizedDescription 
        });
        
        // Update the product in the parent component if callback exists
        if (onProductUpdate) {
          onProductUpdate(updatedProduct);
        }
        
        setEditing(false);
        toast.success('Description updated successfully');
      } else {
        throw new Error('Product ID is missing');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      
      // Set error message for retry UI
      setSaveError('Failed to update description. Please try again.');
      
      // Show toast with less detail
      toast.error('Failed to update description');
    } finally {
      setSaving(false);
    }
  };
  
  // Retry save after error
  const handleRetrySave = () => {
    setSaveError(null);
    handleSaveDescription();
  };
  
  // Handle cancel during editing
  const handleCancelEdit = () => {
    // Reset to original description
    setEditedDescription(product.description || '');
    setEditing(false);
    setSaveError(null);
  };

  // Get the last edit info (mock data - in a real app we'd get this from the product history)
  const getLastEditInfo = () => {
    const mockEditorName = user?.name || 'Admin User';
    const mockEditDate = new Date(product.updated_at || new Date());
    
    return {
      name: mockEditorName,
      date: mockEditDate,
      timeAgo: formatDistanceToNow(mockEditDate, { addSuffix: true })
    };
  };
  
  const lastEdit = getLastEditInfo();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Description</CardTitle>
          {product.description && (
            <CardDescription className="flex items-center mt-1 text-sm text-muted-foreground">
              <ClockIcon className="h-3 w-3 mr-1" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>Last edited by {lastEdit.name} {lastEdit.timeAgo}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{format(lastEdit.date, 'PPpp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardDescription>
          )}
        </div>
        {!editing && hasEditPermission && product.description && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEditing(true)}
            className="h-8 px-2"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {saveError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{saveError}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetrySave}
                className="ml-2"
              >
                <RefreshCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {editing ? (
          <div className="space-y-4">
            <RichTextEditor 
              value={editedDescription} 
              onChange={setEditedDescription}
              placeholder="Enter product description using Markdown formatting..."
            />
            <div className="flex justify-between items-center">
              <span className={`text-xs ${editedDescription.length > 10000 ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                {editedDescription.length}/10,000 characters
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit} 
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveDescription} 
                  disabled={saving || editedDescription.length > 10000}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {product.description ? (
              <div className="prose max-w-none">
                <ReactMarkdown>{product.description}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <p>No description available for this product.</p>
                {hasEditPermission && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setEditing(true)}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add description
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductDetailDescription; 