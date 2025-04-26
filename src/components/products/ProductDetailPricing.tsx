import React, { useState } from 'react';
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
import { CalendarIcon, Clock, DollarSign, InfoIcon, PlusCircle, Trash2 } from 'lucide-react';
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
import { Product } from '@/services/productService';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PriceOption {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  margin?: number;
  profit?: number;
  isDefault: boolean;
  taxable: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

interface ProductDetailPricingProps {
  product: Product; 
  onSave?: (product: Product) => Promise<void>;
  readOnly?: boolean;
}

export function ProductDetailPricing({ product, onSave, readOnly = false }: ProductDetailPricingProps) {
  const [priceOptions, setPriceOptions] = useState<PriceOption[]>([
    {
      id: '1',
      name: 'Default',
      price: product.price || 0,
      compareAtPrice: product.compareAtPrice,
      cost: product.cost || 0,
      isDefault: true,
      taxable: true
    },
    {
      id: '2',
      name: 'Wholesale',
      price: (product.price || 0) * 0.7,
      cost: product.cost || 0,
      isDefault: false,
      taxable: true
    }
  ]);
  
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<PriceOption | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [defaultTaxRate, setDefaultTaxRate] = useState(8.5);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);
  
  // Calculate profit and margin for a price option
  const calculateProfitMetrics = (option: PriceOption): { profit: number, margin: number } => {
    const price = option.price || 0;
    const cost = option.cost || 0;
    
    const profit = price - cost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    
    return { profit, margin };
  };
  
  // Format currency value
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Toggle expanded state of a price option
  const toggleExpandOption = (optionId: string) => {
    if (expandedOptionId === optionId) {
      setExpandedOptionId(null);
    } else {
      setExpandedOptionId(optionId);
    }
  };
  
  // Add a new price option
  const addPriceOption = () => {
    if (readOnly) return;
    
    const newOption: PriceOption = {
      id: `option-${Date.now()}`,
      name: `Option ${priceOptions.length + 1}`,
      price: 0,
      cost: 0,
      isDefault: false,
      taxable: true
    };
    
    setPriceOptions([...priceOptions, newOption]);
    setExpandedOptionId(newOption.id);
    
    toast.success('New price option added');
  };
  
  // Update a price option
  const updatePriceOption = (optionId: string, updates: Partial<PriceOption>) => {
    if (readOnly) return;
    
    let updatedOptions = priceOptions.map(option => {
      if (option.id === optionId) {
        const updatedOption = { ...option, ...updates };
        
        // Calculate profit and margin if price or cost changed
        if ('price' in updates || 'cost' in updates) {
          const metrics = calculateProfitMetrics(updatedOption);
          updatedOption.profit = metrics.profit;
          updatedOption.margin = metrics.margin;
        }
        
        // If this option is being set as default, make sure no other option is default
        if (updates.isDefault) {
          priceOptions.forEach(opt => {
            if (opt.id !== optionId && opt.isDefault) {
              opt.isDefault = false;
            }
          });
        }
        
        return updatedOption;
      }
      return option;
    });
    
    // For the case when we're updating isDefault, we need to ensure only one is default
    if (updates.isDefault) {
      updatedOptions = updatedOptions.map(option => 
        option.id === optionId 
          ? { ...option, isDefault: true } 
          : { ...option, isDefault: false }
      );
    }
    
    setPriceOptions(updatedOptions);
    
    // If this is the default option, update the product price
    const defaultOption = updatedOptions.find(opt => opt.isDefault);
    if (defaultOption) {
      const updatedProduct = {
        ...product,
        price: defaultOption.price,
        compareAtPrice: defaultOption.compareAtPrice,
        cost: defaultOption.cost
      };
      
      if (onSave) {
        onSave(updatedProduct).catch(() => {
          toast.error('Failed to save price changes');
        });
      }
    }
  };
  
  // Initialize price option delete
  const confirmDeleteOption = (option: PriceOption) => {
    if (readOnly) return;
    
    if (option.isDefault) {
      toast.error('Cannot delete the default price option');
      return;
    }
    
    setOptionToDelete(option);
    setIsDeleteDialogOpen(true);
  };
  
  // Delete a price option
  const deletePriceOption = () => {
    if (!optionToDelete || readOnly) return;
    
    const updatedOptions = priceOptions.filter(option => option.id !== optionToDelete.id);
    setPriceOptions(updatedOptions);
    setIsDeleteDialogOpen(false);
    
    toast.success(`"${optionToDelete.name}" price option deleted`);
  };
  
  // Default price option
  const defaultOption = priceOptions.find(option => option.isDefault) || priceOptions[0];
  
  // Calculate tax amount for display
  const calculateTax = (price: number): number => {
    return isTaxIncluded 
      ? price * (defaultTaxRate / (100 + defaultTaxRate))
      : price * (defaultTaxRate / 100);
  };
  
  return (
    <div className="space-y-6">
      {/* Main pricing card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Main price</CardTitle>
              <CardDescription>Default product pricing information</CardDescription>
            </div>
            <div className="flex items-center">
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main price fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultOption?.price || 0}
                    onChange={(e) => updatePriceOption(defaultOption.id, { price: parseFloat(e.target.value) })}
                    className="pl-9"
                    disabled={readOnly}
                  />
                </div>
                {defaultOption && defaultOption.compareAtPrice && defaultOption.compareAtPrice > defaultOption.price && (
                  <p className="text-sm text-green-600 mt-1">
                    Discount: {((1 - defaultOption.price / defaultOption.compareAtPrice) * 100).toFixed(0)}% off
                  </p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="compareAtPrice">Compare-at price</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Original or MSRP price to show as a comparison. Usually displayed as a strikethrough.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultOption?.compareAtPrice || ''}
                    onChange={(e) => updatePriceOption(
                      defaultOption.id, 
                      { compareAtPrice: e.target.value ? parseFloat(e.target.value) : undefined }
                    )}
                    className="pl-9"
                    placeholder="No compare price"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </div>
            
            {/* Cost and profit area */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Cost & Margin</Label>
                {defaultOption && (
                  <Badge variant="outline" className="font-normal">
                    Margin: {defaultOption.margin ? defaultOption.margin.toFixed(1) : '0'}%
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cost">Cost per item</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={defaultOption?.cost || ''}
                      onChange={(e) => updatePriceOption(
                        defaultOption.id, 
                        { cost: e.target.value ? parseFloat(e.target.value) : undefined }
                      )}
                      className="pl-9"
                      placeholder="Enter cost"
                      disabled={readOnly}
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label>Profit</Label>
                  <Input
                    value={formatCurrency((defaultOption?.profit || 0))}
                    className="bg-slate-50"
                    readOnly
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label>Margin</Label>
                  <Input
                    value={`${(defaultOption?.margin || 0).toFixed(1)}%`}
                    className="bg-slate-50"
                    readOnly
                  />
                </div>
              </div>
            </div>
            
            {/* Tax settings */}
            <div className="pt-2">
              <Separator className="mb-4" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium">Tax settings</h3>
                    <p className="text-sm text-slate-500">Configure how taxes apply to this product</p>
                  </div>
                  <Switch
                    checked={defaultOption?.taxable}
                    onCheckedChange={(checked) => {
                      updatePriceOption(defaultOption.id, { taxable: checked });
                    }}
                    disabled={readOnly}
                  />
                </div>
                
                {defaultOption?.taxable && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="taxRate">Default tax rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value))}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Label htmlFor="taxCalculation">Tax calculation</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-4 w-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="max-w-xs">
                                <strong>Tax included:</strong> The entered price includes tax.<br />
                                <strong>Tax excluded:</strong> Tax will be added to the entered price.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select 
                        value={isTaxIncluded ? 'included' : 'excluded'} 
                        onValueChange={(value) => setIsTaxIncluded(value === 'included')}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax calculation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excluded">Tax excluded from price</SelectItem>
                          <SelectItem value="included">Tax included in price</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {defaultOption && (
                      <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-md">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Net Price</p>
                          <p className="font-medium">
                            {isTaxIncluded 
                              ? formatCurrency(defaultOption.price - calculateTax(defaultOption.price))
                              : formatCurrency(defaultOption.price)
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Final Price (with tax)</p>
                          <p className="font-medium">
                            {isTaxIncluded
                              ? formatCurrency(defaultOption.price)
                              : formatCurrency(defaultOption.price + calculateTax(defaultOption.price))
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Additional price options */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Additional price options</CardTitle>
              <CardDescription>Define different pricing for various sales channels or customers</CardDescription>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addPriceOption}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Add price option
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {priceOptions.length <= 1 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <DollarSign className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium mb-1">No additional price options</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
                Create price options for different channels like wholesale, retail, or special promotions.
              </p>
              {!readOnly && (
                <Button variant="outline" onClick={addPriceOption}>
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add your first price option
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {priceOptions.filter(option => !option.isDefault).map((option) => (
                <Card key={option.id} className={cn(
                  "border",
                  expandedOptionId === option.id ? "border-primary-500" : "border-slate-200"
                )}>
                  <CardContent className="p-0">
                    <div className="p-4 cursor-pointer" onClick={() => toggleExpandOption(option.id)}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.name}</span>
                          {option.startDate && option.endDate && (
                            <Badge variant="outline" className="font-normal text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Limited time
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(option.price)}</span>
                          {!readOnly && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteOption(option);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {expandedOptionId === option.id && (
                      <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor={`name-${option.id}`}>Name</Label>
                              <Input
                                id={`name-${option.id}`}
                                value={option.name}
                                onChange={(e) => updatePriceOption(option.id, { name: e.target.value })}
                                disabled={readOnly}
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <Label htmlFor={`price-${option.id}`}>Price</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                  id={`price-${option.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={option.price}
                                  onChange={(e) => updatePriceOption(option.id, { price: parseFloat(e.target.value) })}
                                  className="pl-9"
                                  disabled={readOnly}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor={`compareAtPrice-${option.id}`}>Compare-at price</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                  id={`compareAtPrice-${option.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={option.compareAtPrice || ''}
                                  onChange={(e) => updatePriceOption(
                                    option.id, 
                                    { compareAtPrice: e.target.value ? parseFloat(e.target.value) : undefined }
                                  )}
                                  className="pl-9"
                                  placeholder="No compare price"
                                  disabled={readOnly}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-1.5">
                              <Label htmlFor={`cost-${option.id}`}>Cost per item</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                  id={`cost-${option.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={option.cost || ''}
                                  onChange={(e) => updatePriceOption(
                                    option.id, 
                                    { cost: e.target.value ? parseFloat(e.target.value) : undefined }
                                  )}
                                  className="pl-9"
                                  placeholder="Enter cost"
                                  disabled={readOnly}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Schedule */}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <Label>Price schedule</Label>
                              {(option.startDate || option.endDate) && !readOnly && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 text-slate-500"
                                  onClick={() => updatePriceOption(option.id, { startDate: null, endDate: null })}
                                >
                                  Clear dates
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor={`start-date-${option.id}`}>Start date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !option.startDate && "text-slate-500"
                                      )}
                                      disabled={readOnly}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {option.startDate ? format(option.startDate, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={option.startDate || undefined}
                                      onSelect={(date) => updatePriceOption(option.id, { startDate: date })}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              
                              <div className="space-y-1.5">
                                <Label htmlFor={`end-date-${option.id}`}>End date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !option.endDate && "text-slate-500"
                                      )}
                                      disabled={readOnly}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {option.endDate ? format(option.endDate, "PPP") : "Select date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={option.endDate || undefined}
                                      onSelect={(date) => updatePriceOption(option.id, { endDate: date })}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          
                          {/* Options */}
                          <div className="pt-2">
                            <div className="flex flex-col space-y-2">
                              {!readOnly && (
                                <div className="flex items-center space-x-2">
                                  <Switch 
                                    id={`default-${option.id}`}
                                    checked={option.isDefault}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        updatePriceOption(option.id, { isDefault: true });
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`default-${option.id}`}>Make this the default price</Label>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2">
                                <Switch 
                                  id={`taxable-${option.id}`}
                                  checked={option.taxable}
                                  onCheckedChange={(checked) => {
                                    updatePriceOption(option.id, { taxable: checked });
                                  }}
                                  disabled={readOnly}
                                />
                                <Label htmlFor={`taxable-${option.id}`}>Taxable</Label>
                              </div>
                            </div>
                          </div>
                          
                          {/* Summary */}
                          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                            <div>
                              <span className="text-sm text-slate-500">Profit:</span>{' '}
                              <span className="font-medium">{formatCurrency(option.profit || 0)}</span>
                            </div>
                            <div>
                              <span className="text-sm text-slate-500">Margin:</span>{' '}
                              <span className="font-medium">{(option.margin || 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete price option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{optionToDelete?.name}" price option?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deletePriceOption}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 