import React, { useMemo, useState, useEffect } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PlusIcon, PencilIcon, Save, X, Trash2, Sparkles, Layers } from 'lucide-react'
import { useAttributes, useUpdateAttribute, useDeleteAttribute, useCreateAttribute, useAllAttributes, useAllAttributeGroups, useAttributeGroups, GROUPS_QUERY_KEY } from './api'
import { useGlobalAttributes } from '@/hooks/useGlobalAttributes'
import type { Attribute, AttributeGroup } from './types'
import LocaleChannelSelector from '@/features/attributes/LocaleChannelSelector'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { ChannelCode, LocaleCode } from '@/services/types'
import axiosInstance from '@/lib/axiosInstance'
import { useFamilyAttributeGroups } from '@/hooks/useFamilyAttributeGroups'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { config, API_MEDIA_UPLOAD } from '@/config/config'
import { useAuth } from '@/contexts/AuthContext'

interface ProductAttributesPanelProps {
  productId: string
  locale?: string
  channel?: string
  familyId?: number // can be undefined but not null
  enabled?: boolean // Add enabled prop to control when to fetch data
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

export function ProductAttributesPanel({ productId, locale, channel, familyId: propFamilyId, enabled }: ProductAttributesPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // IMPORTANT NOTE FOR PRODUCT FAMILY UPDATES:
  // When updating a product's family in other components (like Basic Info tab),
  // you must invalidate the product query to update the familyId in this component:
  //
  // queryClient.invalidateQueries(['product', productId])
  //
  // Otherwise, this component will continue using the old familyId until page reload.
  
  const { locales, channels, defaultLocale, defaultChannel } = useOrgSettings()
  
  // Use org defaults if props are not provided
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(locale ?? defaultLocale)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCode>(channel ?? defaultChannel?.code ?? (channels.length > 0 ? channels[0].code : ''))

  // Keep selectedLocale/Channel in sync with org defaults if props are not provided
  useEffect(() => {
    if (!locale && defaultLocale && selectedLocale !== defaultLocale) {
      setSelectedLocale(defaultLocale)
    }
    if (!channel && defaultChannel?.code && selectedChannel !== defaultChannel.code) {
      setSelectedChannel(defaultChannel.code)
    }
  }, [locale, channel, defaultLocale, defaultChannel, selectedLocale, selectedChannel])

  // Add flag to track if we're in create mode
  const isCreateMode = !productId

  // Fetch product data to access family
  const { data: productData } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => axiosInstance.get(`/api/products/${productId}/`).then(r => r.data),
    enabled: !!productId
  })

  // Prefer familyId from props over product data
  const familyId = propFamilyId !== undefined ? propFamilyId : productData?.family
  const hasFamily = Boolean(familyId)

  // Refetch family groups when props.familyId changes
  useEffect(() => {
    if (propFamilyId !== undefined) {
      queryClient.invalidateQueries({ 
        queryKey: ['familyAttributeGroups', propFamilyId, String(selectedLocale || 'all'), String(selectedChannel || 'all')] 
      });
    }
  }, [propFamilyId, queryClient, selectedLocale, selectedChannel]);

  // Fetch family attribute groups if family exists
  const familyGroupsRaw = useFamilyAttributeGroups(familyId, selectedLocale, selectedChannel)
  const familyGroups: AttributeGroup[] = familyGroupsRaw.data ?? []
  const isLoadingFamilyGroups = familyGroupsRaw.isLoading
  const familyError = familyGroupsRaw.error

  // Fetch product attribute groups (overrides)
  const attributeGroupsRaw = useAttributeGroups(productId, selectedLocale, selectedChannel, enabled)
  const attributeGroups: AttributeGroup[] = attributeGroupsRaw.data ?? []

  // Compute sourceGroups: prefer familyGroups if hasFamily, else attributeGroups
  const sourceGroups = (hasFamily ? familyGroups : attributeGroups) as AttributeGroup[]

  // Add additional fallback for empty groups
  const hasNoGroups = !sourceGroups || sourceGroups.length === 0

  // local editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  
  // Track draft values for create mode
  const [createModeDraftValues, setCreateModeDraftValues] = useState<Record<number, string>>({})

  // Call useAttributes with correct arguments for the local implementation
  const attributesHook = useAttributes(productId, selectedLocale, selectedChannel)
  const { data, isPending, isError } = attributesHook
  const updateMutation = useUpdateAttribute(productId, selectedLocale, selectedChannel)
  const deleteMutation = useDeleteAttribute(productId, selectedLocale, selectedChannel)
  const deleteGlobalMutation = useDeleteAttribute(productId, undefined, undefined)
  const createMutation = useCreateAttribute(productId, selectedLocale, selectedChannel)
  const { data: globalAttrData } = useGlobalAttributes()
  const allAttributes = globalAttrData?.attributes || []

  // Build grouped data from sourceGroups, then add any data attributes
  const grouped: Record<string, Attribute[]> = useMemo(() => {
    const map: Record<string, Attribute[]> = {}
    
    // Handle the case where sourceGroups is undefined or empty
    if (sourceGroups && Array.isArray(sourceGroups) && sourceGroups.length > 0) {
      sourceGroups.forEach((g: AttributeGroup) => { 
        if (g && g.name) map[g.name] = [] 
      })
    }
    
    // Always ensure 'Ungrouped' exists
    map['Ungrouped'] = []

    // Use attribute values from the attributes hook instead of productData?.attributes
    const attributeValues = attributesHook.data?.attributes || []
    
    // Ensure attributeValues is an array before iterating
    if (Array.isArray(attributeValues)) {
      attributeValues.forEach((attrVal: Attribute) => {
        const attrId = Number((attrVal as any).attribute ?? attrVal.id)
        
        // Only look for a group if we have sourceGroups
        let foundGroup = false
        if (sourceGroups && sourceGroups.length > 0) {
          const grp = sourceGroups.find((g: AttributeGroup) =>
            g.items && Array.isArray(g.items) && g.items.some((item: any) => Number(item.attribute) === attrId)
          )
          if (grp) {
            map[grp.name].push(attrVal)
            foundGroup = true
          }
        }
        
        if (!foundGroup) map['Ungrouped'].push(attrVal)
      })
    }

    return map
  }, [sourceGroups, attributesHook.data, productId, hasFamily, familyId, hasNoGroups])

  // Add validation state for phone, email, url, date
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Access the centralized configuration
  const panelConfig = config.settings.display.attributeComponents.productAttributesPanel

  const handleSave = (attr: Attribute) => {
    let value = draftValue
    setValidationError(null)
    const type = attr.attribute_type || attr.type
    // Basic validation for enterprise polish
    if (type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
      setValidationError(panelConfig.validation.email)
      return
    }
    if (type === 'phone' && value && !/^\+?[0-9\-\s]{7,}$/.test(value)) {
      setValidationError(panelConfig.validation.phone)
      return
    }
    if (type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setValidationError(panelConfig.validation.date)
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
  const productGroupIds = new Set(Object.keys(grouped).filter((name: string) => name !== 'Ungrouped'))
  const missingGroups = (sourceGroups as AttributeGroup[]).filter((g: AttributeGroup) => !productGroupIds.has(g.name))
  
  // State for Delete Group modal
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | undefined>(undefined)
  
  // Function to delete a group from the product
  const handleDeleteGroup = async (groupName: string) => {
    // Get all attribute IDs for this group
    const attrs = grouped[groupName] || []
    if (attrs.length === 0) {
      toast.error(panelConfig.attributeGroups.noAttributesInGroup)
      return
    }
    
    // Confirm with the user
    const attrPromises = attrs.map(attr => 
      deleteMutation.mutateAsync({ id: String(attr.id) })
    )
    
    try {
      await Promise.all(attrPromises)
      await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
      toast.success(panelConfig.attributeGroups.removeSuccess)
      setIsDeleteGroupModalOpen(false)
      setGroupToDelete(undefined)
    } catch (error) {
      toast.error(panelConfig.attributeGroups.removeError)
    }
  }

  // Helper: add all attributes from a group to the product
  async function handleAddGroupToProduct(group: AttributeGroup) {
    if (!group || !group.items || !productId) return

    setAddingAllGroup(group.name)
    try {
      const attrIds = group.items
        .map((item: any) => item.attribute)
        .filter((id: any) => id != null)

      if (attrIds.length === 0) {
        toast.error(panelConfig.attributeGroups.noAttributesInGroup)
        return
      }

      // Create a blank value for each attribute - users can edit after adding
      const promises = attrIds.map((attrId: number) =>
        createMutation.mutateAsync({
          attributeId: attrId,
          value: '',
          locale: selectedLocale,
          channel: selectedChannel
        })
      )

      await Promise.all(promises)
      await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
      toast.success(panelConfig.attributeGroups.addSuccess)
    } catch (err) {
      toast.error(panelConfig.attributeGroups.addError)
    } finally {
      setAddingAllGroup(undefined)
    }
  }

  // Helper to upload media and return asset_id
  async function uploadMedia(file: File): Promise<number> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(API_MEDIA_UPLOAD, {
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
    if (locales.some(l => l.code === locale)) {
      setSelectedLocale(locale as LocaleCode);
    }
  };

  const handleChannelChange = (channel: string) => {
    if (channels.some(c => c.code === channel)) {
      setSelectedChannel(channel as ChannelCode);
    }
  };

  // loading state includes family groups
  const isLoading = isLoadingFamilyGroups || isPending
  const hasError = !!familyError || isError

  // MODIFIED: Relax the bailout condition to allow rendering in create mode
  if (isLoading) {
    return (
      <div className='space-y-2'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='h-6 bg-muted animate-pulse rounded' />
        ))}
      </div>
    )
  }

  if (hasError) {
    return (
      <p className='text-destructive'>{panelConfig.loadError}</p>
    )
  }

  return (
    <div className='space-y-4'>
      {hasFamily && hasNoGroups && (
        <div className='bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4'>
          <h3 className='font-medium text-yellow-800 mb-1'>{panelConfig.noGroupsState.title}</h3>
          <p className='text-sm text-yellow-700'>
            {panelConfig.noGroupsState.description}
          </p>
          <div className='mt-3'>
            <Button 
              size='sm'
              variant='outline'
              onClick={() => {
                // Navigate to family management page (adjust the URL as needed)
                window.open(`/families/${familyId}`, '_blank')
              }}
            >
              {panelConfig.noGroupsState.configureButton}
            </Button>
          </div>
          <p className='text-xs text-yellow-600 mt-2'>
            {panelConfig.noGroupsState.tip}
          </p>
        </div>
      )}

      <LocaleChannelSelector
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
        onLocaleChange={handleLocaleChange}
        onChannelChange={handleChannelChange}
      />

      {/* Group management UI */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">{panelConfig.title}</h3>
        {!isCreateMode && Object.keys(grouped).filter(name => name !== 'Ungrouped').length > 0 && (
          <Button 
            size="sm" 
            variant="outline" 
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setIsDeleteGroupModalOpen(true)}
          >
            {panelConfig.buttons.deleteGroup}
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
      {missingGroups.length > 0 ? (
        <div className='flex flex-wrap gap-2 mb-2'>
          {missingGroups.map((group: AttributeGroup) => (
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
              <TooltipContent>{panelConfig.attributeGroups.addTooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ) : (
        missingGroups.length === 0 && sourceGroups.length > 0 ? (
          <div className='text-xs text-muted-foreground mb-2'>{panelConfig.attributeGroups.allGroupsAdded}</div>
        ) : null
      )}

      {/* Add Attribute Dialog */}
      {addDialogGroup && (
        <Dialog open onOpenChange={open => { if (!open) { setAddDialogGroup(null); setNewAttrId(null); setNewAttrValue('') } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{panelConfig.buttons.addAttribute}</DialogTitle>
              <DialogDescription>{panelConfig.addAttributeModal.description}</DialogDescription>
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
                    const grp = sourceGroups.find((g: AttributeGroup) => g.name === addDialogGroup)
                    if (!grp) return null
                    // Filter attributeIds already present in product
                    const presentIds = new Set((productData?.attributes as Attribute[] | undefined)?.map((a: Attribute) => {
                      const attrId = (a as any).attribute ?? a.id
                      return typeof attrId === 'string' ? Number(attrId) : attrId
                    }) || [])
                    return grp.items
                      .filter((item: any) => !presentIds.has(item.attribute))
                      .map((item: any) => {
                        const attrMeta = allAttributes.find((a: Attribute) => a.id === String(item.attribute) || Number(a.id) === item.attribute)
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
                    toast.success(panelConfig.addAttributeModal.success)
                  } catch (err) {
                    toast.error(panelConfig.addAttributeModal.error)
                  }
                }}
                disabled={!newAttrId || createMutation.isPending}
              >
                {panelConfig.addAttributeModal.buttons.add}
              </Button>
              <DialogClose asChild>
                <Button variant='outline'>{panelConfig.addAttributeModal.buttons.cancel}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Group Modal */}
      <Dialog open={isDeleteGroupModalOpen} onOpenChange={setIsDeleteGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{panelConfig.deleteGroupModal.title}</DialogTitle>
            <DialogDescription className="text-amber-600">
              {panelConfig.deleteGroupModal.warning}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{panelConfig.deleteGroupModal.selectLabel}</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={groupToDelete || ''}
                onChange={e => setGroupToDelete(e.target.value)}
              >
                <option value="" disabled>{panelConfig.deleteGroupModal.selectPlaceholder}</option>
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
                <p className="font-medium text-amber-800 mb-1">{panelConfig.deleteGroupModal.aboutToDelete}</p>
                <p className="text-amber-700">
                  {panelConfig.deleteGroupModal.allAttributesIn} {grouped[groupToDelete]?.length || 0} {panelConfig.deleteGroupModal.attributesIn} "{groupToDelete}"
                </p>
                <p className="mt-2 text-xs text-amber-600">
                  {panelConfig.deleteGroupModal.actionDescription}
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
              {deleteMutation.isPending ? panelConfig.deleteGroupModal.buttons.deleting : panelConfig.deleteGroupModal.buttons.confirm}
            </Button>
            <Button variant="outline" onClick={() => setIsDeleteGroupModalOpen(false)}>
              {panelConfig.deleteGroupModal.buttons.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accordion-based group rendering */}
      <Accordion type='single' collapsible value={openGroup} onValueChange={setOpenGroup} className='w-full'>
        {visibleGroupNames.map((groupName: string) => {
          const attrs = grouped[groupName]
          // Find all attribute IDs in this group
          const groupMeta = sourceGroups.find((g: AttributeGroup) => g.name === groupName)
          const allGroupAttrIds = groupMeta ? groupMeta.items.map((item: any) => item.attribute) : []
          // Find which are not present in product
          const presentIds = new Set((productData?.attributes as Attribute[] | undefined)?.map((a: Attribute) => {
            const attrId = (a as any).attribute ?? a.id
            return typeof attrId === 'string' ? Number(attrId) : attrId
          }) || [])
          const unusedAttrIds = allGroupAttrIds.filter((attrId: number) => !presentIds.has(attrId))
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
                              const promises = unusedAttrIds.map((attrId: number) =>
                                createMutation.mutateAsync({ attributeId: attrId, value: '', locale: selectedLocale, channel: selectedChannel })
                              )
                              await Promise.all(promises)
                              // 🔄 REFRESH DATA
                              await queryClient.invalidateQueries({ queryKey: ['attributes', productId, selectedLocale, selectedChannel] })
                              toast.success(`${panelConfig.attributeGroups.addSuccess} '${groupName}'`)
                            } catch (err) {
                              toast.error(panelConfig.attributeGroups.addError)
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
                      <TooltipContent>{panelConfig.attributeGroups.addTooltip}</TooltipContent>
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
                      aria-label={`${panelConfig.buttons.addAttribute}`}
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
                    <p>{panelConfig.emptyState.title}</p>
                    {isCreateMode ? (
                      <p>{panelConfig.emptyState.description}</p>
                    ) : (
                      <p>{panelConfig.buttons.addAttribute}</p>
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
                        {attrs.map((attr: Attribute) => {
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
                                    {updateMutation.isPending ? (
                                      <p className='text-red-600'>{panelConfig.saveError}</p>
                                    ) : null}
                                    {validationError && !updateMutation.isPending ? (
                                      <p className='text-red-600'>{validationError}</p>
                                    ) : null}
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
    </div>
  )
} 