import React, { useMemo, useState, useEffect } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PlusIcon, PencilIcon, Save, X, Trash2, Sparkles, Layers } from 'lucide-react'
import { useAttributes, useUpdateAttribute, useDeleteAttribute, useCreateAttribute, useAllAttributes, useAllAttributeGroups, useAttributeGroups, GROUPS_QUERY_KEY } from './api'
import type { Attribute, AttributeGroup } from './types'
import { cn } from '@/lib/utils'
import LocaleChannelSelector from '@/features/attributes/LocaleChannelSelector'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueryClient } from '@tanstack/react-query'
import { LOCALES, LocaleCode } from '@/config/locales'
import { CHANNELS, ChannelCode } from '@/config/channels'
import axiosInstance from '@/lib/axiosInstance'

interface ProductAttributesPanelProps {
  productId: string
  locale?: string
  channel?: string
}

// Static fallback: currency list (replace with API-driven if available)
const currencies = [
  { iso_code: 'USD', symbol: '$' },
  { iso_code: 'EUR', symbol: '€' },
  { iso_code: 'GBP', symbol: '£' },
  { iso_code: 'JPY', symbol: '¥' },
  { iso_code: 'CNY', symbol: '¥' }
]
// Static fallback: measurement units (replace with API-driven if available)
const units = ['mm','cm','m','in','ft','kg','g','lb','oz','l','ml']

export function ProductAttributesPanel({ productId, locale, channel }: ProductAttributesPanelProps) {
  // Initialize query client
  const queryClient = useQueryClient()
  
  // Add debug logs
  console.log({
    productId,
    isCreateMode: !productId,
    locale,
    channel
  });

  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(locale as LocaleCode ?? LOCALES[0].code)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCode>(channel as ChannelCode ?? CHANNELS[0].code)

  // Add flag to track if we're in create mode
  const isCreateMode = !productId

  const { data, isPending, isError } = useAttributes(productId, selectedLocale, selectedChannel)
  const updateMutation = useUpdateAttribute(productId, selectedLocale, selectedChannel)
  const deleteMutation = useDeleteAttribute(productId, selectedLocale, selectedChannel)
  const deleteGlobalMutation = useDeleteAttribute(productId, undefined, undefined)
  const createMutation = useCreateAttribute(productId, selectedLocale, selectedChannel)
  const { data: allAttributes = [] } = useAllAttributes()
  const { data: allGroups = [], isLoading: loadingAllGroups } = useAllAttributeGroups()
  const { data: groupsData = [] } = useAttributeGroups(productId)

  // Add runtime logging for debugging data shapes
  useEffect(() => {
    console.log('👉 allGroups:', allGroups);
    console.log('👉 groupsData:', groupsData);
    console.log('👉 data.attributes:', data?.attributes);
  }, [allGroups, groupsData, data]);

  // Add more comprehensive debug logs
  console.log({
    productId,
    isCreateMode: !productId,
    'useAttributes data': data?.attributes,
    'useAllAttributeGroups data': allGroups,
    'allGroups.length': allGroups?.length,
    'allAttributes.length': allAttributes?.length
  });

  // local editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  
  // Track draft values for create mode
  const [createModeDraftValues, setCreateModeDraftValues] = useState<Record<number, string>>({})

  // Build grouped data from all groups, then add any data attributes
  const grouped = useMemo(() => {
    // 1) Build a bucket for every group name, plus 'Ungrouped'
    const map: Record<string, Attribute[]> = {};
    allGroups.forEach(g => { map[g.name] = []; });
    map['Ungrouped'] = [];

    // 2) If we have existing values, slot each one into its group
    if (data?.attributes?.length) {
      data.attributes.forEach(attrVal => {
        // Get the attribute ID, checking both possible fields for flexibility
        const valId = Number((attrVal as any).attribute || attrVal.id);
        // find the group containing that attribute
        const grp = allGroups.find(g =>
          g.items.some(item => Number(item.attribute) === valId)
        );
        if (grp) {
          map[grp.name].push(attrVal);
        } else {
          map['Ungrouped'].push(attrVal);
        }
      });
    }

    return map;
  }, [allGroups, data?.attributes]);

  // Add validation state for phone, email, url, date
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSave = (attr: Attribute) => {
    let value = draftValue
    setValidationError(null)
    const type = attr.attribute_type || attr.type
    // Basic validation for enterprise polish
    if (type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
      setValidationError('Invalid email address')
      return
    }
    if (type === 'phone' && value && !/^\+?[0-9\-\s]{7,}$/.test(value)) {
      setValidationError('Invalid phone number')
      return
    }
    if (type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setValidationError('Invalid date format (YYYY-MM-DD)')
      return
    }
    if (type === 'url' && value && value.length > 0 && !/^https?:\/\//i.test(value)) {
      // Auto-prepend https:// if missing
      value = 'https://' + value.replace(/^\/*/, '')
    }
    if (draftValue === attr.value || updateMutation.isPending) {
      setEditingId(null)
      return
    }
    updateMutation.mutate({ id: attr.id, payload: { value } })
    setEditingId(null)
  }

  // Handle updating draft values in create mode
  const handleCreateModeDraftChange = (attributeId: number, value: string) => {
    setCreateModeDraftValues(prev => ({
      ...prev,
      [attributeId]: value
    }))
  }

  const groupNames = Object.keys(grouped)
  // filterGroup comes from pill selection – when set we show only that group
  const [filterGroup, setFilterGroup] = useState<string | undefined>(undefined)
  // openGroup controls accordion panel open state
  const [openGroup, setOpenGroup] = useState<string | undefined>(undefined)

  // whenever filterGroup changes sync openGroup
  useEffect(() => {
    if (filterGroup) {
      setOpenGroup(filterGroup)
    }
  }, [filterGroup])

  // ensure openGroup exists among visible groups
  useEffect(() => {
    const visible = filterGroup ? [filterGroup] : groupNames
    if (openGroup && !visible.includes(openGroup)) {
      setOpenGroup(undefined)
    }
  }, [filterGroup, groupNames, openGroup])

  const visibleGroupNames = filterGroup ? [filterGroup] : groupNames

  // -------------------------------------------------------------
  // Add-attribute dialog state
  // -------------------------------------------------------------
  const [addDialogGroup, setAddDialogGroup] = useState<string | null>(null)
  const [newAttrId, setNewAttrId] = useState<number | null>(null)
  const [newAttrValue, setNewAttrValue] = useState<string>('')

  const [addingAllGroup, setAddingAllGroup] = useState<string | undefined>(undefined)

  // Compute missing groups (by id): show button if group is not in product's group list
  const productGroupIds = new Set(Object.keys(grouped).filter(name => name !== 'Ungrouped'))
  const missingGroups = (allGroups || []).filter(g => !productGroupIds.has(g.name))
  
  // State for Delete Group modal
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | undefined>(undefined)
  
  // Function to delete a group from the product
  const handleDeleteGroup = async (groupName: string) => {
    // Get all attribute IDs for this group
    const attrs = grouped[groupName] || []
    if (attrs.length === 0) {
      toast.error('No attributes found in this group to delete')
      return
    }
    
    // Confirm with the user
    const attrPromises = attrs.map(attr => 
      deleteMutation.mutateAsync({ id: String(attr.id) })
    )
    
    try {
      await Promise.all(attrPromises)
      await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
      toast.success(`Successfully removed all attributes from group "${groupName}"`)
      setIsDeleteGroupModalOpen(false)
      setGroupToDelete(undefined)
    } catch (error) {
      console.error('Error deleting group attributes:', error)
      toast.error('Failed to remove some attributes')
    }
  }

  // Helper: add all attributes from a group to the product
  async function handleAddGroupToProduct(group: AttributeGroup) {
    // With the new backend changes, groups can only be added via family overrides
    // If the product doesn't have a family, show an error message
    // If it does, use the family override mechanism
    
    setAddingAllGroup(group.name)
    try {
      // Check if product has a family assigned
      const productResponse = await axiosInstance.get(`/api/products/${productId}/`)
      const productData = productResponse.data
      
      if (!productData.family) {
        toast.error('This product has no family assigned. Attribute groups can only be inherited from a family.')
        setAddingAllGroup(undefined)
        return
      }
      
      // Use family override mechanism to add group
      // POST to /api/products/{productId}/family-overrides/
      await axiosInstance.post(`/api/products/${productId}/family-overrides/`, [
        {
          attribute_group: group.id,
          removed: false // false means "add this group"
        }
      ])
      
      // Refresh data after override is applied
      await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
      await queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY(productId) })
      
      toast.success(`Added group '${group.name}' to product via family override`)
    } catch (err) {
      console.error('Error adding group to product:', err)
      toast.error('Failed to add group to product. Groups can only be added via family inheritance.')
    } finally {
      setAddingAllGroup(undefined)
    }
  }

  // Helper to upload media and return asset_id
  async function uploadMedia(file: File): Promise<number> {
    const formData = new FormData()
    formData.append('file', file)
    // TODO: Adjust the endpoint to your backend's media upload URL
    const res = await fetch('/api/media/upload/', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    // Assume response: { asset_id: number }
    return data.asset_id
  }

  // Type-aware attribute editor for each attribute type
  function renderAttributeEditor(
    attr: any, // AttributeRow
    draftValue: any,
    setDraftValue: (v: any) => void,
    isDisabled: boolean,
    validationError?: string,
    setMediaUploading?: (v: boolean) => void,
    setMediaUploadError?: (v: string | undefined) => void
  ) {
    const type = attr.attribute_type || attr.type
    switch (type) {
      case 'rich_text':
        return (
          <RichTextEditor 
            value={draftValue || ''} 
            onChange={setDraftValue} 
          />
        )
      case 'price':
        return (
          <div className='flex gap-2'>
            <Input
              type='number'
              step='0.01'
              value={draftValue?.amount ?? ''}
              onChange={e => setDraftValue({ ...draftValue, amount: parseFloat(e.target.value) })}
              disabled={isDisabled}
              placeholder='Amount'
              className='w-24'
            />
            <Select
              value={draftValue?.currency || ''}
              onValueChange={c => setDraftValue({ ...draftValue, currency: c })}
              disabled={isDisabled}
            >
              <SelectTrigger className='w-28'>
                <SelectValue placeholder='Currency' />
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
        )
      case 'measurement':
        return (
          <div className='flex gap-2'>
            <Input
              type='number'
              value={draftValue?.amount ?? ''}
              onChange={e => setDraftValue({ ...draftValue, amount: parseFloat(e.target.value) })}
              disabled={isDisabled}
              placeholder='Amount'
              className='w-24'
            />
            <Select
              value={draftValue?.unit || ''}
              onValueChange={u => setDraftValue({ ...draftValue, unit: u })}
              disabled={isDisabled}
            >
              <SelectTrigger className='w-20'>
                <SelectValue placeholder='Unit' />
              </SelectTrigger>
              <SelectContent>
                {units.map(u => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      case 'phone':
        return (
          <div>
            <Input
              type='tel'
              value={draftValue || ''}
              onChange={e => setDraftValue(e.target.value)}
              disabled={isDisabled}
              placeholder='+1 555-123-4567'
              pattern='^\\+?[0-9\-\s]{7,}$'
            />
            <div className='text-xs text-muted-foreground'>Format: +country code number</div>
            {validationError && <div className='text-xs text-red-500'>{validationError}</div>}
          </div>
        )
      case 'email':
        return (
          <div>
            <Input
              type='email'
              value={draftValue || ''}
              onChange={e => setDraftValue(e.target.value)}
              disabled={isDisabled}
              placeholder='user@example.com'
              pattern='^[^@\s]+@[^@\s]+\\.[^@\s]+$'
            />
            <div className='text-xs text-muted-foreground'>Format: user@example.com</div>
            {validationError && <div className='text-xs text-red-500'>{validationError}</div>}
          </div>
        )
      case 'url':
        return (
          <div>
            <Input
              type='url'
              value={draftValue || ''}
              onChange={e => setDraftValue(e.target.value)}
              disabled={isDisabled}
              placeholder='https://example.com'
              pattern='^(https?:)?//'
            />
            <div className='text-xs text-muted-foreground'>Format: https://example.com</div>
            {validationError && <div className='text-xs text-red-500'>{validationError}</div>}
          </div>
        )
      case 'date':
        return (
          <div>
            <Input
              type='date'
              value={draftValue || ''}
              onChange={e => setDraftValue(e.target.value)}
              disabled={isDisabled}
              placeholder='YYYY-MM-DD'
            />
            <div className='text-xs text-muted-foreground'>Pick a date (YYYY-MM-DD)</div>
            {validationError && <div className='text-xs text-red-500'>{validationError}</div>}
          </div>
        )
      case 'media':
        return (
          <div>
            <input
              type='file'
              accept='image/*,video/*,application/pdf'
              onChange={async e => {
                const file = e.target.files?.[0]
                if (file) {
                  if (setMediaUploading) setMediaUploading(true)
                  if (setMediaUploadError) setMediaUploadError(undefined)
                  try {
                    const assetId = await uploadMedia(file)
                    setDraftValue({ asset_id: assetId })
                  } catch (err: any) {
                    if (setMediaUploadError) setMediaUploadError('Upload failed')
                  } finally {
                    if (setMediaUploading) setMediaUploading(false)
                  }
                }
              }}
              disabled={isDisabled}
            />
            {draftValue && draftValue.asset_id && (
              <div className='mt-2 flex items-center gap-2'>
                <span className='text-xs'>Asset ID: {draftValue.asset_id}</span>
                <Button
                  size='xs'
                  variant='outline'
                  onClick={() => setDraftValue(undefined)}
                  disabled={isDisabled}
                >Remove</Button>
              </div>
            )}
            {setMediaUploading && <div className='text-xs text-muted-foreground'>Uploading…</div>}
            {setMediaUploadError && mediaUploadError && <div className='text-xs text-red-500'>{mediaUploadError}</div>}
          </div>
        )
      case 'select': {
        // Try to get options from attr.options, attr.choices, or attr.values
        const options = attr.options || attr.choices || attr.values || []
        if (Array.isArray(options) && options.length > 0) {
          return (
            <div>
              <Select
                value={draftValue || ''}
                onValueChange={v => setDraftValue(v)}
                disabled={isDisabled}
              >
                <SelectTrigger className='w-48'>
                  <SelectValue placeholder='Select an option' />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt: any) => (
                    <SelectItem key={opt.value ?? opt.id ?? opt} value={opt.value ?? opt.id ?? opt}>
                      {opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
        // Fallback: no options available
        return (
          <Input
            value={draftValue ?? ''}
            onChange={e => setDraftValue(e.target.value)}
            disabled={isDisabled}
            placeholder='No options available'
          />
        )
      }
      default:
        return (
          <Input
            value={draftValue ?? ''}
            onChange={e => setDraftValue(e.target.value)}
            disabled={isDisabled}
            placeholder={`Enter ${attr.attribute_label || attr.name}`}
          />
        )
    }
  }

  // Helper to format attribute values for display in the table
  function formatAttributeValue(attr: any): string {
    const type = attr.attribute_type || attr.type
    const value = attr.value
    if (value == null || value === '') return '—'
    switch (type) {
      case 'price':
        if (typeof value === 'object' && value.amount != null && value.currency) {
          return `${value.amount} ${value.currency}`
        }
        return '—'
      case 'measurement':
        if (typeof value === 'object' && value.amount != null && value.unit) {
          return `${value.amount} ${value.unit}`
        }
        return '—'
      case 'rich_text':
        return typeof value === 'string'
          ? value.replace(/<[^>]+>/g, '').slice(0, 80)
          : '—'
      default:
        return typeof value === 'object' ? JSON.stringify(value) : String(value)
    }
  }

  // Add media upload state
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaUploadError, setMediaUploadError] = useState<string | undefined>(undefined)

  // Add function wrappers to handle type issues
  const handleLocaleChange = (locale: string) => {
    if (LOCALES.some(l => l.code === locale)) {
      setSelectedLocale(locale as LocaleCode);
    }
  };

  const handleChannelChange = (channel: string) => {
    if (CHANNELS.some(c => c.code === channel)) {
      setSelectedChannel(channel as ChannelCode);
    }
  };

  // MODIFIED: Relax the bailout condition to allow rendering in create mode
  if (isPending) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='h-6 bg-muted animate-pulse rounded' />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className='text-destructive'>Unable to load attributes</p>
    )
  }

  return (
    <div className='space-y-4'>
      <LocaleChannelSelector
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
        onLocaleChange={handleLocaleChange}
        onChannelChange={handleChannelChange}
      />

      {/* Group management UI */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Group Management</h3>
        {!isCreateMode && Object.keys(grouped).filter(name => name !== 'Ungrouped').length > 0 && (
          <Button 
            size="sm" 
            variant="outline" 
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setIsDeleteGroupModalOpen(true)}
          >
            Delete Group
          </Button>
        )}
      </div>

      {/* Group navigation */}
      {groupNames.length > 1 && (
        <div className='flex flex-wrap gap-2'>
          {groupNames.map(g => (
            <Button
              key={g}
              variant={g === filterGroup ? 'primary' : 'outline'}
              size='sm'
              onClick={() => setFilterGroup(filterGroup === g ? undefined : g)}
            >
              {g}
            </Button>
          ))}
        </div>
      )}

      {/* Add missing groups UI */}
      {loadingAllGroups ? (
        <div className='flex items-center gap-2 text-muted-foreground'><span className='animate-spin h-4 w-4'><Layers className='h-4 w-4' /></span> Loading groups…</div>
      ) : missingGroups.length > 0 ? (
        <div className='flex flex-wrap gap-2 mb-2'>
          {missingGroups.map(group => (
            <Tooltip key={group.id}>
              <TooltipTrigger asChild>
                <Button
                  variant='primary'
                  size='sm'
                  className='flex items-center gap-2 px-3 py-2 bg-gradient-to-tr from-primary to-blue-500 text-white shadow-md hover:from-blue-600 hover:to-primary focus:ring-2 focus:ring-primary/50'
                  aria-label={`Add group '${group.name}' to product`}
                  disabled={addingAllGroup === group.name}
                  onClick={() => handleAddGroupToProduct(group)}
                >
                  {addingAllGroup === group.name ? (
                    <span className='animate-spin h-4 w-4'><Layers className='h-4 w-4' /></span>
                  ) : (
                    <Layers className='h-4 w-4' />
                  )}
                  <span>Add group: {group.name}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add all attributes from this group to product</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ) : (
        missingGroups.length === 0 && allGroups.length > 0 ? (
          <div className='text-xs text-muted-foreground mb-2'>All attribute groups are already added to this product.</div>
        ) : null
      )}

      <Accordion type='single' collapsible value={openGroup} onValueChange={setOpenGroup} className='w-full'>
        {visibleGroupNames.map(groupName => {
          const attrs = grouped[groupName]
          // Find all attribute IDs in this group
          const groupMeta = allGroups.find(g => g.name === groupName)
          const allGroupAttrIds = groupMeta ? groupMeta.items.map(item => item.attribute) : []
          // Find which are not present in product
          const presentIds = new Set(data?.attributes?.map(a => {
            const attrId = (a as any).attribute ?? a.id
            return typeof attrId === 'string' ? Number(attrId) : attrId
          }) || [])
          const unusedAttrIds = allGroupAttrIds.filter(id => !presentIds.has(id))
          const canAddAll = unusedAttrIds.length > 0
          return (
            <AccordionItem value={groupName} key={groupName} className='border-b'>
              <AccordionTrigger className='flex items-center justify-between px-4 py-3'>
                <span className='font-medium'>{groupName} ({attrs.length})</span>
                <div className='flex items-center gap-2'>
                  {canAddAll && !isCreateMode && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          role='button'
                          tabIndex={0}
                          className='h-8 w-8 p-0 bg-gradient-to-tr from-primary to-blue-500 text-white shadow-md hover:from-blue-600 hover:to-primary focus:ring-2 focus:ring-primary/50 flex items-center justify-center rounded-md cursor-pointer outline-none'
                          aria-label={`Add all attributes from ${groupName}`}
                          onClick={async e => {
                            e.stopPropagation()
                            setAddingAllGroup(groupName)
                            try {
                              const promises = unusedAttrIds.map(attrId =>
                                createMutation.mutateAsync({ attributeId: attrId, value: '', locale: selectedLocale, channel: selectedChannel })
                              )
                              await Promise.all(promises)
                              
                              // 🔄 REFRESH DATA
                              await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
                              
                              toast.success(`Added ${unusedAttrIds.length} attributes from '${groupName}'`)
                            } catch (err) {
                              toast.error('Failed to add all attributes')
                            } finally {
                              setAddingAllGroup(undefined)
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.currentTarget.click()
                            }
                          }}
                        >
                          {addingAllGroup === groupName ? (
                            <span className='animate-spin h-4 w-4 mx-auto'><Sparkles className='h-4 w-4 mx-auto' /></span>
                          ) : (
                            <Sparkles className='h-4 w-4 mx-auto' />
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Add all attributes from this group to product</TooltipContent>
                    </Tooltip>
                  )}
                  {!isCreateMode && (
                    <span
                      role='button'
                      tabIndex={0}
                      className='h-8 w-8 p-0 flex items-center justify-center rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                      onClick={e => {
                        e.stopPropagation()
                        setAddDialogGroup(groupName)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          setAddDialogGroup(groupName)
                        }
                      }}
                      aria-label={`Add attribute to ${groupName}`}
                    >
                      <PlusIcon className='h-4 w-4' />
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className='px-2 pb-4'>
                {attrs.length === 0 ? (
                  // Instead of trying to render individual attribute rows which causes linter errors, 
                  // Just show an improved message explaining how to add attributes
                  <div className="py-4 text-sm text-muted-foreground px-4 flex flex-col gap-2">
                    <p>No attributes in this group yet.</p>
                    {isCreateMode ? (
                      <p>Attributes will be available after saving the product.</p>
                    ) : (
                      <p>Click the + button in the header to add attributes.</p>
                    )}
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <Table className='min-w-full'>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-1/4'>Name</TableHead>
                          <TableHead className='w-1/12'>Type</TableHead>
                          <TableHead className='w-1/12'>Locale</TableHead>
                          <TableHead className='w-1/12'>Channel</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className='w-20 text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attrs.map(attr => {
                          const isEditing = editingId === attr.id
                          return (
                            <TableRow key={attr.id}>
                              <TableCell className='py-4'>{attr.attribute_label || attr.name || attr.attribute_code}</TableCell>
                              <TableCell className='py-4'>{attr.attribute_type || attr.type}</TableCell>
                              <TableCell className='py-4'>{attr.locale || 'All locales'}</TableCell>
                              <TableCell className='py-4'>{attr.channel || 'All channels'}</TableCell>
                              <TableCell className='py-4'>
                                {isEditing ? (
                                  <>
                                    {/* Type-aware editor for each attribute type */}
                                    {renderAttributeEditor(
                                      attr,
                                      draftValue,
                                      setDraftValue,
                                      updateMutation.isPending,
                                      validationError ?? undefined,
                                      setMediaUploading,
                                      setMediaUploadError
                                    )}
                                    <div className='flex items-center space-x-2'>
                                      <Button size='icon' variant='ghost' onClick={() => handleSave(attr)} disabled={updateMutation.isPending || mediaUploading} aria-label='Save'>
                                        <Save className='h-4 w-4' />
                                      </Button>
                                      <Button size='icon' variant='ghost' onClick={() => setEditingId(null)} disabled={updateMutation.isPending || mediaUploading} aria-label='Cancel'>
                                        <X className='h-4 w-4' />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  formatAttributeValue(attr)
                                )}
                              </TableCell>
                              <TableCell className='py-4 text-right'>
                                <div className='flex justify-end items-center space-x-2'>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    onClick={() => {
                                      setEditingId(attr.id)
                                      setDraftValue(attr.value ?? '')
                                    }}
                                    aria-label='Edit'
                                  >
                                    <PencilIcon className='h-4 w-4' />
                                  </Button>
                                  <Button
                                    size='icon'
                                    variant='ghost'
                                    aria-label='Delete'
                                    disabled={deleteMutation.isPending || deleteGlobalMutation.isPending}
                                    onClick={() => {
                                      const isGlobal = (attr.locale == null || attr.locale === '') && (attr.channel == null || attr.channel === '')

                                      // Warn the user if this is a global value (applies to all locales/channels)
                                      if (isGlobal) {
                                        const ok = window.confirm('This attribute value applies to ALL locales and channels for this product. Deleting it will remove the value everywhere. Continue?')
                                        if (!ok) return
                                        deleteGlobalMutation.mutate({ id: String(attr.id) })
                                      } else {
                                        deleteMutation.mutate({ id: String(attr.id) })
                                      }
                                    }}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Add Attribute Dialog */}
      {addDialogGroup && (
        <Dialog open onOpenChange={open => { if (!open) { setAddDialogGroup(null); setNewAttrId(null); setNewAttrValue('') } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add attribute to {addDialogGroup}</DialogTitle>
              <DialogDescription>Select an attribute to add to this product. You can set its value after adding.</DialogDescription>
            </DialogHeader>

            {/* Attribute select - simplified to just the dropdown */}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Attribute</label>
                <select
                  className='w-full border rounded px-2 py-1'
                  value={newAttrId ?? ''}
                  onChange={e => setNewAttrId(Number(e.target.value))}
                >
                  <option value='' disabled>Select attribute…</option>
                  {(() => {
                    const grp = allGroups.find(g => g.name === addDialogGroup)
                    if (!grp) return null
                    // Filter attributeIds already present in product
                    const presentIds = new Set(data?.attributes?.map(a => {
                      const attrId = (a as any).attribute ?? a.id
                      return typeof attrId === 'string' ? Number(attrId) : attrId
                    }) || [])
                    return grp.items
                      .filter(item => !presentIds.has(item.attribute))
                      .map(item => {
                        const attrMeta = allAttributes.find(a => a.id === String(item.attribute) || Number(a.id) === item.attribute)
                        const label = (attrMeta?.attribute_label as any) || (attrMeta as any)?.label || attrMeta?.name || (attrMeta as any)?.code || attrMeta?.attribute_code || `Attr ${item.attribute}`
                        return <option key={item.attribute} value={item.attribute}>{label}</option>
                      })
                  })()}
                </select>
              </div>
            </div>

            <DialogFooter className='mt-4'>
              <Button
                onClick={async () => {
                  if (!newAttrId) return
                  
                  try {
                    // Add attribute with empty value - users will edit it later
                    await createMutation.mutateAsync({
                      attributeId: newAttrId,
                      value: '',
                      locale: selectedLocale,
                      channel: selectedChannel
                    })
                    
                    // 🔄 REFRESH DATA
                    await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
                    
                    setAddDialogGroup(null)
                    
                    // Show success message with hint to edit
                    toast.success('Attribute added. Use the edit button to set its value.')
                  } catch (err) {
                    toast.error('Failed to add attribute')
                  }
                }}
                disabled={!newAttrId || createMutation.isPending}
              >
                Add
              </Button>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Group Modal */}
      <Dialog open={isDeleteGroupModalOpen} onOpenChange={setIsDeleteGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Attribute Group</DialogTitle>
            <DialogDescription className="text-amber-600">
              Warning: This will remove all attributes in the selected group from this product.
              The group itself will remain available for other products.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Group to Delete</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={groupToDelete || ''}
                onChange={e => setGroupToDelete(e.target.value)}
              >
                <option value="" disabled>Choose a group...</option>
                {Object.keys(grouped)
                  .filter(name => name !== 'Ungrouped' && grouped[name].length > 0)
                  .map(name => (
                    <option key={name} value={name}>
                      {name} ({grouped[name].length} attributes)
                    </option>
                  ))
                }
              </select>
            </div>
            
            {groupToDelete && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                <p className="font-medium text-amber-800 mb-1">You are about to delete:</p>
                <p className="text-amber-700">
                  All {grouped[groupToDelete]?.length || 0} attributes in group "{groupToDelete}"
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  This action only removes these attributes from the current product.
                  The attributes and group definition will still be available for other products.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => groupToDelete && handleDeleteGroup(groupToDelete)}
              disabled={!groupToDelete || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteGroupModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 