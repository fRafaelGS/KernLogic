import React, { useState, useRef, useEffect } from 'react';
import { Product, productService } from '@/services/productService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from 'lodash';

interface AddRelatedProductPanelProps {
  productId: number;
  relatedProducts: Product[];
  onProductAdded: (product: Product) => void;
}

export const AddRelatedProductPanel: React.FC<AddRelatedProductPanelProps> = ({
  productId,
  relatedProducts,
  onProductAdded
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Create a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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
        setError('Failed to search products. Please try again.');
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
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    // Focus the Add button for better accessibility
    document.getElementById('add-related-product-button')?.focus();
  };
  
  // Handle adding the selected product
  const handleAddProduct = async () => {
    if (!selectedProduct) return;
    
    try {
      // Optimistically update UI
      onProductAdded(selectedProduct);
      
      // Call API to add related product
      const success = await productService.toggleRelatedProduct(
        productId,
        selectedProduct.id!,
        true // isPinned = true
      );
      
      if (!success) {
        // If API call fails, let parent component handle the rollback
        toast.error("Couldn't add product—please try again.");
      } else {
        // Reset the form
        setSearchTerm('');
        setResults([]);
        setSelectedProduct(null);
        // Focus the search input again
        searchInputRef.current?.focus();
      }
    } catch (err) {
      console.error('Error adding related product:', err);
      toast.error("Couldn't add product—please try again.");
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
      handleSelectProduct(results[index]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setResults([]);
      searchInputRef.current?.focus();
    }
  };
  
  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  
  return (
    <div className="border border-input rounded-md p-4 mb-6 bg-card">
      <h3 className="text-sm font-medium mb-3">Add Related Product</h3>
      
      <div className="flex space-x-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search products..."
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
          id="add-related-product-button"
          onClick={handleAddProduct}
          disabled={!selectedProduct}
          size="sm"
          aria-label="Add selected product to related products"
        >
          Add
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      
      {results.length > 0 && (
        <ScrollArea className="max-h-64 overflow-auto rounded-md border mt-1">
          <div className="p-1">
            {results.map((product, index) => (
              <div
                id={`product-result-${index}`}
                key={product.id}
                className={`
                  flex justify-between items-center p-2 rounded-sm text-sm
                  ${selectedProduct?.id === product.id ? 'bg-primary/10' : 'hover:bg-accent'}
                  ${selectedProduct?.id === product.id ? 'border-primary' : ''}
                  cursor-pointer
                `}
                onClick={() => handleSelectProduct(product)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={0}
                role="option"
                aria-selected={selectedProduct?.id === product.id}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-xs text-muted-foreground truncate">SKU: {product.sku}</div>
                </div>
                {product.category && (
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {product.category}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {searchTerm.length > 1 && results.length === 0 && !isLoading && (
        <div className="text-center p-4 text-sm text-muted-foreground">
          No matching products found
        </div>
      )}
    </div>
  );
};

export default AddRelatedProductPanel; 