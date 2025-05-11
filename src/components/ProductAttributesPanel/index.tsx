import React, { useMemo, useState, useEffect } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PlusIcon, PencilIcon, Save, X, Trash2, Sparkles, Layers } from 'lucide-react'
import { useAttributes, useUpdateAttribute, useAttributeGroups, useDeleteAttribute, useCreateAttribute, useAllAttributes, useAllAttributeGroups } from './api'
import type { Attribute, AttributeGroup } from './types'
import { cn } from '@/lib/utils'
import LocaleChannelSelector from '@/features/attributes/LocaleChannelSelector'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [selectedLocale, setSelectedLocale] = useState(locale || 'en_US')
  const [selectedChannel, setSelectedChannel] = useState(channel || 'ecommerce')

  const availableLocales = [
    { code: 'en_US', label: 'English (US)' },
    { code: 'fr_FR', label: 'French' },
    { code: 'es_ES', label: 'Spanish' },
    { code: 'de_DE', label: 'German' }
  ]
  const availableChannels = [
    { code: 'ecommerce', label: 'E-commerce' },
    { code: 'mobile', label: 'Mobile' }
  ]

  const { data, isPending, isError } = useAttributes(productId, selectedLocale, selectedChannel)
  const updateMutation = useUpdateAttribute(productId, selectedLocale, selectedChannel)
  const { data: groupsData = [] } = useAttributeGroups(productId)
  const deleteMutation = useDeleteAttribute(productId, selectedLocale, selectedChannel)
  const deleteGlobalMutation = useDeleteAttribute(productId, null, null)
  const createMutation = useCreateAttribute(productId, selectedLocale, selectedChannel)
  const { data: allAttributes = [] } = useAllAttributes()
  const { data: allGroups = [], isLoading: loadingAllGroups } = useAllAttributeGroups()

  // local editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')

  // group attributes by group name
  const grouped = useMemo(() => {
    if (!data?.attributes) return {}
    const shouldFilter = Boolean(selectedLocale) || Boolean(selectedChannel)

    // initial map from group id/name
    const map: Record<string, Attribute[]> = {}
    // Build helper index by attribute id
    const attrById: Record<number, Attribute> = {}

    // Sort attributes so that the most specific (locale+channel) appear last.
    const sortedAttrs = [...data.attributes].sort((a, b) => {
      const score = (x: any) => (x.locale ? 2 : 0) + (x.channel ? 1 : 0)
      return score(a) - score(b)
    })

    sortedAttrs.forEach(a => {
      const key = (a as any).attribute ?? a.id
      attrById[key] = a as any
    })

    groupsData.forEach(g => {
      g.items.forEach(item => {
        const a = attrById[item.attribute]
        if (!a) return
        // filter
        if (a.product !== Number(productId)) return
        if (shouldFilter) {
          if (selectedLocale) {
            const loc = selectedLocale.replace('-', '_')
            if (a.locale && a.locale !== loc) return
          }
          if (selectedChannel) {
            if (a.channel && a.channel !== selectedChannel) return
          }
        }
        map[g.name] = map[g.name] ? [...map[g.name], a] : [a]
      })
    })

    // handle attributes not in any group
    const groupedIds = new Set(Object.values(map).flat().map(a => a.id))
    const ungrouped: Attribute[] = []
    sortedAttrs.forEach(a => {
      if (a.product !== Number(productId)) return
      if (groupedIds.has(a.id)) return
      // same filter
      if (shouldFilter) {
        if (selectedLocale) {
          const loc = selectedLocale.replace('-', '_')
          if (a.locale && a.locale !== loc) return
        }
        if (selectedChannel) {
          if (a.channel && a.channel !== selectedChannel) return
        }
      }
      ungrouped.push(a)
    })
    if (ungrouped.length) map['Ungrouped'] = ungrouped
    return map
  }, [data?.attributes, selectedLocale, selectedChannel, productId, groupsData])

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

  const [addingAllGroup, setAddingAllGroup] = useState<string | null>(null)

  // Compute missing groups (by id): show button if group is not in product's group list
  const productGroupIds = new Set((groupsData || []).map(g => g.id))
  const missingGroups = (allGroups || []).filter(g => !productGroupIds.has(g.id))

  // Helper: add all attributes from a group to the product
  async function handleAddGroupToProduct(group: AttributeGroup) {
    setAddingAllGroup(group.name)
    try {
      // Find which attributes are not present in the product
      // Convert all attributes to numbers for consistent comparison
      const presentIds = new Set(data?.attributes.map(a => {
        const attrId = (a as any).attribute ?? a.id
        return typeof attrId === 'string' ? Number(attrId) : attrId
      }))
      
      const toAdd = group.items.filter(item => !presentIds.has(item.attribute))
      
      if (toAdd.length === 0) {
        toast('All attributes in this group are already present')
        setAddingAllGroup(null)
        return
      }
      
      // Use Promise.all to add all attributes in parallel
      await Promise.all(toAdd.map(item => 
        createMutation.mutateAsync({ attributeId: item.attribute, value: '' })
      ))
      
      toast.success(`Added group '${group.name}' to product (${toAdd.length} attributes)`) 
    } catch (err) {
      console.error('Error adding group to product:', err)
      toast.error('Failed to add group to product')
    } finally {
      setAddingAllGroup(null)
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
    setMediaUploadError?: (v: string | null) => void
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
                  if (setMediaUploadError) setMediaUploadError(null)
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
                  onClick={() => setDraftValue(null)}
                  disabled={isDisabled}
                >Remove</Button>
              </div>
            )}
            {setMediaUploading && <div className='text-xs text-muted-foreground'>Uploading…</div>}
            {setMediaUploadError && <div className='text-xs text-red-500'>{mediaUploadError}</div>}
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
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null)

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

  if (!data?.attributes || data.attributes.length === 0) {
    return (
      <p className='text-muted-foreground'>No attributes found.</p>
    )
  }

  return (
    <div className='space-y-4'>
      <LocaleChannelSelector
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
        availableLocales={availableLocales}
        availableChannels={availableChannels}
        onLocaleChange={setSelectedLocale}
        onChannelChange={setSelectedChannel}
      />

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
        <div className='text-xs text-muted-foreground mb-2'>All attribute groups are already added to this product.</div>
      )}

      <Accordion type='single' collapsible value={openGroup} onValueChange={setOpenGroup} className='w-full'>
        {visibleGroupNames.map(groupName => {
          const attrs = grouped[groupName]
          // Find all attribute IDs in this group
          const groupMeta = groupsData.find(g => g.name === groupName)
          const allGroupAttrIds = groupMeta ? groupMeta.items.map(item => item.attribute) : []
          // Find which are not present in product
          const presentIds = new Set(data?.attributes.map(a => {
            const attrId = (a as any).attribute ?? a.id
            return typeof attrId === 'string' ? Number(attrId) : attrId
          }))
          const unusedAttrIds = allGroupAttrIds.filter(id => !presentIds.has(id))
          const canAddAll = unusedAttrIds.length > 0
          return (
            <AccordionItem value={groupName} key={groupName} className='border-b'>
              <AccordionTrigger className='flex items-center justify-between px-4 py-3'>
                <span className='font-medium'>{groupName} ({attrs.length})</span>
                <div className='flex items-center gap-2'>
                  {canAddAll && (
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
                                createMutation.mutateAsync({ attributeId: attrId, value: '' })
                              )
                              await Promise.all(promises)
                              toast.success(`Added ${unusedAttrIds.length} attributes from '${groupName}'`)
                            } catch (err) {
                              toast.error('Failed to add all attributes')
                            } finally {
                              setAddingAllGroup(null)
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
                </div>
              </AccordionTrigger>
              <AccordionContent className='px-2 pb-4'>
                {attrs.length === 0 ? (
                  <p className='text-sm text-muted-foreground px-4'>No attributes. Click + to add one.</p>
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
                                      validationError,
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
              <DialogDescription>Select an attribute from the group and enter its value.</DialogDescription>
            </DialogHeader>

            {/* Attribute select */}
            <div className='space-y-2'>
              <label className='block text-sm font-medium'>Attribute</label>
              <select
                className='w-full border rounded px-2 py-1'
                value={newAttrId ?? ''}
                onChange={e => setNewAttrId(Number(e.target.value))}
              >
                <option value='' disabled>Select attribute…</option>
                {(() => {
                  const grp = groupsData.find(g => g.name === addDialogGroup)
                  if (!grp) return null
                  // Filter attributeIds already present in product
                  const presentIds = new Set(data?.attributes.map(a => {
                    const attrId = (a as any).attribute ?? a.id
                    return typeof attrId === 'string' ? Number(attrId) : attrId
                  }))
                  return grp.items
                    .filter(item => !presentIds.has(item.attribute))
                    .map(item => {
                      const attrMeta = allAttributes.find(a => a.id === String(item.attribute) || Number(a.id) === item.attribute)
                      const label = (attrMeta?.attribute_label as any) || (attrMeta as any)?.label || attrMeta?.name || (attrMeta as any)?.code || attrMeta?.attribute_code || `Attr ${item.attribute}`
                      return <option key={item.attribute} value={item.attribute}>{label}</option>
                    })
                })()}
              </select>

              <label className='block text-sm font-medium'>Value</label>
              <Input value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)} />
            </div>

            <DialogFooter className='mt-4'>
              <Button
                onClick={() => {
                  if (!newAttrId || newAttrValue.trim() === '') return
                  createMutation.mutate({ attributeId: newAttrId, value: newAttrValue.trim() }, {
                    onSuccess: () => setAddDialogGroup(null)
                  })
                }}
                disabled={!newAttrId || newAttrValue.trim() === '' || createMutation.isPending}
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
    </div>
  )
} 