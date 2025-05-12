import React, { useEffect, useState } from 'react'
import { Control, Controller, useWatch } from 'react-hook-form'
import { ProductFormValues } from '@/schemas/product'
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// Simple DatePicker component implementation
const DatePicker = ({ id, value, onChange }: { id: string, value?: Date, onChange: (date?: Date) => void }) => (
  <Input 
    type="date" 
    id={id} 
    value={value ? value.toISOString().split('T')[0] : ''} 
    onChange={(e) => {
      const date = e.target.value ? new Date(e.target.value) : undefined
      onChange(date)
    }} 
  />
)

// Types for attribute management
interface AttributeGroup {
  id: string | number
  name: string
  code: string
  description?: string
  attributes: Attribute[]
}

interface Attribute {
  id: string | number
  groupId: string | number
  name: string
  code: string
  dataType: 'text' | 'number' | 'select' | 'multi-select' | 'date' | 'boolean' | 'textarea'
  description?: string
  isRequired?: boolean
  options?: Array<{ value: string, label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

interface AttributeValue {
  attributeId: string | number
  value: any
  locale: string
  channel: string
}

interface AttributeManagerProps {
  productId?: number
  control: Control<ProductFormValues>
  locale: string
  channel: string
}

/**
 * AttributeManager Component
 * 
 * Enterprise-ready attribute management component that organizes attributes by groups
 * and supports localization and channel-specific attribute values.
 */
export function AttributeManager({ 
  productId, 
  control, 
  locale = 'en-US', 
  channel = 'default' 
}: AttributeManagerProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([])
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Watch attributes field to update UI when values change
  const attributes = useWatch({ control, name: 'attributes' }) || {}

  // Load attribute groups and values
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)
      
      try {
        // Load attribute groups
        const groups = await fetchAttributeGroups({ locale, channel })
        setAttributeGroups(groups)
        
        // Load attribute values if we have a product ID
        if (productId) {
          const values = await fetchProductAttributes(productId, { locale, channel })
          setAttributeValues(values)
          
          // Expand groups that have values
          const groupsWithValues = new Set<string>()
          values.forEach(value => {
            const attribute = findAttributeById(groups, value.attributeId)
            if (attribute) {
              groupsWithValues.add(String(attribute.groupId))
            }
          })
          
          setExpandedGroups(Array.from(groupsWithValues))
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load attributes'))
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [locale, channel, productId])

  // Helper function to find an attribute by ID
  const findAttributeById = (groups: AttributeGroup[], id: string | number) => {
    for (const group of groups) {
      const attribute = group.attributes.find(attr => attr.id === id)
      if (attribute) return attribute
    }
    return null
  }

  // Mock function to fetch attribute groups - replace with actual API call
  async function fetchAttributeGroups({ locale, channel }: { locale: string, channel: string }): Promise<AttributeGroup[]> {
    // In a real implementation, you would call your API
    // For development/testing, return mock data after a short delay
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network latency
    return mockAttributeGroups
  }

  // Mock function to fetch product attributes - replace with actual API call
  async function fetchProductAttributes(productId: number, { locale, channel }: { locale: string, channel: string }): Promise<AttributeValue[]> {
    // In a real implementation, you would call your API
    // For development/testing, return empty array after a short delay
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network latency
    return []
  }

  // Handle retry
  const handleRetry = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const groups = await fetchAttributeGroups({ locale, channel })
      setAttributeGroups(groups)
      
      if (productId) {
        const values = await fetchProductAttributes(productId, { locale, channel })
        setAttributeValues(values)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load attributes'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle loading state
  if (isLoading) {
    return <AttributeManagerSkeleton />
  }

  // Handle error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading attributes</AlertTitle>
        <AlertDescription>
          {error.message || 'Failed to load attributes. Please try again.'}
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={handleRetry}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // If no attribute groups, show message
  if (attributeGroups.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted">
        <p className="text-center text-muted-foreground">No attribute groups found for this product type.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Product Attributes</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{locale}</Badge>
          <Badge variant="outline">{channel}</Badge>
        </div>
      </div>
      
      <Accordion 
        type="multiple" 
        value={expandedGroups}
        onValueChange={setExpandedGroups}
        className="w-full"
      >
        {attributeGroups.map((group) => (
          <AccordionItem key={group.id} value={String(group.id)}>
            <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
              <div className="flex justify-between items-center w-full">
                <span className="font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground">{group.attributes.length} attributes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 py-4">
              {group.description && (
                <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {group.attributes.map((attribute) => (
                  <Controller
                    key={attribute.id}
                    control={control}
                    name={`attributes.${attribute.code}`}
                    render={({ field }) => (
                      <AttributeInput
                        attribute={attribute}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        locale={locale}
                        channel={channel}
                      />
                    )}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

// Component to render the appropriate input based on attribute data type
function AttributeInput({
  attribute,
  value,
  onChange,
  onBlur,
  locale,
  channel
}: {
  attribute: Attribute
  value: any
  onChange: (value: any) => void
  onBlur: () => void
  locale: string
  channel: string
}) {
  return (
    <FormItem className="space-y-1.5">
      <FormLabel htmlFor={attribute.code}>
        {attribute.name}
        {attribute.isRequired && <span className="text-destructive ml-1">*</span>}
      </FormLabel>
      <FormControl>
        {renderInputByType()}
      </FormControl>
      {attribute.description && (
        <FormDescription className="text-xs">{attribute.description}</FormDescription>
      )}
      <FormMessage />
    </FormItem>
  )

  function renderInputByType() {
    switch (attribute.dataType) {
      case 'text':
        return (
          <Input
            id={attribute.code}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
          />
        )
      case 'textarea':
        return (
          <Textarea
            id={attribute.code}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            className="min-h-[80px]"
          />
        )
      case 'number':
        return (
          <Input
            id={attribute.code}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || e.target.value)}
            onBlur={onBlur}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
            min={attribute.validation?.min}
            max={attribute.validation?.max}
            step="any"
          />
        )
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={onChange}
            onOpenChange={() => onBlur()}
          >
            <SelectTrigger id={attribute.code}>
              <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attribute.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'multi-select':
        // This would require a custom multi-select component
        // For simplicity, using a basic selection for now
        return (
          <Select
            value={value || ''}
            onValueChange={onChange}
            onOpenChange={() => onBlur()}
          >
            <SelectTrigger id={attribute.code}>
              <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attribute.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'date':
        return (
          <DatePicker
            id={attribute.code}
            value={value ? new Date(value) : undefined}
            onChange={(date) => onChange(date?.toISOString().split('T')[0])}
          />
        )
      case 'boolean':
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id={attribute.code}
              checked={!!value}
              onCheckedChange={onChange}
              onBlur={onBlur}
            />
            <span className="text-sm text-muted-foreground">
              {value ? 'Yes' : 'No'}
            </span>
          </div>
        )
      default:
        return (
          <Input
            id={attribute.code}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={`Enter ${attribute.name.toLowerCase()}`}
          />
        )
    }
  }
}

// Loading skeleton for the attribute manager
function AttributeManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="pl-6">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Mock data for attribute groups - Remove in production
const mockAttributeGroups: AttributeGroup[] = [
  {
    id: 'general',
    name: 'General Information',
    code: 'general',
    description: 'Basic product information',
    attributes: [
      {
        id: 'color',
        groupId: 'general',
        name: 'Color',
        code: 'color',
        dataType: 'select',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'green', label: 'Green' },
          { value: 'blue', label: 'Blue' },
          { value: 'black', label: 'Black' },
          { value: 'white', label: 'White' }
        ]
      },
      {
        id: 'material',
        groupId: 'general',
        name: 'Material',
        code: 'material',
        dataType: 'text'
      },
      {
        id: 'weight',
        groupId: 'general',
        name: 'Weight (g)',
        code: 'weight',
        dataType: 'number',
        validation: {
          min: 0
        }
      }
    ]
  },
  {
    id: 'technical',
    name: 'Technical Specifications',
    code: 'technical',
    attributes: [
      {
        id: 'dimensions',
        groupId: 'technical',
        name: 'Dimensions',
        code: 'dimensions',
        dataType: 'text',
        description: 'Format: LxWxH in cm'
      },
      {
        id: 'warranty',
        groupId: 'technical',
        name: 'Warranty Period',
        code: 'warranty',
        dataType: 'select',
        options: [
          { value: '1y', label: '1 Year' },
          { value: '2y', label: '2 Years' },
          { value: '3y', label: '3 Years' },
          { value: '5y', label: '5 Years' },
          { value: 'lifetime', label: 'Lifetime' }
        ]
      },
      {
        id: 'features',
        groupId: 'technical',
        name: 'Key Features',
        code: 'features',
        dataType: 'textarea'
      }
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    code: 'marketing',
    attributes: [
      {
        id: 'season',
        groupId: 'marketing',
        name: 'Season',
        code: 'season',
        dataType: 'select',
        options: [
          { value: 'spring', label: 'Spring' },
          { value: 'summer', label: 'Summer' },
          { value: 'fall', label: 'Fall' },
          { value: 'winter', label: 'Winter' },
          { value: 'all', label: 'All Year' }
        ]
      },
      {
        id: 'launch_date',
        groupId: 'marketing',
        name: 'Launch Date',
        code: 'launch_date',
        dataType: 'date'
      },
      {
        id: 'is_new',
        groupId: 'marketing',
        name: 'New Arrival',
        code: 'is_new',
        dataType: 'boolean'
      }
    ]
  }
]

// Usage example:
//
// In ProductForm.tsx:
//
// <TabsContent value="attributes" className="space-y-4">
//   <AttributeManager
//     productId={productId}
//     control={form.control}
//     locale={selectedLocale}
//     channel={selectedChannel}
//   />
// </TabsContent> 