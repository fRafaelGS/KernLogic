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
import { cn } from '@/lib/utils'
import { Search, Loader2, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatDisplayDate, getDateFormatPattern } from '@/utils/dateFormat'

interface ProductsTableFiltersProps {
  columns: any[]
  filters: Record<string, any>
  onFilterChange: (columnId: string, value: any) => void
  onClearFilters: () => void
  table: Table<Product> | null
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
  
  // Add state for search inputs in all dropdowns
  const [tagSearch, setTagSearch] = React.useState('')
  const [brandSearch, setBrandSearch] = React.useState('')
  const [familySearch, setFamilySearch] = React.useState('')
  const [categorySearch, setCategorySearch] = React.useState('')

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
      
      // Also update the TanStack table's internal filter (only if table exists)
      if (table) {
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
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.family && filters.family !== 'all'
                    ? families.find(f => String(f.id) === String(filters.family))?.label || families.find(f => String(f.id) === String(filters.family))?.code || `Family ${filters.family}`
                    : 'All Families'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2">
                {/* Search input for families */}
                <Input
                  placeholder="Search families..."
                  className="h-8 text-xs"
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                />
                
                <div className="max-h-48 pr-2 overflow-y-auto">
                  {isFamiliesLoading ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Loading families...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* All Families option */}
                      <div className="flex items-center">
                        <Checkbox 
                          id="family-all"
                          checked={!filters.family || filters.family === 'all'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onFilterChange('family', undefined)
                            }
                          }}
                        />
                        <Label 
                          htmlFor="family-all"
                          className="ml-2 text-sm cursor-pointer font-medium"
                        >
                          All Families
                        </Label>
                      </div>
                      
                      {/* Filter families based on search */}
                      {families
                        .filter(family => {
                          const searchTerm = familySearch.toLowerCase()
                          return (family.label && family.label.toLowerCase().includes(searchTerm)) ||
                                 (family.code && family.code.toLowerCase().includes(searchTerm))
                        })
                        .slice(0, 100)
                        .map((family) => (
                          <div key={family.id} className="flex items-center">
                            <Checkbox 
                              id={`family-${family.id}`}
                              checked={String(filters.family) === String(family.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  onFilterChange('family', String(family.id))
                                } else {
                                  onFilterChange('family', undefined)
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`family-${family.id}`}
                              className="ml-2 text-sm cursor-pointer"
                            >
                              {family.label || family.code || `Family ${family.id}`}
                            </Label>
                          </div>
                        ))}
                        
                      {families.filter(family => {
                        const searchTerm = familySearch.toLowerCase()
                        return (family.label && family.label.toLowerCase().includes(searchTerm)) ||
                               (family.code && family.code.toLowerCase().includes(searchTerm))
                      }).length === 0 && familySearch && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No families found matching "{familySearch}"
                        </div>
                      )}
                      
                      {families.length === 0 && !isFamiliesLoading && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No families available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>

        {/* Category filter - Updated to handle nested categories */}
        <TableHead key="filter-category" className="px-2 py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.category && filters.category !== 'all'
                    ? uniqueCategories.find(cat => String(cat.value) === String(filters.category))?.label || `Category ${filters.category}`
                    : tableConfig.display.selectors.category.allCategories}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2">
                {/* Search input for categories */}
                <Input
                  placeholder="Search categories..."
                  className="h-8 text-xs"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                
                <div className="max-h-48 pr-2 overflow-y-auto">
                  <div className="space-y-1">
                    {/* All Categories option */}
                    <div className="flex items-center">
                      <Checkbox 
                        id="category-all"
                        checked={!filters.category || filters.category === 'all'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCategoryFilterChange('all')
                          }
                        }}
                      />
                      <Label 
                        htmlFor="category-all"
                        className="ml-2 text-sm cursor-pointer font-medium"
                      >
                        {tableConfig.display.selectors.category.allCategories}
                      </Label>
                    </div>
                    
                    {/* Uncategorized option */}
                    <div className="flex items-center">
                      <Checkbox 
                        id="category-uncategorized"
                        checked={String(filters.category) === 'uncategorized'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleCategoryFilterChange('uncategorized')
                          }
                        }}
                      />
                      <Label 
                        htmlFor="category-uncategorized"
                        className="ml-2 text-sm cursor-pointer"
                      >
                        {tableConfig.display.selectors.category.uncategorized}
                      </Label>
                    </div>
                    
                    {/* Filter categories based on search */}
                    {Array.isArray(uniqueCategories) && uniqueCategories.length > 0 ? (
                      uniqueCategories
                        .filter(cat => cat && cat.label.toLowerCase().includes(categorySearch.toLowerCase()))
                        .slice(0, 100)
                        .map((cat, index) => (
                          <div key={`cat-${index}-${cat.value}`} className="flex items-center">
                            <Checkbox 
                              id={`category-${cat.value}`}
                              checked={String(filters.category) === String(cat.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleCategoryFilterChange(String(cat.value))
                                } else {
                                  handleCategoryFilterChange('all')
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`category-${cat.value}`}
                              className="ml-2 text-sm cursor-pointer"
                            >
                              {cat.label}
                            </Label>
                          </div>
                        ))
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        {tableConfig.display.selectors.category.noCategories}
                      </div>
                    )}
                    
                    {uniqueCategories.filter(cat => cat && cat.label.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && categorySearch && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        No categories found matching "{categorySearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TableHead>

        {/* Brand filter */}
        <TableHead key="filter-brand" className="px-2 py-2 hidden md:table-cell">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="h-7 text-xs w-full justify-start font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.brand && filters.brand !== 'all'
                    ? filters.brand
                    : 'All Brands'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2">
                {/* Search input for brands */}
                <Input
                  placeholder="Search brands..."
                  className="h-8 text-xs"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                />
                
                <div className="max-h-48 pr-2 overflow-y-auto">
                  <div className="space-y-1">
                    {/* All Brands option */}
                    <div className="flex items-center">
                      <Checkbox 
                        id="brand-all"
                        checked={!filters.brand || filters.brand === 'all'}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onFilterChange('brand', undefined)
                          }
                        }}
                      />
                      <Label 
                        htmlFor="brand-all"
                        className="ml-2 text-sm cursor-pointer font-medium"
                      >
                        All Brands
                      </Label>
                    </div>
                    
                    {/* Filter brands based on search */}
                    {uniqueBrands
                      .filter(brand => brand && brand.toLowerCase().includes(brandSearch.toLowerCase()))
                      .slice(0, 100)
                      .map((brand, idx) => (
                        <div key={brand || idx} className="flex items-center">
                          <Checkbox 
                            id={`brand-${brand}`}
                            checked={String(filters.brand) === String(brand)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onFilterChange('brand', brand)
                              } else {
                                onFilterChange('brand', undefined)
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`brand-${brand}`}
                            className="ml-2 text-sm cursor-pointer"
                          >
                            {brand}
                          </Label>
                        </div>
                      ))}
                      
                    {uniqueBrands.filter(brand => brand && brand.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 && brandSearch && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        No brands found matching "{brandSearch}"
                      </div>
                    )}
                    
                    {uniqueBrands.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        No brands available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
                className={cn(
                  "h-7 text-xs w-full justify-start font-normal",
                  // Show active state when price filters are applied
                  (filters.minPrice || filters.maxPrice) && "border-blue-500 bg-blue-50 text-blue-700"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.minPrice || filters.maxPrice
                    ? `Price: ${filters.minPrice || '∞'} - ${filters.maxPrice || '∞'}`
                    : tableConfig.display.selectors.price.buttonLabel
                  }
                </span>
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
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-8"
                      value={filters.minPrice || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow positive numbers
                        if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                          onFilterChange('minPrice', value === '' ? undefined : value)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price-max">{tableConfig.display.selectors.price.maxLabel}</Label>
                    <Input
                      id="price-max"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-8"
                      value={filters.maxPrice || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow positive numbers and validate min <= max
                        if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                          // Optional: validate that max >= min
                          if (filters.minPrice && value && Number(value) < Number(filters.minPrice)) {
                            // Could show validation error here, but for now just allow it
                          }
                          onFilterChange('maxPrice', value === '' ? undefined : value)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                
                {/* Show validation message if max < min */}
                {filters.minPrice && filters.maxPrice && Number(filters.maxPrice) < Number(filters.minPrice) && (
                  <div className="text-xs text-red-600 mt-1">
                    Maximum price should be greater than minimum price
                  </div>
                )}
                
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
                className={cn(
                  "h-7 text-xs w-full justify-start font-normal",
                  // Show active state when date filters are applied
                  (filters.created_at_from || filters.created_at_to) && "border-blue-500 bg-blue-50 text-blue-700"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.created_at_from || filters.created_at_to
                    ? `Created: ${formatDisplayDate(filters.created_at_from) || '∞'} - ${formatDisplayDate(filters.created_at_to) || '∞'}`
                    : "Created Date"
                  }
                </span>
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
                      placeholder={getDateFormatPattern()}
                      value={filters.created_at_from || ''}
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        onFilterChange('created_at_from', value)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="created_at-to">To</Label>
                    <Input
                      id="created_at-to"
                      type="date"
                      className="h-8"
                      placeholder={getDateFormatPattern()}
                      value={filters.created_at_to || ''}
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        onFilterChange('created_at_to', value)
                      }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    onFilterChange('created_at_from', '')
                    onFilterChange('created_at_to', '')
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
                className={cn(
                  "h-7 text-xs w-full justify-start font-normal",
                  // Show active state when date filters are applied
                  (filters.updated_at_from || filters.updated_at_to) && "border-blue-500 bg-blue-50 text-blue-700"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span>
                  {filters.updated_at_from || filters.updated_at_to
                    ? `Updated: ${formatDisplayDate(filters.updated_at_from) || '∞'} - ${formatDisplayDate(filters.updated_at_to) || '∞'}`
                    : "Updated Date"
                  }
                </span>
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
                      placeholder={getDateFormatPattern()}
                      value={filters.updated_at_from || ''}
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        onFilterChange('updated_at_from', value)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="updated_at-to">To</Label>
                    <Input
                      id="updated_at-to"
                      type="date"
                      className="h-8"
                      placeholder={getDateFormatPattern()}
                      value={filters.updated_at_to || ''}
                      onChange={(e) => {
                        const value = e.target.value || undefined
                        onFilterChange('updated_at_to', value)
                      }}
                    />
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => {
                    onFilterChange('updated_at_from', '')
                    onFilterChange('updated_at_to', '')
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