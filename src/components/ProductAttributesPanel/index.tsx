import React, { useMemo, useState, useEffect } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PlusIcon, PencilIcon, Save, X, Trash2 } from 'lucide-react'
import { useAttributes, useUpdateAttribute, useAttributeGroups, useDeleteAttribute } from './api'
import type { Attribute, AttributeGroup } from './types'
import { cn } from '@/lib/utils'
import LocaleChannelSelector from '@/features/attributes/LocaleChannelSelector'

interface ProductAttributesPanelProps {
  productId: string
  locale?: string
  channel?: string
}

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

  const handleSave = (attr: Attribute) => {
    if (draftValue === attr.value || updateMutation.isPending) {
      setEditingId(null)
      return
    }
    updateMutation.mutate({ id: attr.id, payload: { value: draftValue } })
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

      <Accordion type='single' collapsible value={openGroup} onValueChange={setOpenGroup} className='w-full'>
        {visibleGroupNames.map(groupName => {
          const attrs = grouped[groupName]
          return (
            <AccordionItem value={groupName} key={groupName} className='border-b'>
              <AccordionTrigger className='flex items-center justify-between px-4 py-3'>
                <span className='font-medium'>{groupName} ({attrs.length})</span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0'
                  onClick={e => {
                    e.stopPropagation()
                    // TODO: open add attribute dialog
                  }}
                  aria-label={`Add attribute to ${groupName}`}
                >
                  <PlusIcon className='h-4 w-4' />
                </Button>
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
                          const displayValue = attr.value ?? '—'
                          return (
                            <TableRow key={attr.id}>
                              <TableCell className='py-4'>{attr.attribute_label || attr.name || attr.attribute_code}</TableCell>
                              <TableCell className='py-4'>{attr.attribute_type || attr.type}</TableCell>
                              <TableCell className='py-4'>{attr.locale}</TableCell>
                              <TableCell className='py-4'>{attr.channel}</TableCell>
                              <TableCell className='py-4'>
                                {isEditing ? (
                                  <div className='flex items-center space-x-2'>
                                    <Input
                                      value={draftValue}
                                      onChange={e => setDraftValue(e.target.value)}
                                      disabled={updateMutation.isPending}
                                      className='max-w-xs'
                                      autoFocus
                                    />
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      onClick={() => handleSave(attr)}
                                      disabled={updateMutation.isPending}
                                      aria-label='Save'
                                    >
                                      <Save className='h-4 w-4' />
                                    </Button>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      onClick={() => setEditingId(null)}
                                      disabled={updateMutation.isPending}
                                      aria-label='Cancel'
                                    >
                                      <X className='h-4 w-4' />
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    className={cn('truncate max-w-[200px] text-left', 'hover:underline')}
                                    onClick={() => {
                                      setEditingId(attr.id)
                                      setDraftValue(attr.value ?? '')
                                    }}
                                    aria-label={`Edit value for ${attr.name}`}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>{displayValue}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>{displayValue}</TooltipContent>
                                    </Tooltip>
                                  </button>
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
                                    disabled={deleteMutation.isPending || (
                                      // Only allow deletion when attr matches current locale/channel
                                      (selectedLocale && (attr.locale ?? '') !== selectedLocale.replace('-', '_')) ||
                                      (selectedChannel && (attr.channel ?? '') !== selectedChannel)
                                    )}
                                    onClick={() => deleteMutation.mutate({ id: String(attr.id) })}
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