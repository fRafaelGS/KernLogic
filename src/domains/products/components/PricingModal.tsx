import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/domains/core/components/ui/dialog';
import { Button } from '@/domains/core/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/domains/core/components/ui/table';
import { Card, CardHeader, CardContent } from '@/domains/core/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/domains/core/components/ui/tabs';
import { Input } from '@/domains/core/components/ui/input';
import { Label } from '@/domains/core/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { productService, ProductPrice, Product as ProductFromService } from '@/services/productService';
import { toast } from 'sonner';
import { usePriceMetadata } from '@/hooks/usePriceMetadata';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { Loader2, PencilIcon, TrashIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/domains/core/components/ui/badge';
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
  const { defaultChannelId } = useOrgSettings();
  
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
      currency: 'USD',
      amount: '',
      valid_from: new Date().toISOString().slice(0,10),
      valid_to: null,
    };
  }, [priceTypes]);

  // Initialize state with the memoized default
  const [newPrice, setNewPrice] = useState<NewPrice>(defaultNewPrice);

  // Effect to reset form state when modal opens or switching to edit mode
  useEffect(() => {
    // Only when the modal opens or you switch into "edit" mode do we reset:
    if (!isOpen) return;
    if (editingPrice) {
      const typeId = priceTypes.find(pt => pt.code === editingPrice.price_type)?.id ?? defaultNewPrice.price_type_id;
      setNewPrice({
        price_type_id: typeId,
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
      
      // Create draft price object
      const draft: ProductPrice = {
        id: Date.now(), // temporary ID for draft
        price_type: priceTypeCode,
        price_type_display: priceTypeLabel,
        channel: null,
        channel_id: defaultChannelId as number | undefined,
        currency: newPrice.currency,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to,
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
        channel_id: defaultChannelId as number | undefined,
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
      
      // Create updated draft price
      const updatedDraft: ProductPrice = {
        ...editingPrice,
        price_type: priceTypeCode,
        price_type_display: priceTypeLabel,
        currency: newPrice.currency,
        amount: parseFloat(newPrice.amount),
        valid_from: newPrice.valid_from,
        valid_to: newPrice.valid_to,
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

  // Component to display pricing details
  const PricingDetails = ({ prices }: { prices: ProductPrice[] }) => {
    // Sort prices by creation date, newest first
    const sortedPrices = useMemo(() => {
      return [...prices].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }, [prices]);

    if (prices.length === 0) {
      return (
        <div className="py-8 flex flex-col items-center justify-center">
          <p className="text-muted-foreground">No prices have been added yet.</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPrices.map(price => (
              <TableRow key={price.id}>
                <TableCell className="font-medium">{price.price_type_display}</TableCell>
                <TableCell>
                  {formatCurrency(price.amount, price.currency)}
                </TableCell>
                <TableCell>
                  {price.valid_from ? (
                    <span>
                      {new Date(price.valid_from).toLocaleDateString()} 
                      {price.valid_to && ` - ${new Date(price.valid_to).toLocaleDateString()}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditPrice(price)}
                      title="Edit price"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeletePrice(price.id)}
                      title="Delete price"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {productId ? 'Manage Prices' : 'Add Draft Prices'}
            {product && <span className="ml-1 font-normal text-muted-foreground">for {product.name}</span>}
          </DialogTitle>
          <DialogDescription>
            Add or edit pricing information for this product.
          </DialogDescription>
        </DialogHeader>
        
        {/* Show loading state if we're still fetching data */}
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading product data...</p>
          </div>
        ) : metaLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-muted-foreground">Loading pricing metadata...</p>
          </div>
        ) : (
          <>
            <Tabs defaultValue="table" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="table">Price List</TabsTrigger>
                <TabsTrigger value="add">{editingPrice ? 'Edit Price' : 'Add Price'}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="table" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    {prices.length} {prices.length === 1 ? 'Price' : 'Prices'}
                  </h3>
                  <Button 
                    onClick={() => setActiveTab('add')} 
                    disabled={loading}
                  >
                    Add New Price
                  </Button>
                </div>
                
                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-muted-foreground">Loading prices...</p>
                  </div>
                ) : (
                  <PricingDetails prices={productId ? prices : actualDraftPrices} />
                )}
              </TabsContent>
              
              <TabsContent value="add">
                {/* Form for adding or editing prices */}
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
                
                {/* Show a note about channels using organization default */}
                <div className="mt-4 p-4 border rounded-md bg-blue-50">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-700">
                      Prices are now automatically assigned to your organization's default sales channel.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  currencies,
  onCancel
}: AddPriceFormProps) {

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...newPrice, [name]: value });
  };

  // Handle price type selection
  const handlePriceTypeChange = (value: string) => {
    onChange({ ...newPrice, price_type_id: parseInt(value, 10) });
  };
  
  // Handle currency selection
  const handleCurrencyChange = (value: string) => {
    onChange({ ...newPrice, currency: value });
  };

  return (
    <div className="space-y-4 p-2">
      {/* Price Type */}
      <div className="space-y-2">
        <Label htmlFor="priceType">Price Type *</Label>
        <Select 
          value={newPrice.price_type_id.toString()}
          onValueChange={handlePriceTypeChange}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a price type" />
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

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">Currency *</Label>
        <Select 
          value={newPrice.currency}
          onValueChange={handleCurrencyChange}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a currency" />
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

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Price Amount *</Label>
        <Input 
          id="amount"
          name="amount"
          value={newPrice.amount}
          onChange={handleChange}
          placeholder="0.00"
          disabled={loading}
        />
      </div>

      {/* Valid From */}
      <div className="space-y-2">
        <Label htmlFor="valid_from">Valid From *</Label>
        <Input 
          id="valid_from"
          name="valid_from"
          type="date" 
          value={newPrice.valid_from}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* Valid To */}
      <div className="space-y-2">
        <Label htmlFor="valid_to">Valid To (optional)</Label>
        <Input 
          id="valid_to"
          name="valid_to"
          type="date" 
          value={newPrice.valid_to || ''}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={editing ? onUpdate : onAdd} 
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editing ? "Update Price" : "Add Price"}
        </Button>
      </div>
    </div>
  );
} 