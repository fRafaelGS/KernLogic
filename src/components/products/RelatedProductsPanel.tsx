import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, 
  HandIcon, 
  PlusCircle, 
  RefreshCw, 
  LinkIcon, 
  AlertCircle, 
  Edit2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PuzzleIcon,
  Layers,
  ShoppingCart,
  Copy,
  Pin,
  PinOff,
  Tag,
  Loader2,
  Sparkles
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  productService, 
  Product, 
  ProductRelation, 
  RelationshipType 
} from '../../services/productService';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '../ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import EnhancedAddRelatedProductPanel from '@/components/products/EnhancedAddRelatedProductPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

// Helper function to format currency
const formatCurrency = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

// Helper to format relationship type for display
const formatRelationshipType = (type: RelationshipType): string => {
  switch (type) {
    case 'accessory': return 'Accessory';
    case 'variant': return 'Variant';
    case 'frequently_bought_together': return 'Bought Together';
    case 'replacement': return 'Replacement';
    case 'similar': return 'Similar';
    case 'general': return 'General';
    default: return 'Related';
  }
};

// Helper to get relationship type icon
const getRelationshipTypeIcon = (type: RelationshipType) => {
  switch (type) {
    case 'accessory':
      return <PuzzleIcon className="h-3.5 w-3.5" />;
    case 'variant':
      return <Layers className="h-3.5 w-3.5" />;
    case 'frequently_bought_together':
      return <ShoppingCart className="h-3.5 w-3.5" />;
    case 'replacement':
      return <RefreshCw className="h-3.5 w-3.5" />;
    case 'similar':
      return <Copy className="h-3.5 w-3.5" />;
    case 'general':
      return <LinkIcon className="h-3.5 w-3.5" />;
    default:
      return <LinkIcon className="h-3.5 w-3.5" />;
  }
};

// Helper to get relationship type badge style
const getRelationshipTypeStyle = (type: RelationshipType) => {
  switch (type) {
    case 'accessory':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30';
    case 'variant':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30';
    case 'frequently_bought_together':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/30';
    case 'replacement':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30';
    case 'similar':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30';
    case 'general':
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/30';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/30';
  }
};

// Helper to format date
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'dd MMM yyyy');
  } catch (error) {
    return 'Unknown date';
  }
};

interface RelatedProductsPanelProps {
  productId: number;
  onRefresh?: () => void;
}

interface EnhancedProduct extends Product {
  relation?: ProductRelation;
}

const RelatedProductsPanel: React.FC<RelatedProductsPanelProps> = ({ 
  productId, 
  onRefresh 
}) => {
  const [relatedProducts, setRelatedProducts] = useState<EnhancedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingRelation, setEditingRelation] = useState<ProductRelation | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('general');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  const maxProductsPerPage = 8;
  const currentPage = Math.floor(activeIndex / maxProductsPerPage) + 1;
  const totalPages = Math.ceil(relatedProducts.length / maxProductsPerPage);

  // Fetch related products on component mount
  useEffect(() => {
    if (!productId) {
      setRelatedProducts([]);
      setLoading(false);
      return;
    }
    
    fetchRelatedProducts();
  }, [productId]);
  
  const fetchRelatedProducts = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get all related products (explicit + category matches)
      const products = await productService.getRelatedProducts(productId);
      
      // 2. Get explicit relationships to identify which products are explicitly related
      const explicitRelations = await productService.getExplicitRelations(productId)
        .catch(() => []);
      
      // Create a map of related product IDs to their relation details
      const relationsMap = new Map<number, ProductRelation>();
      explicitRelations.forEach(relation => {
        relationsMap.set(relation.related_product_id, relation);
      });
      
      // 3. Mark products with their relation info
      let enhancedProducts: EnhancedProduct[] = products.map(prod => ({
        ...prod,
        relation: relationsMap.get(prod.id as number)
      }));
      
      // ---------------------------------------------------------------
      // NEW: If a related product has no thumbnail or images, attempt
      // to fetch its assets so we can display at least the primary
      // image in the card.
      // ---------------------------------------------------------------
      enhancedProducts = await Promise.all(
        enhancedProducts.map(async (p) => {
          if (
            p.primary_image_thumb ||
            (Array.isArray(p.images) && p.images.length > 0)
          ) {
            return p;
          }
          try {
            if (!p.id) return p;
            const assets = await productService.getProductAssets(p.id);
            if (Array.isArray(assets) && assets.length > 0) {
              const primary =
                assets.find(
                  (a) =>
                    a.is_primary && ((a.type || a.asset_type) || '').toLowerCase().includes('image')
                ) ||
                assets.find((a) => ((a.type || a.asset_type) || '').toLowerCase().includes('image'));
              if (primary?.url) {
                const images = assets
                  .filter((a) => ((a.type || a.asset_type) || '').toLowerCase().includes('image'))
                  .map((a, idx) => ({
                    id: typeof a.id === 'string' ? parseInt(a.id, 10) : Number(a.id),
                    url: a.url,
                    order: idx,
                    is_primary: a.id === primary.id,
                  }));
                return {
                  ...p,
                  assets,
                  images,
                  primary_image_thumb: primary.url,
                  primary_image_large: primary.url,
                } as EnhancedProduct;
              }
            }
          } catch (assetErr) {
            console.warn('[RelatedProductsPanel] Could not fetch assets for related product', p.id, assetErr);
          }
          return p;
        })
      );
      
      // Sort: pinned first, then explicitly related (manual), then algorithmic
      enhancedProducts.sort((a, b) => {
        // First sort by pinned status
        if (a.relation?.is_pinned && !b.relation?.is_pinned) return -1;
        if (!a.relation?.is_pinned && b.relation?.is_pinned) return 1;
        
        // For pinned items, maintain the order by created date (newest first)
        if (a.relation?.is_pinned && b.relation?.is_pinned) {
          return new Date(b.relation.created_at).getTime() - new Date(a.relation.created_at).getTime();
        }
        
        // Then sort by relation existence (explicit relations first)
        if (a.relation && !b.relation) return -1;
        if (!a.relation && b.relation) return 1;
        
        // Then sort by source (manual first)
        if (a.relation?.source === 'manual' && b.relation?.source !== 'manual') return -1;
        if (a.relation?.source !== 'manual' && b.relation?.source === 'manual') return 1;
        
        // Finally sort by name
        return (a.name || '').localeCompare(b.name || '');
      });
      
      setRelatedProducts(enhancedProducts);
    } catch (err) {
      console.error('Error loading related products:', err);
      setError('Failed to load related products');
      setRelatedProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new related product - Now with dialog for notes
  const handleAddRelatedProduct = async (product: Product, relType: RelationshipType = 'general', notes: string = '') => {
    console.log('Adding related product:', product);
    
    // Ensure product has all required properties for display
    const newProduct: EnhancedProduct = {
      ...product,
      name: product.name || 'Unknown Product',
      sku: product.sku || '',
      price: product.price || 0,
      is_active: true,
      relation: {
        id: 0, // Temporary ID
        product_id: productId,
        related_product_id: product.id as number,
        relationship_type: relType,
        is_pinned: false, // Default to not pinned
        created_at: new Date().toISOString(),
        source: 'manual',
        notes: notes
      }
    };
    
    console.log('New product object for UI:', newProduct);
    
    // Update the state with the new product
    setRelatedProducts(prev => {
      console.log('Previous related products:', prev);
      const updated = [newProduct, ...prev];
      console.log('Updated related products:', updated);
      return updated;
    });
    
    // Call API to add the relation
    try {
      console.log('Calling API to add relation');
      const success = await productService.toggleRelatedProduct(
        productId,
        product.id!,
        false, // Not pinned by default
        relType, // Pass relationship type directly
        notes // Pass notes
      );
      
      console.log('API response success:', success);
      
      if (!success) {
        toast.error("Failed to add related product");
        // Revert the UI change on failure
        fetchRelatedProducts();
      } else {
        toast.success("Product added to related products");
        
        // Force a refresh to ensure we have the latest data
        setTimeout(() => {
          fetchRelatedProducts();
        }, 500);
      }
    } catch (err) {
      console.error('Error adding related product:', err);
      toast.error("Failed to add related product");
      fetchRelatedProducts();
    }
  };
  
  // Handle adding multiple related products
  const handleAddMultipleRelatedProducts = async (productIds: number[], relType: RelationshipType = 'general', notes: string = '') => {
    if (!productIds.length) return { success: false, processed: 0, failed: 0 };
    
    try {
      // Call the API to add multiple related products
      const result = await productService.addMultipleRelatedProducts(
        productId,
        productIds,
        relType,
        notes
      );
      
      if (result.success) {
        toast.success(`Added ${result.processed} related products`);
        if (result.failed > 0) {
          toast.warning(`Failed to add ${result.failed} products`);
        }
      } else {
        toast.error("Failed to add related products");
      }
      
      // Refresh the list to get accurate data
      fetchRelatedProducts();
      
      return result;
    } catch (err) {
      console.error('Error adding multiple related products:', err);
      toast.error("Failed to add related products");
      return { success: false, processed: 0, failed: productIds.length };
    }
  };
  
  // Handle removing a related product
  const handleRemoveRelatedProduct = async (productToRemove: EnhancedProduct) => {
    if (!productToRemove.id) {
      toast.error("Invalid product selected for removal");
      return;
    }
    
    // Can only remove explicitly related products
    if (!productToRemove.relation) {
      toast.info("This product is shown as related because it shares the same category. It can't be removed.");
      return;
    }
    
    // Optimistically update UI
    setRelatedProducts(prev => 
      prev.filter(product => product.id !== productToRemove.id)
    );
    
    try {
      // Call API to remove the relation
      const success = await productService.removeRelatedProduct(
        productId,
        productToRemove.id
      );
      
      if (!success) {
        toast.error("Couldn't remove product");
        fetchRelatedProducts();
      }
    } catch (err) {
      console.error('Error removing related product:', err);
      toast.error("Couldn't remove product");
      fetchRelatedProducts();
    }
  };
  
  // Handle updating relationship type
  const handleUpdateRelationship = async () => {
    if (!editingRelation) return;
    
    setSaving(true);
    
    try {
      const success = await productService.updateRelationship(
        productId,
        editingRelation.related_product_id,
        {
          relationship_type: relationshipType,
          notes: notes,
          is_pinned: editingRelation.is_pinned
        }
      );
      
      if (success) {
        // Update local state
        setRelatedProducts(prev => 
          prev.map(product => {
            if (product.id === editingRelation.related_product_id) {
              return {
                ...product,
                relation: {
                  ...product.relation!,
                  relationship_type: relationshipType,
                  notes: notes
                }
              };
            }
            return product;
          })
        );
        
        toast.success("Relationship updated");
        setEditingRelation(null);
      } else {
        toast.error("Failed to update relationship");
      }
    } catch (err) {
      console.error('Error updating relationship:', err);
      toast.error("Failed to update relationship");
    } finally {
      setSaving(false);
    }
  };

  // Set up edit relation
  const setupEditRelation = (relation: ProductRelation) => {
    console.log('Setting up edit for relation:', relation);
    setEditingRelation(relation);
    setRelationshipType(relation.relationship_type);
    setNotes(relation.notes || '');
    
    // Force a re-render to ensure the popover opens
    setTimeout(() => {
      setEditingRelation({...relation});
    }, 10);
  };

  // Navigate between pages
  const handlePrevPage = () => {
    const newIndex = Math.max(0, activeIndex - maxProductsPerPage);
    setActiveIndex(newIndex);
  };
  
  const handleNextPage = () => {
    const newIndex = Math.min(
      activeIndex + maxProductsPerPage, 
      relatedProducts.length - (relatedProducts.length % maxProductsPerPage || maxProductsPerPage)
    );
    setActiveIndex(newIndex);
  };

  // Calculate visible products and navigation state
  const visibleProducts = relatedProducts.slice(
    activeIndex,
    activeIndex + maxProductsPerPage
  );
  
  console.log('All related products:', relatedProducts);
  console.log('Visible products:', visibleProducts);
  console.log('Current page:', currentPage, 'of', totalPages);
  console.log('Active index:', activeIndex, 'Max per page:', maxProductsPerPage);

  // Handle pinning/unpinning a related product
  const handleTogglePin = async (productToUpdate: EnhancedProduct, isPinned: boolean) => {
    if (!productToUpdate.id || !productToUpdate.relation) {
      toast.error("Cannot pin this product");
      return;
    }
    
    try {
      // Call API to update the pin status
      const success = await productService.updateRelationship(
        productId,
        productToUpdate.id,
        { is_pinned: isPinned }
      );
      
      if (success) {
        // Update local state and resort
        setRelatedProducts(prev => {
          // First update the pinned status
          const updatedProducts = prev.map(product => {
            if (product.id === productToUpdate.id && product.relation) {
              return {
                ...product,
                relation: {
                  ...product.relation,
                  is_pinned: isPinned
                }
              };
            }
            return product;
          });
          
          // Then re-sort based on updated pin status
          return updatedProducts.sort((a, b) => {
            // First sort by pinned status
            if (a.relation?.is_pinned && !b.relation?.is_pinned) return -1;
            if (!a.relation?.is_pinned && b.relation?.is_pinned) return 1;
            
            // For pinned items, maintain the order by created date (newest first)
            if (a.relation?.is_pinned && b.relation?.is_pinned) {
              return new Date(b.relation.created_at).getTime() - new Date(a.relation.created_at).getTime();
            }
            
            // Then sort by relation existence (explicit relations first)
            if (a.relation && !b.relation) return -1;
            if (!a.relation && b.relation) return 1;
            
            // Then sort by source (manual first)
            if (a.relation?.source === 'manual' && b.relation?.source !== 'manual') return -1;
            if (a.relation?.source !== 'manual' && b.relation?.source === 'manual') return 1;
            
            // Finally sort by name
            return (a.name || '').localeCompare(b.name || '');
          });
        });
        
        toast.success(isPinned ? "Product pinned" : "Product unpinned");
      } else {
        toast.error(isPinned ? "Failed to pin product" : "Failed to unpin product");
      }
    } catch (err) {
      console.error('Error updating pin status:', err);
      toast.error(isPinned ? "Failed to pin product" : "Failed to unpin product");
    }
  };

  if (loading) {
    return (
      <CollapsibleSection 
        title="Related Products" 
        description="Loading related products..."
        id="related-products-section"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="w-full">
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="flex justify-between p-4">
                <Skeleton className="h-4 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  // Create the action buttons for the section header
  const actionButtons = (
    <div className="flex space-x-2">
      {error && (
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRelatedProducts}
          className="text-destructive"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Try Again
        </Button>
      )}
      
      {relatedProducts.length > maxProductsPerPage && (
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handlePrevPage}
            disabled={activeIndex === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleNextPage}
            disabled={activeIndex + maxProductsPerPage >= relatedProducts.length}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  // Description for the collapsible section
  const sectionDescription = relatedProducts.length > 0 
    ? `${relatedProducts.length} related product${relatedProducts.length !== 1 ? 's' : ''}`
    : undefined;

  return (
    <CollapsibleSection
      title="Related Products"
      description={sectionDescription}
      actions={actionButtons}
      defaultOpen={true} 
      id="related-products-section"
    >
      <div className="space-y-4">
        <EnhancedAddRelatedProductPanel 
          productId={productId}
          relatedProducts={relatedProducts}
          onProductAdded={handleAddRelatedProduct}
          onMultipleProductsAdded={handleAddMultipleRelatedProducts}
        />
        
        <div className="relative">
          {error ? (
            <div className="text-center p-8 bg-muted rounded-md">
              <p className="text-destructive">{error}</p>
            </div>
          ) : relatedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-md">
              <div className="flex flex-col items-center text-center max-w-md space-y-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <LinkIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-medium">Add your first related product</h3>
                <p className="text-muted-foreground">
                  Related products help customers discover alternatives, complements, and accessories for this product.
                </p>
                
                <div className="flex space-x-4 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                  >
                    <a href="https://help.kernlogic.com/related-products" target="_blank" rel="noopener noreferrer">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Why add related products?
                    </a>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <a href="https://help.kernlogic.com/related-products-upsell" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      See how Related Products drive +15% upsell
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {visibleProducts.map((product) => (
                <RelatedProductCard
                  key={product.id}
                  product={product}
                  onRemove={() => handleRemoveRelatedProduct(product)}
                  onEdit={product.relation ? () => setupEditRelation(product.relation!) : undefined}
                  onTogglePin={product.relation ? (isPinned: boolean) => handleTogglePin(product, isPinned) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Relation Dialog - Centered on screen */}
      <Dialog
        open={!!editingRelation}
        onOpenChange={(open) => !open && setEditingRelation(null)}
      >
        {editingRelation && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Relationship</DialogTitle>
              <DialogDescription>
                Update how this product relates to the current product. The relationship type helps customers understand product connections.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="relationship-type">Relationship Type</Label>
                <Select
                  value={relationshipType}
                  onValueChange={(value: RelationshipType) => setRelationshipType(value)}
                >
                  <SelectTrigger id="relationship-type" className="w-full">
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Relationship Type</SelectLabel>
                      <SelectItem value="accessory" className="flex items-center gap-2">
                        <PuzzleIcon className="h-4 w-4 text-purple-600" />
                        <span>Accessory</span>
                      </SelectItem>
                      <SelectItem value="variant" className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-indigo-600" />
                        <span>Variant</span>
                      </SelectItem>
                      <SelectItem value="frequently_bought_together" className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-green-600" />
                        <span>Bought Together</span>
                      </SelectItem>
                      <SelectItem value="replacement" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-600" />
                        <span>Replacement</span>
                      </SelectItem>
                      <SelectItem value="similar" className="flex items-center gap-2">
                        <Copy className="h-4 w-4 text-blue-600" />
                        <span>Similar</span>
                      </SelectItem>
                      <SelectItem value="general" className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-slate-600" />
                        <span>General</span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {relationshipType === 'accessory' && 'Complementary product that enhances the main product'}
                  {relationshipType === 'variant' && 'Alternative version of the same product (size, color, etc.)'}
                  {relationshipType === 'frequently_bought_together' && 'Products often purchased together'}
                  {relationshipType === 'replacement' && 'Product that can replace or succeed the current one'}
                  {relationshipType === 'similar' && 'Product with similar features or use cases'}
                  {relationshipType === 'general' && 'General related product'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this relationship"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Notes will appear on the product card and help explain the relationship to customers.
                </p>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-end">
              <Button 
                variant="outline"
                onClick={() => setEditingRelation(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateRelationship}
                disabled={saving}
              >
                {saving ? 
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </> 
                  : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </CollapsibleSection>
  );
};

interface RelatedProductCardProps {
  product: EnhancedProduct;
  onRemove: () => void;
  onEdit?: () => void;
  onTogglePin?: (isPinned: boolean) => void;
}

// Helper to get relationship label for card header
const getRelationshipTypeLabel = (relation?: ProductRelation): string => {
  if (!relation) return 'Category Match';
  
  switch (relation.relationship_type) {
    case 'accessory': return 'Accessory';
    case 'variant': return 'Variant';
    case 'frequently_bought_together': return 'Bought Together';
    case 'replacement': return 'Replacement';
    case 'similar': return 'Similar';
    case 'general': return 'Related';
    default: return 'Related';
  }
};

// Helper to get relationship type icon color for card header
const getRelationshipHeaderIconColor = (relation?: ProductRelation): string => {
  if (!relation) return 'text-slate-500';
  
  switch (relation.relationship_type) {
    case 'accessory': return 'text-purple-600 dark:text-purple-400';
    case 'variant': return 'text-indigo-600 dark:text-indigo-400';
    case 'frequently_bought_together': return 'text-green-600 dark:text-green-400';
    case 'replacement': return 'text-orange-600 dark:text-orange-400';
    case 'similar': return 'text-blue-600 dark:text-blue-400';
    case 'general': return 'text-slate-600 dark:text-slate-400';
    default: return 'text-slate-600 dark:text-slate-400';
  }
};

// Helper to get relationship border color for card header
const getRelationshipBorderColor = (relation?: ProductRelation): string => {
  if (!relation) return 'border-slate-300 dark:border-slate-600';
  
  switch (relation.relationship_type) {
    case 'accessory': return 'border-purple-400 dark:border-purple-600';
    case 'variant': return 'border-indigo-400 dark:border-indigo-600';
    case 'frequently_bought_together': return 'border-green-400 dark:border-green-600';
    case 'replacement': return 'border-orange-400 dark:border-orange-600';
    case 'similar': return 'border-blue-400 dark:border-blue-600';
    case 'general': return 'border-slate-400 dark:border-slate-600';
    default: return 'border-slate-400 dark:border-slate-600';
  }
};

const RelatedProductCard: React.FC<RelatedProductCardProps> = ({ 
  product, 
  onRemove,
  onEdit,
  onTogglePin
}) => {
  const [hovering, setHovering] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit?.();
    }
  };
  
  const isManuallyAdded = product.relation?.source === 'manual';
  const isAutoSuggested = !!product.relation && product.relation.source === 'algorithm';
  const isImplicitRelation = !product.relation; // No relation = implicitly related (by category)
  const isPinned = product.relation?.is_pinned || false;
  
  const tooltipText = isManuallyAdded 
    ? `Added manually on ${formatDate(product.relation!.created_at)}`
    : isAutoSuggested
    ? "Algorithmic suggestion"
    : `Matched by category: ${product.category}`;
    
  const handleTogglePin = async () => {
    if (!product.relation || !onTogglePin) return;
    
    setIsPinning(true);
    try {
      await onTogglePin(!isPinned);
    } finally {
      setIsPinning(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Card 
        className={`
          relative overflow-hidden transition-all duration-200
          ${isManuallyAdded ? 'border-primary/20' : ''}
          ${isAutoSuggested ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}
          ${isImplicitRelation ? 'bg-muted/30' : ''}
          ${isPinned ? 'ring-2 ring-yellow-300 dark:ring-yellow-500/50' : ''}
          ${hovering ? 'shadow-md scale-[1.01]' : ''}
          ${product.relation ? getRelationshipBorderColor(product.relation) : ''}
        `}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Relationship type badge - always visible at top */}
        {product.relation?.relationship_type && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <Badge 
              variant="outline" 
              className={`${getRelationshipTypeStyle(product.relation.relationship_type)} flex items-center gap-1 px-3 min-w-[110px] justify-center whitespace-nowrap`}
            >
              {getRelationshipTypeIcon(product.relation.relationship_type)}
              <span>{formatRelationshipType(product.relation.relationship_type)}</span>
            </Badge>
          </div>
        )}
        
        {/* Pinned indicator - small icon in top left */}
        {isPinned && (
          <div className="absolute top-2 left-2 z-20">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-700/40 dark:text-yellow-300 h-6 w-6 p-0 flex items-center justify-center">
                  <Pin className="h-3 w-3" />
                  <span className="sr-only">Pinned</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right">
                Pinned product - displays at the top of the list
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* Source badges - moved to align properly with pin badge */}
        <div className={`absolute top-2 ${isPinned ? 'left-10' : 'left-2'} flex flex-col gap-1`}>
          {isManuallyAdded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 border-primary/30">
                  <HandIcon className="h-3 w-3" />
                  <span className="sr-only md:not-sr-only">Manual</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          )}
          
          {isAutoSuggested && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Sparkles className="h-3 w-3 mr-1" />
                  <span>Suggested</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          )}
          
          {isImplicitRelation && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-muted/70">
                  <Tag className="h-3 w-3 mr-1" />
                  <span>Category Match</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Quick actions on hover */}
        {hovering && !isImplicitRelation && (
          <div className="absolute bottom-2 right-2 flex gap-1 z-10 animate-in fade-in duration-150">
            {onTogglePin && product.relation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className={`h-7 w-7 ${isPinned ? 'bg-yellow-100 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800/40' : ''}`}
                    onClick={handleTogglePin}
                    disabled={isPinning}
                  >
                    {isPinning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isPinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">{isPinned ? 'Unpin' : 'Pin'} related product</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isPinned ? 'Unpin product' : 'Pin product to show first'}
                </TooltipContent>
              </Tooltip>
            )}
            
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7" 
                    onClick={onEdit}
                    onKeyDown={handleKeyDown}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit relationship</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Edit relationship type and notes
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                  onClick={onRemove}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove related product</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Remove related product
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* Card Content */}
        <Link to={`/app/products/${product.id}`} className="block">
          <CardContent className="p-4 pt-12">
            <div className="aspect-square bg-accent rounded-md mb-3 flex items-center justify-center">
              {product.primary_image_thumb ? (
                <img 
                  src={product.primary_image_thumb} 
                  alt={product.name} 
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-muted-foreground text-xs">No Image</div>
              )}
            </div>
            
            <div className="space-y-1">
              <h4 className="font-medium leading-tight line-clamp-2">{product.name}</h4>
              <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col p-4 pt-0">
            <div className="flex justify-between w-full">
              <div className="text-sm font-medium">
                {product.price !== undefined ? formatCurrency(product.price) : 'N/A'}
              </div>
            </div>
            
            {/* Display notes if available */}
            {product.relation?.notes && (
              <div className="w-full mt-2 pt-2 border-t border-dashed border-muted">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {product.relation.notes.length > 50 
                    ? product.relation.notes.substring(0, 50) + '...'
                    : product.relation.notes
                  }
                </p>
              </div>
            )}
          </CardFooter>
        </Link>
      </Card>
    </TooltipProvider>
  );
};

export default RelatedProductsPanel; 