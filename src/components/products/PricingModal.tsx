import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { productService, ProductPrice, Product as ProductFromService } from '@/services/productService';
import { toast } from 'sonner';
import { usePriceMetadata } from '@/hooks/usePriceMetadata';
import { Loader2 } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  onPricesUpdated: () => void;
}

// Use the Product type from the service
type Product = ProductFromService;

export function PricingModal({ open, onOpenChange, productId, onPricesUpdated }: PricingModalProps) {
  // Use the price metadata hook
  const { priceTypes, currencies, channels, loading: metaLoading, error: metaError } = usePriceMetadata();
  
  // Store product data
  const [product, setProduct] = useState<Product | null>(null);
  // Store prices
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  // Loading states
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // New price form state
  const [newPrice, setNewPrice] = useState({
    price_type_id: 0, // Store the numeric ID
    channel_id: null as number | null,
    currency: 'USD',
    amount: '',
    valid_from: new Date().toISOString().slice(0, 10),
    valid_to: null as string | null,
  });
  
  // Edit price state
  const [editingPrice, setEditingPrice] = useState<ProductPrice | null>(null);
  
  // Active tab
  const [activeTab, setActiveTab] = useState('current');
  
  // Reset form when switching between add and edit modes
  useEffect(() => {
    if (!editingPrice) {
      // Default to first price type if available
      const defaultPriceTypeId = priceTypes.length > 0 ? priceTypes[0].id : 0;
      
      setNewPrice({
        price_type_id: defaultPriceTypeId, 
        channel_id: null,
        currency: 'USD',
        amount: '',
        valid_from: new Date().toISOString().slice(0, 10),
        valid_to: null,
      });
    } else {
      // When editing, we need to find the price_type_id from the price_type string
      const priceTypeId = priceTypes.find(pt => pt.code === editingPrice.price_type)?.id || 0;
      
      setNewPrice({
        price_type_id: priceTypeId,
        channel_id: editingPrice.channel_id || null,
        currency: editingPrice.currency,
        amount: editingPrice.amount.toString(),
        valid_from: editingPrice.valid_from,
        valid_to: editingPrice.valid_to,
      });
    }
  }, [editingPrice, priceTypes]);
  
  // Set default price type once priceTypes are loaded
  useEffect(() => {
    if (priceTypes.length > 0 && newPrice.price_type_id === 0) {
      // Default to first price type
      setNewPrice(prev => ({ ...prev, price_type_id: priceTypes[0].id }));
    }
  }, [priceTypes, newPrice.price_type_id]);
  
  // Fetch prices when the modal opens
  useEffect(() => {
    if (open && productId) {
      fetchPrices();
      fetchProduct();
    }
  }, [open, productId]);
  
  // Fetch product data
  const fetchProduct = async () => {
    if (!productId) return;
    
    setIsLoading(true);
    try {
      const productData = await productService.getProduct(productId);
      setProduct(productData);
    } catch (error) {
      toast.error('Failed to fetch product data');
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch prices from API
  const fetchPrices = async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const fetchedPrices = await productService.getPrices(productId);
      setPrices(fetchedPrices);
    } catch (error) {
      toast.error('Failed to fetch prices');
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle price form input changes
  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPrice(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle price type selection
  const handlePriceTypeChange = (value: string) => {
    setNewPrice(prev => ({ 
      ...prev, 
      price_type_id: parseInt(value, 10)
    }));
  };
  
  // Handle channel selection
  const handleChannelChange = (value: string) => {
    setNewPrice(prev => ({ 
      ...prev, 
      channel_id: value === 'all' ? null : parseInt(value) 
    }));
  };
  
  // Handle currency selection
  const handleCurrencyChange = (value: string) => {
    setNewPrice(prev => ({ ...prev, currency: value }));
  };
  
  // Get the code for a price type ID
  const getPriceTypeCode = (priceTypeId: number): string => {
    const priceType = priceTypes.find(pt => pt.id === priceTypeId);
    // Return the code from the database, or 'list' as a default if not found
    return priceType?.code || 'list';
  };
  
  // Add a new price
  const handleAddPrice = async () => {
    if (!productId || !newPrice.amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    setLoading(true);
    try {
      // Get the price type code from the ID
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      
      await productService.addPrice(productId, {
        price_type: priceTypeCode,
        currency: newPrice.currency,
        channel_id: newPrice.channel_id,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to,
        channel: null  // Required by the interface
      });
      
      toast.success('Price added successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Reset form
      const defaultPriceTypeId = priceTypes.length > 0 ? priceTypes[0].id : 0;
        
      setNewPrice({
        price_type_id: defaultPriceTypeId,
        channel_id: null,
        currency: 'USD',
        amount: '',
        valid_from: new Date().toISOString().slice(0, 10),
        valid_to: null,
      });
      
      // Call the onPricesUpdated callback
      onPricesUpdated();
    } catch (error) {
      toast.error('Failed to add price');
      console.error('Error adding price:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing price
  const handleUpdatePrice = async () => {
    if (!productId || !editingPrice || !newPrice.amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    setLoading(true);
    try {
      // Get the price type code from the ID
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      
      await productService.patchPrice(productId, editingPrice.id, {
        price_type: priceTypeCode,
        currency: newPrice.currency,
        channel_id: newPrice.channel_id,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to,
        channel: null  // Include channel to match the interface
      });
      
      toast.success('Price updated successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Exit edit mode
      setEditingPrice(null);
      setActiveTab('current');
      
      // Call the onPricesUpdated callback
      onPricesUpdated();
    } catch (error) {
      toast.error('Failed to update price');
      console.error('Error updating price:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Start editing a price
  const handleEditPrice = (price: ProductPrice) => {
    setEditingPrice(price);
    setActiveTab('add'); // Reuse the add tab for editing
  };
  
  // Delete a price
  const handleDeletePrice = async (priceId: number) => {
    if (!confirm('Are you sure you want to delete this price?')) return;
    
    setLoading(true);
    try {
      await productService.deletePrice(productId, priceId);
      toast.success('Price deleted successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Call the onPricesUpdated callback
      onPricesUpdated();
    } catch (error) {
      toast.error('Failed to delete price');
      console.error('Error deleting price:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return newPrice.price_type_id > 0 && newPrice.currency && newPrice.amount !== '';
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPrice(null);
    setActiveTab('current');
  };
  
  // Show loading indicator if metadata is still loading
  if (metaLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px]">
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading price metadata...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Show error if there was a problem loading metadata
  if (metaError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px]">
          <div className="py-8 flex flex-col items-center justify-center">
            <p className="text-destructive mb-2">Error loading price data</p>
            <p className="text-muted-foreground text-sm">Please try again later</p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Add this helper to display price source
  function PriceSource({ priceData }: { priceData: any }) {
    if (!priceData) return null;
    
    return priceData.price_type_code === 'legacy' ? (
      <div className="text-amber-500 text-xs mt-1 flex items-center">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Legacy price - migrate to the price table
      </div>
    ) : (
      <div className="text-emerald-600 text-xs mt-1">Base price from price table</div>
    );
  }

  // Update the component to use default_price
  const PricingDetails = ({ product }: { product: Product }) => {
    // Handle the case where default_price might not exist in the Product type
    const defaultPrice = (product as any).default_price || null;
    
    // Fallback to regular price if default_price is not present
    const price = defaultPrice ? 
      { amount: defaultPrice.amount, currency: defaultPrice.currency_iso } : 
      { amount: product.price, currency: 'USD' };
    
    return (
      <div className="w-full grid gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-medium">Current Base Price</div>
          <div className="text-2xl font-bold">
            {price && price.amount ? (
              <>
                {price.currency} {typeof price.amount === 'string' ? parseFloat(price.amount).toFixed(2) : price.amount.toFixed(2)}
              </>
            ) : (
              <span className="text-muted-foreground text-base">No price set</span>
            )}
          </div>
          {defaultPrice ? 
            <PriceSource priceData={defaultPrice} /> : 
            <div className="text-amber-500 text-xs mt-1 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Using regular price field
            </div>
          }
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:max-w-screen-md">
        <DialogHeader>
          <DialogTitle>
            {product ? (
              <>
                <span className="font-mono text-sm mr-1">{product.sku}</span> 
                <span>{product.name}</span>
              </>
            ) : (
              <>Loading Product Pricing...</>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage pricing for this product
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : product ? (
          <div className="space-y-4">
            {/* Display current pricing */}
            <Card className="p-4">
              <CardHeader className="p-0 pb-2">
                <h3 className="text-md font-medium">Current Pricing</h3>
              </CardHeader>
              <CardContent className="p-0">
                <PricingDetails product={product} />
              </CardContent>
            </Card>
            
            {/* Tabs for price table and add new price */}
            <Tabs defaultValue="table">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="table">Price Table</TabsTrigger>
                <TabsTrigger value="add">Add New Price</TabsTrigger>
              </TabsList>
              
              <TabsContent value="table" className="mt-4">
                {loading ? (
                  <div className="py-6 text-center text-muted-foreground">Loading prices...</div>
                ) : prices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Valid Period</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prices.map((price) => (
                        <TableRow key={price.id}>
                          <TableCell className="font-medium">{price.price_type_display}</TableCell>
                          <TableCell>{price.channel?.name || 'All Channels'}</TableCell>
                          <TableCell>
                            {formatCurrency(price.amount, price.currency)}
                          </TableCell>
                          <TableCell>
                            <span className="whitespace-nowrap">
                              {new Date(price.valid_from).toLocaleDateString()}
                              {price.valid_to && ` - ${new Date(price.valid_to).toLocaleDateString()}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditPrice(price)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeletePrice(price.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    No prices defined for this product yet.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="add" className="mt-4">
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price_type">Price Type</Label>
                      <Select 
                        value={newPrice.price_type_id.toString()} 
                        onValueChange={handlePriceTypeChange}
                      >
                        <SelectTrigger id="price_type">
                          <SelectValue placeholder="Select price type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(priceTypes) && priceTypes.map((pt) => (
                            <SelectItem key={pt.id} value={pt.id.toString()}>
                              {pt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="channel">Sales Channel (Optional)</Label>
                      <Select 
                        value={newPrice.channel_id?.toString() || 'all'} 
                        onValueChange={handleChannelChange}
                      >
                        <SelectTrigger id="channel">
                          <SelectValue placeholder="All Channels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Channels</SelectItem>
                          {Array.isArray(channels) && channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id.toString()}>
                              {channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={newPrice.currency} 
                        onValueChange={handleCurrencyChange}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(currencies) && currencies.map((c) => (
                            <SelectItem key={c.iso_code} value={c.iso_code}>
                              {c.iso_code} ({c.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPrice.amount}
                        onChange={handlePriceInputChange}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="valid_from">Valid From</Label>
                      <Input
                        id="valid_from"
                        name="valid_from"
                        type="date"
                        value={newPrice.valid_from}
                        onChange={handlePriceInputChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="valid_to">Valid To (Optional)</Label>
                      <Input
                        id="valid_to"
                        name="valid_to"
                        type="date"
                        value={newPrice.valid_to || ''}
                        onChange={handlePriceInputChange}
                        placeholder="Never expires"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-2">
                    {editingPrice ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdatePrice}
                          disabled={!isFormValid() || loading}
                        >
                          Update Price
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleAddPrice}
                        disabled={!isFormValid() || loading}
                      >
                        Add Price
                      </Button>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            Product not found or error loading product data.
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 