import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { productService, ProductPrice } from '@/services/productService';
import { toast } from 'sonner';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  onPricesUpdated: () => void;
}

// Define available price types
const PRICE_TYPES = [
  { value: 'list', label: 'List Price' },
  { value: 'cost', label: 'Cost Price' },
  { value: 'msrp', label: 'MSRP' },
  { value: 'promo', label: 'Promotional Price' },
];

// Define available currencies
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD (C$)' },
];

export function PricingModal({ open, onOpenChange, productId, onPricesUpdated }: PricingModalProps) {
  // Store prices
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  // Store available sales channels
  const [channels, setChannels] = useState<{ id: number; name: string }[]>([]);
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // New price form state
  const [newPrice, setNewPrice] = useState({
    price_type: 'list',
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
  
  // Fetch prices when the modal opens
  useEffect(() => {
    if (open && productId) {
      fetchPrices();
      // Fetch sales channels (optional - if your API supports this)
      // fetchSalesChannels();
    }
  }, [open, productId]);
  
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
    setNewPrice(prev => ({ ...prev, price_type: value }));
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
  
  // Add a new price
  const handleAddPrice = async () => {
    if (!productId || !newPrice.amount) {
      toast.error('Please enter an amount');
      return;
    }
    
    setLoading(true);
    try {
      // Convert amount to number
      const priceData = {
        ...newPrice,
        amount: parseFloat(newPrice.amount),
      };
      
      await productService.addPrice(productId, priceData as any); // Use 'any' to bypass type checking for now
      toast.success('Price added successfully');
      
      // Refresh prices
      fetchPrices();
      
      // Reset form
      setNewPrice({
        price_type: 'list',
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
    return newPrice.price_type && newPrice.currency && newPrice.amount !== '';
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Manage Product Prices</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Prices</TabsTrigger>
            <TabsTrigger value="add">Add New Price</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
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
                      <TableCell className="text-right">
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
                    value={newPrice.price_type} 
                    onValueChange={handlePriceTypeChange}
                  >
                    <SelectTrigger id="price_type">
                      <SelectValue placeholder="Select price type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
                      {channels.map((channel) => (
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
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
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
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleAddPrice}
                  disabled={!isFormValid() || loading}
                >
                  Add Price
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 