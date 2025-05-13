import React, { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: number;
  onPricesUpdated?: () => Promise<void>;
  draftPrices?: ProductPrice[];
  setDraftPrices?: React.Dispatch<React.SetStateAction<ProductPrice[]>>;
}

// Use the Product type from the service
type Product = ProductFromService;

// Define NewPrice type based on the shape of defaultNewPrice
// This should match the structure used in PricingModal
interface NewPrice {
  price_type_id: number
  channel_id: number | null
  currency: string
  amount: string
  valid_from: string
  valid_to: string | null
}

export function PricingModal({ 
  isOpen, 
  onClose, 
  productId, 
  onPricesUpdated,
  draftPrices = [],
  setDraftPrices
}: PricingModalProps) {
  // Add React Query client
  const queryClient = useQueryClient();
  
  // Use the price metadata hook
  const { priceTypes, currencies, channels, loading: metaLoading, error: metaError } = usePriceMetadata();
  
  // Store product data
  const [product, setProduct] = useState<Product | null>(null);
  // Store prices
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  // Track local draft prices if not provided from parent
  const [localDraftPrices, setLocalDraftPrices] = useState<ProductPrice[]>([]);
  
  // Use either passed draftPrices or local state
  const actualDraftPrices = setDraftPrices ? draftPrices : localDraftPrices;
  const updateDraftPrices = setDraftPrices || setLocalDraftPrices;
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit price state
  const [editingPrice, setEditingPrice] = useState<ProductPrice | null>(null);
  // Track if we're editing a draft price
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'table' | 'add'>('table');
  
  // Memoize default price values based on price types
  const defaultNewPrice = useMemo(() => {
    const defaultType = priceTypes[0]?.id ?? 0;
    return {
      price_type_id: defaultType,
      channel_id: null,
      currency: 'USD',
      amount: '',
      valid_from: new Date().toISOString().slice(0,10),
      valid_to: null,
    };
  }, [priceTypes]);

  // Initialize state with the memoized default
  const [newPrice, setNewPrice] = useState(defaultNewPrice);

  // Effect to reset form state when modal opens or switching to edit mode
  useEffect(() => {
    // Only when the modal opens or you switch into "edit" mode do we reset:
    if (!isOpen) return;
    if (editingPrice) {
      const typeId = priceTypes.find(pt => pt.code === editingPrice.price_type)?.id ?? defaultNewPrice.price_type_id;
      setNewPrice({
        price_type_id: typeId,
        channel_id: editingPrice.channel_id ?? null,
        currency: editingPrice.currency,
        amount: editingPrice.amount.toString(),
        valid_from: editingPrice.valid_from?.slice(0,10) ?? defaultNewPrice.valid_from,
        valid_to: editingPrice.valid_to?.slice(0,10) ?? null,
      });
    } else {
      setNewPrice(defaultNewPrice);
    }
  }, [isOpen, editingPrice, defaultNewPrice, priceTypes]);
  
  // Always respond to open/close, but only fetch data when we have an ID
  useEffect(() => {
    if (!isOpen) return;
    
    // In edit mode only:
    if (productId) {
      fetchPrices();
      fetchProduct();
    }
  }, [isOpen, productId]);
  
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
  
  // Update the handlePriceInputChange function to properly handle text-based numeric input
  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for amount field
    if (name === 'amount') {
      // Only allow numbers and decimal point
      const numericValue = value.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const parts = numericValue.split('.');
      const sanitizedValue = parts.length > 1 
        ? `${parts[0]}.${parts.slice(1).join('')}`
        : numericValue;
        
      setNewPrice(prev => ({ ...prev, [name]: sanitizedValue }));
    } else {
      setNewPrice(prev => ({ ...prev, [name]: value }));
    }
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
    if ((!productId && !setDraftPrices) || !newPrice.amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    // Create mode - add draft price
    if (!productId) {
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      const priceTypeLabel = priceTypes.find(pt => pt.id === newPrice.price_type_id)?.label || priceTypeCode;
      const matchingChannel = channels.find(c => c.id === newPrice.channel_id);
      
      // Simplified channel object - only include the properties we know exist
      const channelObject = matchingChannel ? {
        id: matchingChannel.id,
        name: matchingChannel.name || '',
      } as any : null;
      
      // Create draft price object
      const draft: ProductPrice = {
        id: Date.now(), // temporary ID for draft
        price_type: priceTypeCode,
        price_type_display: priceTypeLabel,
        channel: channelObject,
        channel_id: newPrice.channel_id,
        currency: newPrice.currency,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to draft prices
      updateDraftPrices(prev => [...prev, draft]);
      toast.success('Draft price added');
      
      // Reset form
      setNewPrice(defaultNewPrice);
      
      // Switch back to table view
      setActiveTab('table');
      return;
    }
    
    // Edit mode - add real price
    setLoading(true);
    try {
      // Get the price type code from the ID
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      
      const validFromISO = new Date(newPrice.valid_from).toISOString();
      const validToISO = newPrice.valid_to ? new Date(newPrice.valid_to).toISOString() : null;

      const created = await productService.addPrice(productId, {
        price_type: priceTypeCode,
        currency: newPrice.currency,
        channel_id: newPrice.channel_id,
        amount: parseFloat(newPrice.amount),
        valid_from: validFromISO,
        valid_to: validToISO
      });
      
      if (created) setPrices(prev => [...prev, created]);
      
      toast.success('Price added successfully');
      
      // Refresh list from server in background
      fetchPrices();
      
      // Reset form
      setNewPrice(defaultNewPrice);
      
      // Switch back to table view to show the new row
      setActiveTab('table');
      
      // Call the onPricesUpdated callback
      if (onPricesUpdated) {
        await onPricesUpdated();
      }
    } catch (error) {
      toast.error('Failed to add price');
      console.error('Error adding price:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Update an existing price
  const handleUpdatePrice = async () => {
    if (!newPrice.amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    // Handling draft price update
    if (isEditingDraft && editingPrice) {
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      const priceTypeLabel = priceTypes.find(pt => pt.id === newPrice.price_type_id)?.label || priceTypeCode;
      const matchingChannel = channels.find(c => c.id === newPrice.channel_id);
      
      // Simplified channel object - only include the properties we know exist
      const channelObject = matchingChannel ? {
        id: matchingChannel.id,
        name: matchingChannel.name || '',
      } as any : null;
      
      // Create updated draft price
      const updatedDraft: ProductPrice = {
        ...editingPrice,
        price_type: priceTypeCode,
        price_type_display: priceTypeLabel,
        channel: channelObject,
        channel_id: newPrice.channel_id,
        currency: newPrice.currency,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to || null,
        updated_at: new Date().toISOString()
      };
      
      // Update draft prices
      updateDraftPrices(prevDrafts => 
        prevDrafts.map(draft => draft.id === editingPrice.id ? updatedDraft : draft)
      );
      
      toast.success('Draft price updated');
      setEditingPrice(null);
      setIsEditingDraft(false);
      setActiveTab('table');
      return;
    }
    
    // Handling real price update
    if (!productId || !editingPrice) {
      toast.error('Cannot update price');
      return;
    }
    
    setLoading(true);
    try {
      // Get the price type code from the ID
      const priceTypeCode = getPriceTypeCode(newPrice.price_type_id);
      
      const validFromISO = new Date(newPrice.valid_from).toISOString();
      const validToISO = newPrice.valid_to ? new Date(newPrice.valid_to).toISOString() : null;

      // Build diff payload – include only changed fields
      const payload: any = {};
      if (editingPrice.price_type !== priceTypeCode) payload.price_type = priceTypeCode;
      if (editingPrice.currency !== newPrice.currency) payload.currency = newPrice.currency;
      if ((editingPrice.channel_id || null) !== newPrice.channel_id) payload.channel_id = newPrice.channel_id;
      const newAmount = parseFloat(newPrice.amount);
      if (editingPrice.amount !== newAmount) payload.amount = newAmount;
      if (editingPrice.valid_from?.slice(0,10) !== newPrice.valid_from) payload.valid_from = validFromISO;
      if ((editingPrice.valid_to ? editingPrice.valid_to.slice(0,10) : null) !== newPrice.valid_to) payload.valid_to = validToISO;

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to update');
        setLoading(false);
        return;
      }

      await productService.patchPrice(productId, editingPrice.id, payload);
      
      toast.success('Price updated successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Exit edit mode
      setEditingPrice(null);
      setActiveTab('table');
      
      // Call the onPricesUpdated callback
      if (onPricesUpdated) {
        await onPricesUpdated();
      }
    } catch (error) {
      toast.error('Failed to update price');
      console.error('Error updating price:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Start editing a price
  const handleEditPrice = (price: ProductPrice, isDraft: boolean = false) => {
    setEditingPrice(price);
    setIsEditingDraft(isDraft);
    setActiveTab('add'); // Reuse the add tab for editing
  };
  
  // Delete a price
  const handleDeletePrice = async (priceId: number, isDraft: boolean = false) => {
    if (!confirm('Are you sure you want to delete this price?')) return;
    
    // Handle draft price deletion
    if (isDraft) {
      updateDraftPrices(prevDrafts => prevDrafts.filter(draft => draft.id !== priceId));
      toast.success('Draft price deleted');
      return;
    }
    
    // Handle real price deletion
    if (!productId) {
      toast.error('Cannot delete price');
      return;
    }
    
    setLoading(true);
    try {
      await productService.deletePrice(productId, priceId);
      toast.success('Price deleted successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Call the onPricesUpdated callback
      if (onPricesUpdated) {
        await onPricesUpdated();
      }
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
    setIsEditingDraft(false);
    setActiveTab('table');
  };
  
  // Show loading indicator if metadata is still loading
  if (metaLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px]">
          <div className="py-8 flex flex-col items-center justify-center">
            <p className="text-destructive mb-2">Error loading price data</p>
            <p className="text-muted-foreground text-sm">Please try again later</p>
            <Button variant="outline" onClick={() => onClose()} className="mt-4">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Component to display pricing details
  const PricingDetails = ({ prices }: { prices: ProductPrice[] }) => {
    const priceCount = prices.length;
    
    // Get base price if available
    const basePrice = prices.find(p => p.price_type === 'BASE');
    
    // Get list price if available
    const listPrice = prices.find(p => p.price_type === 'LIST');
    
    // Choose which price to display as primary
    const primaryPrice = basePrice || listPrice || (prices.length > 0 ? prices[0] : null);
    
    return (
      <div className="w-full grid gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            {productId ? 'Current Pricing' : 'Draft Pricing'}
          </div>
          
          {primaryPrice ? (
            <div className="text-2xl font-bold">
              {primaryPrice.currency} {typeof primaryPrice.amount === 'string' ? parseFloat(primaryPrice.amount).toFixed(2) : primaryPrice.amount.toFixed(2)}
              <span className="text-sm ml-2 font-normal text-muted-foreground">
                ({primaryPrice.price_type_display || primaryPrice.price_type})
              </span>
            </div>
          ) : (
            <div className="text-2xl font-bold">
              <span className="text-muted-foreground text-base">No price set</span>
            </div>
          )}
          
          {/* Add pricing summary information */}
          <div className="mt-2 flex items-center">
            {priceCount > 0 ? (
              <Badge variant="outline" className="mr-2">
                {priceCount} {priceCount === 1 ? 'price' : 'prices'} 
                {productId ? '' : ' planned'}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-800">
                {productId ? 'No prices defined' : 'No draft prices added'}
              </Badge>
            )}
          </div>
          
          {/* Always show price type summary, regardless of count */}
          {priceCount > 0 && (
            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-1">
              {prices.map((p, idx) => (
                <Badge variant="secondary" key={idx} className="text-xs">
                  {p.price_type_display || p.price_type}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="lg:max-w-screen-md">
        <DialogHeader>
          <DialogTitle>
            {productId && product ? (
              <>
                <span className="font-mono text-sm mr-1">{product.sku}</span> 
                <span>{product.name}</span>
              </>
            ) : (
              <>Manage Product Pricing</>
            )}
          </DialogTitle>
          <DialogDescription>
            {productId ? 'Manage pricing for this product' : 'Add draft prices to apply after product creation'}
          </DialogDescription>
        </DialogHeader>
        
        {productId ? (
          // ——— EDIT MODE ———
          isLoading ? (
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
                  <PricingDetails prices={prices} />
                </CardContent>
              </Card>
              {/* Tabs for price table and add new price */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'add')} defaultValue="table">
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
                                type="button"
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditPrice(price)}
                              >
                                Edit
                              </Button>
                              <Button 
                                type="button"
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
                  <AddPriceForm
                    newPrice={newPrice}
                    onChange={setNewPrice}
                    onAdd={handleAddPrice}
                    onUpdate={handleUpdatePrice}
                    editing={!!editingPrice}
                    loading={loading}
                    priceTypes={priceTypes}
                    channels={channels}
                    currencies={currencies}
                    onCancel={handleCancelEdit}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              Product not found or error loading product data.
            </div>
          )
        ) : (
          // ——— CREATE MODE ———
          <div className="space-y-4">
            {/* Display draft prices summary */}
            {actualDraftPrices.length > 0 && (
              <Card className="p-4">
                <CardHeader className="p-0 pb-2">
                  <h3 className="text-md font-medium">Draft Pricing</h3>
                </CardHeader>
                <CardContent className="p-0">
                  <PricingDetails prices={actualDraftPrices} />
                </CardContent>
              </Card>
            )}
            {/* Tabs for draft price table and add new price */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'table' | 'add')} defaultValue={actualDraftPrices.length > 0 ? 'table' : 'add'}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="table">Draft Prices</TabsTrigger>
                <TabsTrigger value="add">Add Price</TabsTrigger>
              </TabsList>
              <TabsContent value="table" className="mt-4">
                {actualDraftPrices.length > 0 ? (
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
                      {actualDraftPrices.map((price) => (
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
                              type="button"
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditPrice(price, true)}
                            >
                              Edit
                            </Button>
                            <Button 
                              type="button"
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeletePrice(price.id, true)}
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
                    No draft prices added yet. Add prices to apply when the product is created.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="add" className="mt-4">
                <AddPriceForm
                  newPrice={newPrice}
                  onChange={setNewPrice}
                  onAdd={handleAddPrice}
                  onUpdate={handleUpdatePrice}
                  editing={!!editingPrice}
                  loading={loading}
                  priceTypes={priceTypes}
                  channels={channels}
                  currencies={currencies}
                  onCancel={handleCancelEdit}
                />
              </TabsContent>
            </Tabs>
            {actualDraftPrices.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {actualDraftPrices.length} draft price{actualDraftPrices.length !== 1 ? 's' : ''} will be applied after product creation.
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onClose()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// AddPriceFormProps interface and AddPriceForm component
interface AddPriceFormProps {
  newPrice: NewPrice
  onChange: (np: NewPrice) => void
  onAdd: () => void
  onUpdate: () => void
  editing: boolean
  loading: boolean
  priceTypes: any[]
  channels: any[]
  currencies: any[]
  onCancel: () => void
}

export function AddPriceForm({
  newPrice,
  onChange,
  onAdd,
  onUpdate,
  editing,
  loading,
  priceTypes,
  channels,
  currencies,
  onCancel
}: AddPriceFormProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price_type">Price Type</Label>
          <Select 
            value={newPrice.price_type_id.toString()} 
            onValueChange={val => onChange({ ...newPrice, price_type_id: parseInt(val, 10) })}
          >
            <SelectTrigger id="price_type">
              <SelectValue placeholder="Select price type" />
            </SelectTrigger>
            <SelectContent>
              {priceTypes.map(pt => (
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
            value={newPrice.channel_id?.toString() ?? 'all'}
            onValueChange={val => onChange({ ...newPrice, channel_id: val === 'all' ? null : +val })}
          >
            <SelectTrigger id="channel">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map(ch => (
                <SelectItem key={ch.id} value={ch.id.toString()}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={newPrice.currency} 
            onValueChange={val => onChange({ ...newPrice, currency: val })}
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => (
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
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.]?[0-9]*"
            value={newPrice.amount}
            onChange={e => {
              const raw = e.target.value.replace(/[^0-9.]/g, '')
              const parts = raw.split('.')
              const sanitized = parts.length > 1
                ? `${parts[0]}.${parts.slice(1).join('')}`
                : raw
              onChange({ ...newPrice, amount: sanitized })
            }}
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
            onChange={e => onChange({ ...newPrice, valid_from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="valid_to">Valid To (Optional)</Label>
          <Input
            id="valid_to"
            name="valid_to"
            type="date"
            value={newPrice.valid_to || ''}
            onChange={e => onChange({ ...newPrice, valid_to: e.target.value })}
            placeholder="Never expires"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2">
        {editing ? (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={onUpdate} disabled={!newPrice.amount || loading}>
              Update Price
            </Button>
          </>
        ) : (
          <Button type="button" onClick={onAdd} disabled={!newPrice.amount || loading}>
            Add Price
          </Button>
        )}
      </div>
    </Card>
  )
} 