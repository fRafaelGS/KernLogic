import { useState, useEffect, useRef, useMemo } from 'react'
import { usePricingData, Price } from './usePricingData'
import { PricingForm } from './PricingForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit, Trash2, Plus, Filter, Search, Calculator } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { usePriceMetadata } from '@/hooks/usePriceMetadata'
import { productService, ProductPrice } from '@/services/productService'
import { useQueryClient } from '@tanstack/react-query'

interface PriceTabProps {
  productId: number;
  prices: ProductPrice[];
  isPricesLoading: boolean;
  onPricesUpdated: () => Promise<void>;
}

export function PriceTab({ productId, prices, isPricesLoading, onPricesUpdated }: PriceTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceToDelete, setPriceToDelete] = useState<number | null>(null);
  
  const {
    rawPrices,
    error,
    summary,
    filters,
    setFilters,
    refresh,
    formatPrice,
    getPriceTypeLabel,
    priceTypes,
    channels,
    currencies,
    add,
    update,
    remove
  } = usePricingData(productId);

  const { priceTypes: metaPriceTypes } = usePriceMetadata();

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus management for accessibility
  useEffect(() => {
    if (drawerOpen && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [drawerOpen])

  // Build a set of used currency codes (normalize to uppercase)
  const usedCurrencyCodes = useMemo(() => {
    return new Set(
      rawPrices
        .map(p =>
          (p.currency ?? p.currencyCode ?? '')
            .toString()
            .toUpperCase()
        )
        .filter(code => code)
    )
  }, [rawPrices])

  // Filter metadata currencies by used codes (normalize to uppercase)
  const filteredCurrencies = useMemo(() =>
    currencies.filter(c =>
      usedCurrencyCodes.has(c.code.toUpperCase())
    ),
    [currencies, usedCurrencyCodes]
  )

  const handleAddPrice = () => {
    setSelectedPrice(null)
    setDrawerOpen(true)
  }

  const handleEditPrice = (price: ProductPrice) => {
    // Use metaPriceTypes for code lookup
    const priceTypeObj = metaPriceTypes.find(pt => pt.code === price.price_type)
    const priceTypeId = priceTypeObj ? priceTypeObj.id.toString() : price.price_type
    
    setSelectedPrice({
      id: price.id,
      priceType: priceTypeId,
      channel: price.channel?.id?.toString(),
      currencyCode: price.currency,
      value: price.amount,
      validFrom: price.valid_from ? price.valid_from.slice(0, 10) : '',
      validTo: price.valid_to ? price.valid_to.slice(0, 10) : ''
    })
    setDrawerOpen(true)
  }

  const handleDeletePrice = async (id: number) => {
    try {
      await remove(id);
      toast({ title: 'Price deleted successfully' });
      
      // Invalidate and refetch product queries
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.refetchQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['prices', productId] });
      
      await onPricesUpdated();
    } catch (error) {
      toast({ 
        title: 'Failed to delete price',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setPriceToDelete(null);
    }
  };

  const confirmDelete = (id: number) => {
    setPriceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRows.map(id => remove(id)));
      toast({ title: `${selectedRows.length} prices deleted successfully` });
      setSelectedRows([]);
      
      // Invalidate and refetch product queries
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.refetchQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['prices', productId] });
      
      await onPricesUpdated();
    } catch (error) {
      toast({
        title: 'Failed to delete prices',
        variant: 'destructive'
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === prices.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(prices.map(p => p.id))
    }
  }

  const toggleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardContent className="py-10 text-center">
          <div className="text-destructive mb-2">Failed to load prices</div>
          <Button onClick={refresh}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-md">
                <div className="text-sm text-muted-foreground">Min Price</div>
                {isPricesLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {summary.min !== null ? formatPrice(summary.min, 'USD') : 'N/A'}
                  </div>
                )}
              </div>
              <div className="bg-muted p-4 rounded-md">
                <div className="text-sm text-muted-foreground">Avg Price</div>
                {isPricesLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {summary.avg !== null ? formatPrice(summary.avg, 'USD') : 'N/A'}
                  </div>
                )}
              </div>
              <div className="bg-muted p-4 rounded-md">
                <div className="text-sm text-muted-foreground">Max Price</div>
                {isPricesLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {summary.max !== null ? formatPrice(summary.max, 'USD') : 'N/A'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <p className="text-sm text-muted-foreground mb-2">Total Prices</p>
            <div className="text-3xl font-bold mb-4">{summary.total}</div>
            <Button onClick={handleAddPrice} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Price
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prices..."
                className="pl-9"
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 md:w-2/5">
              <Select
                value={filters.currency}
                onValueChange={value => setFilters({ ...filters, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {filteredCurrencies.map(c => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.code} ({c.symbol || c.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.channel}
                onValueChange={value => setFilters({ ...filters, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {channels.map(channel => (
                    <SelectItem 
                      key={channel.id || `channel-${Math.random()}`} 
                      value={channel.id.toString() || `channel-${Math.random()}`}
                    >
                      {channel.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Prices</span>
              {selectedRows.length > 0 && (
                <Badge variant="secondary">{selectedRows.length} selected</Badge>
              )}
            </div>
            {selectedRows.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedRows.length === prices.length && prices.length > 0} 
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Price Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPricesLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : prices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-muted-foreground mb-2">No prices found</p>
                        <Button variant="outline" size="sm" onClick={handleAddPrice}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first price
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  prices.map(price => (
                    <TableRow key={price.id} className="group">
                      <TableCell>
                        <Checkbox 
                          checked={selectedRows.includes(price.id)} 
                          onCheckedChange={() => toggleSelectRow(price.id)}
                          aria-label={`Select price ${price.id}`}
                        />
                      </TableCell>
                      <TableCell>{getPriceTypeLabel(price.price_type)}</TableCell>
                      <TableCell>
                        {price.channel?.name || 'All Channels'}
                      </TableCell>
                      <TableCell>{price.currency}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(price.amount, price.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPrice(price)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(price.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Price Drawer */}
      <Drawer 
        open={drawerOpen} 
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setSelectedPrice(null)
        }}
      >
        <DrawerContent className="max-w-md mx-auto">
          <DrawerHeader>
            <DrawerTitle>
              {selectedPrice ? 'Edit Price' : 'Add New Price'}
            </DrawerTitle>
            <DrawerDescription>
              {selectedPrice 
                ? 'Modify the details of this price.' 
                : 'Enter the details for the new price.'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-2">
            <PricingForm
              key={selectedPrice?.id ?? 'new-price'}
              productId={productId}
              initialData={selectedPrice || undefined}
              onAdd={add}
              onUpdate={update}
              onSuccess={() => {
                refresh()
                setDrawerOpen(false)
                setSelectedPrice(null)
              }}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => priceToDelete && handleDeletePrice(priceToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 