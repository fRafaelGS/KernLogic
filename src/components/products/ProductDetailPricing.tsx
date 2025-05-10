import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarIcon, Clock, DollarSign, InfoIcon, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger, 
} from '@/components/ui/tooltip';
import { Product, ProductPrice, productService } from '@/services/productService';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PriceSummaryBadge } from './PriceSummaryBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ProductDetailPricingProps {
  product: Product; 
  onSave?: (product: Product) => Promise<void>;
  readOnly?: boolean;
}

export function ProductDetailPricing({ product, onSave, readOnly = false }: ProductDetailPricingProps) {
  // State for price types and currencies (from backend)
  const [priceTypes, setPriceTypes] = useState<{ id: number; code: string; label: string }[]>([]);
  const [currencies, setCurrencies] = useState<{ iso_code: string; symbol: string; name: string; decimals: number }[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [prices, setPrices] = useState<ProductPrice[]>(product.prices || []);
  
  // State for managing UI
  const [expandedPriceId, setExpandedPriceId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [priceToDelete, setPriceToDelete] = useState<ProductPrice | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [defaultTaxRate, setDefaultTaxRate] = useState(8.5);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);
  
  // Format currency value
  const formatCurrency = (value: number, currencyCode: string = selectedCurrency): string => {
    const currency = currencies.find(c => c.iso_code === currencyCode);
    const decimals = currency?.decimals || 2;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };
  
  // Load price types, currencies, and prices
  useEffect(() => {
    const loadData = async () => {
      setLoadingPrices(true);
      try {
        // Load price types
        const types = await productService.getPriceTypes();
        setPriceTypes(types);
        
        // Load currencies
        const currencyList = await productService.getCurrencies();
        setCurrencies(currencyList);
        
        // Load prices if not already in product object
        if (!product.prices || product.prices.length === 0) {
          console.log('Fetching product prices from API:', product.id);
          const productPrices = await productService.getPrices(product.id);
          console.log('API returned prices:', productPrices);
          setPrices(productPrices);
        } else {
          console.log('Using prices from product object:', product.prices);
          setPrices(product.prices);
        }
      } catch (error) {
        console.error('Error loading pricing data:', error);
        toast.error('Failed to load pricing data');
      } finally {
        setLoadingPrices(false);
      }
    };
    
    loadData();
  }, [product.id, product.prices]);
  
  // Toggle expanded state of a price
  const toggleExpandPrice = (priceId: number) => {
    if (expandedPriceId === priceId) {
      setExpandedPriceId(null);
    } else {
      setExpandedPriceId(priceId);
    }
  };
  
  // Add a new price option
  const addNewPrice = async () => {
    if (readOnly || !product.id) return;
    
    try {
      // Create default new price object
      const newPrice = {
        price_type: priceTypes[0]?.code || 'BASE',
        currency: selectedCurrency,
        amount: 0,
        valid_from: new Date().toISOString(),
        valid_to: null,
        channel_id: null
      };
      
      const createdPrice = await productService.addPrice(product.id, newPrice);
      if (createdPrice) {
        setPrices(prev => [...prev, createdPrice]);
        setExpandedPriceId(createdPrice.id);
        toast.success('New price added');
      }
    } catch (error) {
      console.error('Error adding new price:', error);
      toast.error('Failed to add new price');
    }
  };
  
  // Update an existing price
  const updatePrice = async (priceId: number, updates: Partial<ProductPrice>) => {
    if (readOnly || !product.id) return;
    
    try {
      // Only send changed fields by diffing against current price state
      const current = prices.find(p => p.id === priceId);
      if (!current) return;

      const diff: Partial<ProductPrice> = {};
      Object.entries(updates).forEach(([k, v]) => {
        // @ts-ignore
        if (v !== (current as any)[k]) diff[k as keyof ProductPrice] = v as any;
      });
      if (Object.keys(diff).length === 0) return;

      const updatedPrice = await productService.patchPrice(product.id, priceId, diff);
      if (updatedPrice) {
        setPrices(prev => prev.map(p => p.id === priceId ? updatedPrice : p));
        toast.success('Price updated');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };
  
  // Initialize price delete
  const confirmDeletePrice = (price: ProductPrice) => {
    if (readOnly) return;
    
    setPriceToDelete(price);
    setIsDeleteDialogOpen(true);
  };
  
  // Delete a price
  const deletePrice = async () => {
    if (!priceToDelete || readOnly || !product.id) return;
    
    try {
      await productService.deletePrice(product.id, priceToDelete.id);
      setPrices(prev => prev.filter(p => p.id !== priceToDelete.id));
      setIsDeleteDialogOpen(false);
      toast.success(`Price deleted successfully`);
    } catch (error) {
      console.error('Error deleting price:', error);
      toast.error('Failed to delete price');
    }
  };
  
  // Get display name for a price type
  const getPriceTypeLabel = (typeCode: string): string => {
    const type = priceTypes.find(t => t.code === typeCode);
    return type?.label || typeCode;
  };
  
  // Calculate tax amount for display
  const calculateTax = (price: number): number => {
    return isTaxIncluded 
      ? price * (defaultTaxRate / (100 + defaultTaxRate))
      : price * (defaultTaxRate / 100);
  };
  
  if (loadingPrices) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>Loading pricing data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Main pricing card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Product Pricing</CardTitle>
              <CardDescription>
                Manage different price types for this product
                <div className="mt-2 flex flex-wrap gap-2">
                  <PriceSummaryBadge product={product} />
                </div>
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.iso_code} value={currency.iso_code}>
                      {currency.iso_code} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Price list */}
          {prices.length === 0 ? (
            <div className="mb-6">
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No prices defined</AlertTitle>
                <AlertDescription>
                  This product has no prices. Add a price to make it available for sale.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-2">
              {prices.map(price => (
                <div
                  key={price.id}
                  className="border rounded-md overflow-hidden"
                >
                  {/* Price header */}
                  <div
                    className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer"
                    onClick={() => toggleExpandPrice(price.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={price.price_type === 'BASE' ? 'default' : 'outline'}>
                        {price.price_type_display || getPriceTypeLabel(price.price_type)}
                      </Badge>
                      <span className="font-medium">{formatCurrency(price.amount, price.currency)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {price.valid_from && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Valid from: {new Date(price.valid_from).toLocaleDateString()}
                              {price.valid_to ? ` until ${new Date(price.valid_to).toLocaleDateString()}` : ''}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {!readOnly && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeletePrice(price);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded price details */}
                  {expandedPriceId === price.id && (
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label htmlFor={`price-type-${price.id}`}>Price Type</Label>
                          <Select 
                            value={price.price_type} 
                            onValueChange={(value) => updatePrice(price.id, { price_type: value })}
                            disabled={readOnly}
                          >
                            <SelectTrigger id={`price-type-${price.id}`}>
                              <SelectValue placeholder="Select price type" />
                            </SelectTrigger>
                            <SelectContent>
                              {priceTypes.map(type => (
                                <SelectItem key={type.code} value={type.code}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor={`price-amount-${price.id}`}>Amount</Label>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <Input
                              id={`price-amount-${price.id}`}
                              type="number"
                              step="0.01"
                              value={price.amount}
                              onChange={(e) => {
                                const amount = parseFloat(e.target.value) || 0;
                                updatePrice(price.id, { amount });
                              }}
                              readOnly={readOnly}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`price-valid-from-${price.id}`}>Valid From</Label>
                          <div className="flex items-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !price.valid_from && "text-muted-foreground"
                                  )}
                                  disabled={readOnly}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {price.valid_from ? (
                                    format(new Date(price.valid_from), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={price.valid_from ? new Date(price.valid_from) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updatePrice(price.id, { valid_from: date.toISOString() });
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor={`price-valid-to-${price.id}`}>Valid To</Label>
                          <div className="flex items-center">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !price.valid_to && "text-muted-foreground"
                                  )}
                                  disabled={readOnly}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {price.valid_to ? (
                                    format(new Date(price.valid_to), "PPP")
                                  ) : (
                                    <span>No end date</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={price.valid_to ? new Date(price.valid_to) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updatePrice(price.id, { valid_to: date.toISOString() });
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Add new price button */}
          {!readOnly && (
            <Button 
              type="button"
              variant="outline" 
              className="w-full mt-4" 
              onClick={addNewPrice}
              disabled={!product.id}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Price
            </Button>
          )}
        </CardContent>
      </Card>
      
      {/* Tax settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                <div className="text-sm text-muted-foreground">
                  Applied when calculating tax inclusive/exclusive prices
                </div>
              </div>
              <Input
                id="tax-rate"
                type="number"
                step="0.1"
                className="w-[120px]"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                disabled={readOnly}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tax-included">Prices Include Tax</Label>
                <div className="text-sm text-muted-foreground">
                  Whether the displayed prices include tax
                </div>
              </div>
              <Switch
                id="tax-included"
                checked={isTaxIncluded}
                onCheckedChange={setIsTaxIncluded}
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this price? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={deletePrice}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 