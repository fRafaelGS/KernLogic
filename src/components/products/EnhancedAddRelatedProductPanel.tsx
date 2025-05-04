import React, { useState, useRef, useEffect } from 'react';
import { 
  Product, 
  productService, 
  RelationshipType 
} from '@/services/productService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  Search, 
  Plus, 
  Check, 
  Sparkles, 
  AlertCircle,
  Info,
  MessageSquare,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from 'lodash';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EnhancedAddRelatedProductPanelProps {
  productId: number;
  relatedProducts: Product[];
  onProductAdded: (product: Product, relationshipType: RelationshipType, notes?: string) => void;
  onMultipleProductsAdded: (
    productIds: number[], 
    relationshipType: RelationshipType,
    notes?: string
  ) => Promise<{
    success: boolean;
    processed: number;
    failed: number;
  } | void>;
}

export const EnhancedAddRelatedProductPanel: React.FC<EnhancedAddRelatedProductPanelProps> = ({
  productId,
  relatedProducts,
  onProductAdded,
  onMultipleProductsAdded
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType>('general');
  const [notes, setNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  
  // Create a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Load algorithmic suggestions on mount
  useEffect(() => {
    if (productId) {
      loadAlgorithmicSuggestions();
    }
  }, [productId]);
  
  const loadAlgorithmicSuggestions = async () => {
    if (!productId) return;
    
    setIsSuggestionsLoading(true);
    
    try {
      // This would be a call to an endpoint that returns AI/algorithm-suggested products
      // For now we'll simulate by getting products from the same category
      // In a real implementation, you'd have a dedicated endpoint like:
      // const suggestedProducts = await productService.getProductSuggestions(productId);
      
      // Simulating with a search for now
      const allProducts = await productService.searchProducts('', 20);
      
      // Filter out current product and existing related products
      const filteredSuggestions = allProducts.filter(product => 
        product.id !== productId && 
        !relatedProducts.some(related => related.id === product.id)
      ).slice(0, 5); // Limit to 5 suggestions
      
      setSuggestions(filteredSuggestions);
    } catch (err) {
      console.error('Error loading algorithmic suggestions:', err);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };
  
  // Create a debounced search function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useRef(
    debounce(async (term: string) => {
      if (!term || term.length < 2) {
        setResults([]);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Using the dedicated searchProducts function
        const products = await productService.searchProducts(term);
        
        // Filter out the current product and any already related products
        const filteredProducts = products.filter(product => 
          product.id !== productId && 
          !relatedProducts.some(related => related.id === product.id)
        );
        
        setResults(filteredProducts.slice(0, 10)); // Limit to 10 results
      } catch (err) {
        console.error('Error searching products:', err);
        setError('Failed to search products');
      } finally {
        setIsLoading(false);
      }
    }, 300)
  ).current;
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };
  
  // Handle product selection
  const handleSelectProduct = (product: Product, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, product]);
    } else {
      setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
    }
  };
  
  // Handle adding a suggestion
  const handleAddSuggestion = async (product: Product) => {
    setAddingProduct(true);
    
    try {
      await onProductAdded(product, selectedRelationshipType, notes);
      
      // Remove from suggestions
      setSuggestions(prev => prev.filter(p => p.id !== product.id));
      
      // Show success message
      toast.success("Suggested product added");
      
      // Reset notes
      setNotes('');
      setShowNotesField(false);
    } catch (err) {
      console.error('Error adding suggested product:', err);
      toast.error("Failed to add suggested product");
    } finally {
      setAddingProduct(false);
    }
  };
  
  // Handle adding multiple selected products
  const handleAddSelectedProducts = async () => {
    if (!selectedProducts.length) return;
    
    setAddingProduct(true);
    
    try {
      // Extract IDs for bulk operation
      const productIds = selectedProducts.map(p => p.id!);
      
      // Call the handler function
      const result = await onMultipleProductsAdded(productIds, selectedRelationshipType, notes);
      
      // Reset selection and search
      setSelectedProducts([]);
      setSearchTerm('');
      setResults([]);
      setNotes('');
      setShowNotesField(false);
      
      // Show success message based on result if available
      if (result && 'processed' in result) {
        toast.success(`Added ${result.processed} related products`);
      }
    } catch (err) {
      console.error('Error adding multiple products:', err);
      toast.error("Failed to add related products");
    } finally {
      setAddingProduct(false);
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextElement = document.getElementById(`product-result-${index + 1}`);
      if (nextElement) nextElement.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevElement = document.getElementById(`product-result-${index - 1}`);
      if (prevElement) prevElement.focus();
      else searchInputRef.current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Toggle selection
      const product = results[index];
      const isSelected = selectedProducts.some(p => p.id === product.id);
      handleSelectProduct(product, !isSelected);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setResults([]);
      searchInputRef.current?.focus();
    }
  };
  
  // Toggle notes field
  const toggleNotesField = () => {
    setShowNotesField(prev => !prev);
  };
  
  return (
    <div className="border border-input rounded-md p-4 mb-6 bg-card">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Add Related Products</h3>
        
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" className="max-w-sm">
                <p>Related products help customers discover alternatives, accessories, and complementary items.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Select 
            value={selectedRelationshipType} 
            onValueChange={(value: RelationshipType) => setSelectedRelationshipType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Relationship Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Relationship Type</SelectLabel>
                <SelectItem value="accessory">Accessory</SelectItem>
                <SelectItem value="variant">Variant</SelectItem>
                <SelectItem value="frequently_bought_together">Bought Together</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
                <SelectItem value="similar">Similar</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleNotesField}
            className={showNotesField ? 'bg-primary/10' : ''}
            title="Add notes"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showNotesField && (
        <div className="mb-4 mt-2">
          <Label htmlFor="notes" className="text-sm font-medium mb-1.5 block">
            Notes about this relationship
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this relationship to help explain it to customers..."
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Notes will appear on the product card and help explain the relationship to customers.
          </p>
        </div>
      )}
      
      <div className="flex space-x-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search products to add..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search for products to add as related"
          />
          {isLoading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        
        <Button
          onClick={handleAddSelectedProducts}
          disabled={selectedProducts.length === 0 || addingProduct}
          size="sm"
          className="whitespace-nowrap"
          aria-label="Add selected products"
        >
          {addingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Add Selected ({selectedProducts.length})
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      
      {results.length > 0 && (
        <div className="mb-4">
          <ScrollArea className="max-h-64 overflow-auto rounded-md border mt-1">
            <div className="p-1">
              {results.map((product, index) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                
                return (
                  <div
                    id={`product-result-${index}`}
                    key={product.id}
                    className={`
                      flex items-center p-2 rounded-sm text-sm
                      ${isSelected ? 'bg-primary/10' : 'hover:bg-accent'}
                      cursor-pointer
                    `}
                    tabIndex={0}
                    role="option"
                    aria-selected={isSelected}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onClick={() => handleSelectProduct(product, !isSelected)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectProduct(product, !!checked)}
                      className="mr-2"
                      id={`checkbox-${product.id}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <HoverCard openDelay={300}>
                      <HoverCardTrigger asChild>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-xs text-muted-foreground truncate">SKU: {product.sku}</div>
                          </div>
                          
                          <div className="ml-2 flex items-center space-x-2">
                            {product.category && (
                              <Badge variant="outline" className="whitespace-nowrap">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      
                      <HoverCardContent side="right" align="start" className="w-80">
                        <div className="flex space-x-4">
                          {product.primary_image_thumb && (
                            <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                              <img 
                                src={product.primary_image_thumb} 
                                alt={product.name} 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="text-sm font-semibold">{product.name}</h4>
                            <p className="text-sm">SKU: {product.sku}</p>
                            <p className="text-sm">Price: ${product.price}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {searchTerm.length > 1 && results.length === 0 && !isLoading && (
        <div className="text-center p-4 text-sm text-muted-foreground">
          No matching products found
        </div>
      )}
      
      {/* Algorithmic suggestions */}
      {suggestions.length > 0 && !searchTerm && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-medium">Suggested Products</h4>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            Based on this product, you might also want to add:
          </div>
          
          <ScrollArea className="max-h-48 overflow-auto rounded-md border">
            <div className="p-1">
              {suggestions.map((product) => (
                <div
                  key={`suggestion-${product.id}`}
                  className="flex justify-between items-center p-2 rounded-sm text-sm hover:bg-accent cursor-pointer"
                  onClick={() => handleAddSuggestion(product)}
                >
                  <HoverCard openDelay={300}>
                    <HoverCardTrigger asChild>
                      <div className="flex-1 min-w-0 cursor-pointer">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground truncate">SKU: {product.sku}</div>
                      </div>
                    </HoverCardTrigger>
                    
                    <HoverCardContent side="right" align="start" className="w-80">
                      <div className="flex space-x-4">
                        {product.primary_image_thumb && (
                          <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                            <img 
                              src={product.primary_image_thumb} 
                              alt={product.name} 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="text-sm font-semibold">{product.name}</h4>
                          <p className="text-sm">SKU: {product.sku}</p>
                          <p className="text-sm">Price: ${product.price}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSuggestion(product);
                    }}
                    disabled={addingProduct}
                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add suggested product</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {isSuggestionsLoading && !searchTerm && (
        <div className="mt-4 flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading suggestions...</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedAddRelatedProductPanel; 