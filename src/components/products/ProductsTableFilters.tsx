import React from 'react'
import { TableHead, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { TagIcon } from 'lucide-react'
import { config } from '@/config/config'
import { type Table } from '@tanstack/react-table'
import { type Product } from '@/services/productService'

interface ProductsTableFiltersProps {
  columns: any[]
  filters: Record<string, any>
  onFilterChange: (columnId: string, value: any) => void
  onClearFilters: () => void
  table: Table<Product>
  uniqueCategories: { label: string, value: string | number }[]
  uniqueTags: string[]
  uniqueBrands: string[]
  families: any[]
  isFamiliesLoading: boolean
}

/**
 * A component that renders filter controls for the products table
 */
export function ProductsTableFilters({
  columns,
  filters,
  onFilterChange,
  onClearFilters,
  table,
  uniqueCategories,
  uniqueTags,
  uniqueBrands,
  families,
  isFamiliesLoading
}: ProductsTableFiltersProps) {
  const tableConfig = config.productsTable
  
  // Add state for tag search
  const [tagSearch, setTagSearch] = React.useState('')

  // Safely get the value for the category filter
  const getCategoryFilterValue = () => {
    const categoryValue = filters.category ?? 'all'
    
    // Make sure we return a string value
    if (categoryValue === null || categoryValue === undefined) {
      return 'all'
    }
    
    return String(categoryValue)
  }

  // Function to safely handle category filter changes
  const handleCategoryFilterChange = (value: string) => {
    try {
      // Convert undefined and null values to 'all'
      const normalizedValue = value === undefined || value === null ? 'all' : value
      onFilterChange('category', normalizedValue === 'all' ? undefined : normalizedValue)
      // Also update the TanStack table's internal filter
      const categoryColumn = table.getColumn('category')
      if (categoryColumn) {
        if (normalizedValue === 'all') {
          categoryColumn.setFilterValue(undefined)
        } else if (normalizedValue === 'uncategorized') {
          categoryColumn.setFilterValue('')
        } else {
          categoryColumn.setFilterValue(normalizedValue)
        }
      }
    } catch (error) {
      console.error('Error setting category filter:', error)
      onFilterChange('category', undefined)
    }
  }

  // Function to safely handle status filter changes
  const handleStatusFilterChange = (value: string) => {
    try {
      // Convert undefined and null values to 'all'
      const normalizedValue = value === undefined || value === null ? 'all' : value
      
      // Only pass the value to API when it's not 'all'
      onFilterChange('is_active', normalizedValue === 'all' ? undefined : normalizedValue)
    } catch (error) {
      console.error('Error setting status filter:', error)
      // In case of error, reset to 'all'
      onFilterChange('is_active', undefined)
    }
  }

  return (
    <>
      {/* Single row of filters */}
      <TableRow className="sticky top-9 z-20 bg-slate-50 h-6 border-b border-slate-200">
        {/* Reset filters button in first column (select checkbox column) */}
        <TableHead key="filter-select" className="px-1 py-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-6 px-3 rounded-full border-slate-300 bg-white/90 text-slate-600 
                      hover:bg-slate-100 hover:border-slate-400 shadow-sm transition-colors"
          >
            Reset Filters
          </Button>
        </TableHead>
        
        {/* Expander column - empty cell */}
        <TableHead key="filter-expander" className="px-1 py-1 w-9" />
        
        {/* Thumbnail column - empty cell */}
        <TableHead key="filter-thumbnail" className="px-1 py-1" />
        
        {/* SKU filter */}
        <TableHead key="filter-sku" className="px-2 py-2">
          <Input
            placeholder="Filter SKU…"
            value={filters.sku ?? ''}
            onChange={(e) => onFilterChange('sku', e.target.value)}
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </TableHead>

        {/* Name filter */}
        <TableHead key="filter-name" className="px-2 py-2">
          <Input
            placeholder="Filter name…"
            value={filters.name ?? ''}
            onChange={(e) => onFilterChange('name', e.target.value)}
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </TableHead>

        {/* Family filter */}
        <TableHead key="filter-family" className="px-2 py-2">
          <Select
            value={filters.family === undefined ? 'all' : String(filters.family)}
            onValueChange={value => onFilterChange('family', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className='h-7 text-xs'>
              <SelectValue placeholder='All Families' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Families</SelectItem>
              {isFamiliesLoading && <SelectItem value='loading' disabled>Loading...</SelectItem>}
              {!isFamiliesLoading && families.length === 0 && (
                <SelectItem value='none' disabled>No families available</SelectItem>
              )}
              {!isFamiliesLoading && families.map((family: any) => (
                <SelectItem key={family.id} value={String(family.id)}>
                  {family.label || family.code || `Family ${family.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableHead>

        {/* Category filter - Updated to handle nested categories */}
        <TableHead key="filter-category" className="px-2 py-2">
          <Select
            value={filters.category ? String(filters.category) : 'all'}
            onValueChange={v => handleCategoryFilterChange(String(v))}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={tableConfig.display.selectors.category.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tableConfig.display.selectors.category.allCategories}</SelectItem>
              <SelectItem value="uncategorized">{tableConfig.display.selectors.category.uncategorized}</SelectItem>
              {Array.isArray(uniqueCategories) && uniqueCategories.length > 0 ? (
                uniqueCategories.map((cat, index) => (
                  cat && (
                    <SelectItem key={`cat-${index}-${cat.value}`} value={String(cat.value)}>
                      {cat.label}
                    </SelectItem>
                  )
                ))
              ) : (
                <SelectItem value="no-categories" disabled>
                  {tableConfig.display.selectors.category.noCategories}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </TableHead>

        {/* Brand filter */}
        <TableHead key="filter-brand" className="px-2 py-2 hidden md:table-cell">
          <Select
            value={filters.brand ?? 'all'}
            onValueChange={value => onFilterChange('brand', value === 'all' ? undefined : value)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {uniqueBrands.map((brand, idx) => (
                <SelectItem key={brand || idx} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableHead>
        
        {/* Tags filter */}
        <TableHead key="filter-tags" className="px-2 py-2 hidden md:table-cell">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <TagIcon className="mr-1 h-3 w-3" />
                <span>
                  {Array.isArray(filters.tags) && filters.tags.length > 0 
                    ? tableConfig.display.selectors.tags.selectedCount.replace('{{count}}', filters.tags.length.toString()) 
                    : tableConfig.display.selectors.tags.buttonLabel}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2">
                {/* Search input for tags */}
                <Input
                  placeholder="Search tags..."
                  className="h-8 text-xs"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
                
                <div className="max-h-48 pr-2 overflow-y-auto tag-list">
                  {Array.isArray(uniqueTags) && uniqueTags.length > 0 ? (
                    <div className="space-y-1">
                      {/* Filter tags based on search and limit for performance */}
                      {uniqueTags
                        .filter(tag => tag && tag.toLowerCase().includes(tagSearch.toLowerCase()))
                        .slice(0, 100)
                        .map((tag) => (
                          <div key={tag} className="flex items-center tag-item">
                            <Checkbox 
                              id={`tag-${tag}`}
                              checked={Array.isArray(filters.tags) && filters.tags.includes(tag)}
                              onCheckedChange={(checked) => {
                                // Create new tags array
                                const newTags = checked 
                                  ? [...(Array.isArray(filters.tags) ? filters.tags : []), tag] 
                                  : (Array.isArray(filters.tags) ? filters.tags.filter((t: string) => t !== tag) : []);
                                
                                onFilterChange('tags', newTags)
                              }}
                            />
                            <Label 
                              htmlFor={`tag-${tag}`}
                              className="ml-2 text-sm cursor-pointer"
                            >
                              {tag}
                            </Label>
                          </div>
                        ))}
                      {uniqueTags.filter(tag => tag && tag.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && tagSearch && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No tags found matching "{tagSearch}"
                        </div>
                      )}
                      {uniqueTags.filter(tag => tag && tag.toLowerCase().includes(tagSearch.toLowerCase())).length > 100 && (
                        <div className="text-xs text-muted-foreground text-center py-2 border-t">
                          Showing first 100 results. Refine your search to see more specific tags.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      {tableConfig.display.selectors.tags.noTags}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>
        
        {/* GTIN/Barcode filter */}
        <TableHead key="filter-barcode" className="px-2 py-2">
          <Input
            placeholder="Filter barcode…"
            value={filters.barcode ?? ''}
            onChange={(e) => onFilterChange('barcode', e.target.value)}
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        </TableHead>
        
        {/* Price filter */}
        <TableHead key="filter-price" className="px-2 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{tableConfig.display.selectors.price.buttonLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="start">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="price-min">{tableConfig.display.selectors.price.minLabel}</Label>
                    <Input
                      id="price-min"
                      type="number"
                      placeholder={tableConfig.display.selectors.price.minLabel}
                      className="h-8"
                      value={filters.minPrice || ''}
                      onChange={(e) => {
                        onFilterChange('minPrice', e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-max">{tableConfig.display.selectors.price.maxLabel}</Label>
                    <Input
                      id="price-max"
                      type="number"
                      placeholder={tableConfig.display.selectors.price.maxLabel}
                      className="h-8"
                      value={filters.maxPrice || ''}
                      onChange={(e) => {
                        onFilterChange('maxPrice', e.target.value)
                      }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    onFilterChange('minPrice', undefined)
                    onFilterChange('maxPrice', undefined)
                  }}
                >
                  {tableConfig.display.selectors.price.resetButton}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>
        
        {/* Status filter */}
        <TableHead key="filter-status" className="px-2 py-2">
          <Select
            value={filters.is_active ?? 'all'}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={tableConfig.display.selectors.status.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tableConfig.display.selectors.status.all}</SelectItem>
              <SelectItem value="true">{tableConfig.display.selectors.status.active}</SelectItem>
              <SelectItem value="false">{tableConfig.display.selectors.status.inactive}</SelectItem>
            </SelectContent>
          </Select>
        </TableHead>
        
        {/* Created date range */}
        <TableHead key="filter-created_at" className="px-2 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Created Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <div className="grid gap-2">
                  <div>
                    <Label htmlFor="created_at-from">From</Label>
                    <Input
                      id="created_at-from"
                      type="date"
                      className="h-8"
                      value={filters.created_at_from || ''}
                      onChange={(e) => {
                        onFilterChange('created_at_from', e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="created_at-to">To</Label>
                    <Input
                      id="created_at-to"
                      type="date"
                      className="h-8"
                      value={filters.created_at_to || ''}
                      onChange={(e) => {
                        onFilterChange('created_at_to', e.target.value)
                      }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    onFilterChange('created_at_from', undefined)
                    onFilterChange('created_at_to', undefined)
                  }}
                >
                  Reset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>

        {/* Updated date range (Last Modified) */}
        <TableHead key="filter-updated_at" className="px-2 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Updated Date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <div className="grid gap-2">
                  <div>
                    <Label htmlFor="updated_at-from">From</Label>
                    <Input
                      id="updated_at-from"
                      type="date"
                      className="h-8"
                      value={filters.updated_at_from || ''}
                      onChange={(e) => {
                        onFilterChange('updated_at_from', e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="updated_at-to">To</Label>
                    <Input
                      id="updated_at-to"
                      type="date"
                      className="h-8"
                      value={filters.updated_at_to || ''}
                      onChange={(e) => {
                        onFilterChange('updated_at_to', e.target.value)
                      }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    onFilterChange('updated_at_from', undefined)
                    onFilterChange('updated_at_to', undefined)
                  }}
                >
                  Reset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>
        
        {/* Actions column - empty cell */}
        <TableHead key="filter-actions" className="px-2 py-2" />
      </TableRow>
    </>
  )
} 