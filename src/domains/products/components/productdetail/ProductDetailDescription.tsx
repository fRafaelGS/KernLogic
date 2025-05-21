import React, { useState, useEffect } from 'react';
import { PencilIcon, AlertCircle, RefreshCcw, PlusIcon, ClockIcon, XIcon, CheckIcon, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { Product } from '@/domains/products/services/productService';
import { productService } from '@/domains/products/services/productService';
import { useAuth } from '@/domains/app/providers/AuthContext';

import { Card, CardContent } from '@/domains/core/components/ui/card';
import { Button } from '@/domains/core/components/ui/button';
import { Alert, AlertDescription } from '@/domains/core/components/ui/alert';
import { RichTextEditor } from '@/domains/core/components/ui/RichTextEditor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { CollapsibleSection } from '@/domains/core/components/ui/CollapsibleSection';

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
  const [charCount, setCharCount] = useState(product.description?.length || 0);
  
  // Get current user and permissions from auth context
  const { user, checkPermission } = useAuth();
  
  // Permissions check
  const hasEditPermission = checkPermission ? checkPermission('product.edit') : true;
  
  // Update local state when product prop changes
  useEffect(() => {
    setEditedDescription(product.description || '');
    setCharCount(product.description?.length || 0);
  }, [product.description]);
  
  // Handle content change
  const handleContentChange = (newContent: string) => {
    setEditedDescription(newContent);
    setCharCount(newContent.length);
  };
  
  // Handle saving description
  const handleSaveDescription = async () => {
    // Reset error state
    setSaveError(null);
    
    // Validate character limit
    if (charCount > 10000) {
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
    } catch (error: any) {
      console.error('Error updating description:', error);
      
      // Set error message for retry UI with more details
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to update description. Please try again.';
                           
      setSaveError(errorMessage);
      
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
    setCharCount(product.description?.length || 0);
    setEditing(false);
    setSaveError(null);
  };

  // Get the last edit info
  const getLastEditInfo = () => {
    const editorName = product.created_by || user?.name || 'Unknown';
    const editDate = new Date(product.updated_at || new Date());
    
    return {
      name: editorName,
      date: editDate,
      timeAgo: formatDistanceToNow(editDate, { addSuffix: true })
    };
  };
  
  const lastEdit = getLastEditInfo();
  
  // Action button for the section header
  const actionButton = !editing && hasEditPermission && product.description && (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => setEditing(true)}
      className="h-8 px-2"
      aria-label="Edit product description"
    >
      <PencilIcon className="h-4 w-4 mr-2" />
      Edit
    </Button>
  );
  
  // Section description with last edit info
  const sectionDescription = product.description ? (
    <div className="flex items-center mt-1 text-sm text-muted-foreground">
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
    </div>
  ) : undefined;

  return (
    <CollapsibleSection
      title="Description"
      description={sectionDescription}
      actions={actionButton}
      defaultOpen={true}
      id="product-description-section"
    >
      <AnimatePresence mode="wait">
        {saveError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{saveError}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetrySave}
                  className="ml-2"
                  aria-label="Retry saving description"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3 w-3 mr-1" />
                  )}
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        
        {editing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <RichTextEditor 
              value={editedDescription} 
              onChange={handleContentChange}
              placeholder="Enter product description using Markdown formatting..."
              aria-label="Product description editor"
              aria-required="false"
              aria-invalid={charCount > 10000}
            />
            <div className="flex justify-between items-center">
              <span 
                className={`text-xs ${charCount > 10000 ? 'text-red-500 font-medium' : (charCount > 8000 ? 'text-amber-500' : 'text-slate-500')}`}
                aria-live="polite"
              >
                {charCount}/10,000 characters
                {charCount > 10000 && (
                  <span className="ml-2 text-red-500">
                    ({charCount - 10000} over limit)
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit} 
                  disabled={saving}
                  aria-label="Cancel editing"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveDescription} 
                  disabled={saving || charCount > 10000}
                  aria-label="Save description"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            {product.description ? (
              <ReactMarkdown>{product.description}</ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 border border-dashed rounded-md">
                <div className="p-3 rounded-full bg-primary/10">
                  <PlusIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-medium">Add a description</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Detailed product descriptions help customers understand your product and improve search visibility.
                </p>
                
                {hasEditPermission && (
                  <Button 
                    onClick={() => setEditing(true)} 
                    className="mt-4"
                    aria-label="Add description"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Add Description
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </CollapsibleSection>
  );
};

export default ProductDetailDescription; 