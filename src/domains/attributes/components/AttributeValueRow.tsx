import React, { useState, useCallback } from 'react';
import { Input } from "@/domains/core/components/ui/input";
import { Switch } from "@/domains/core/components/ui/switch";
import { Badge } from "@/domains/core/components/ui/badge";
import { Button } from "@/domains/core/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/domains/core/components/ui/popover";
import { Calendar } from "@/domains/core/components/ui/calendar";
import { Check, X, Loader2, CheckCircle2, AlertCircle, Trash2, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { useDebouncedCallback } from '@/domains/core/hooks/useDebouncedCallback';
import { Edit, Calendar as CalendarIcon, Globe, Monitor } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/domains/core/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/domains/core/components/ui/tooltip";

import { useOrgSettings } from '@/domains/organization/hooks/useOrgSettings';
import { config } from '@/config/config';

// Types
export interface Attribute {
  id: number;
  code: string;
  label: string;
  data_type: string;
  is_localisable: boolean;
  is_scopable: boolean;
}

export interface AttributeValue {
  id?: number;
  attribute: number;
  value: any;
  locale?: string;
  channel?: string;
}

export type SavingState = 'idle' | 'saving' | 'saved' | 'error';

// ------------------------------------------------------------------
// Normalised value type – covers every data_type we support
// ------------------------------------------------------------------
export type AttrValue =
  | string
  | number
  | boolean
  | { amount: number; currency: string }
  | { amount: number; unit: string }
  | { asset_id: number }

interface AttributeValueRowProps {
  attribute: Attribute;
  value: AttributeValue | null;
  isEditable: boolean;
  isNew?: boolean;
  onEdit: (attributeId: number) => void;
  onCancel: (attributeId: number) => void;
  onSaveNew: (attributeId: number, value: any) => void;
  onUpdate: (valueId: number, value: any) => void;
  savingState: SavingState;
  isStaff: boolean;
  onRemove?: () => void;
  isSettingsContext?: boolean;
  groupName?: string;
  selectedLocale?: string;
  selectedChannel?: string;
}

/**
 * Component for rendering and editing a single attribute value
 */
const AttributeValueRow: React.FC<AttributeValueRowProps> = ({
  attribute,
  value,
  isEditable,
  isNew = false,
  onEdit,
  onCancel,
  onSaveNew,
  onUpdate,
  savingState,
  isStaff,
  onRemove,
  isSettingsContext = false,
  groupName = "",
  selectedLocale = "default",
  selectedChannel = "default"
}) => {
  // Get configurations
  const attributeConfig = config.settings.display.attributeComponents.attributeValueRow;
  
  // --------------------------------------------------------------
  // Normalise incoming JSONField value from API → AttrValue object
  // --------------------------------------------------------------
  const rawValue = value?.value as any

  const needsJSON = ['price', 'measurement', 'media', 'rich_text'].includes(attribute.data_type)

  let actualValue: AttrValue = rawValue as AttrValue
  if (needsJSON && typeof rawValue === 'string') {
    try {
      actualValue = JSON.parse(rawValue)
    } catch {
      // leave as-is – backend already sent object or malformed JSON
    }
  }

  // Local editing state – initialise with the normalised value
  const [localValue, setLocalValue] = useState<AttrValue>(
    isNew ? (needsJSON ? ({} as AttrValue) : ('' as AttrValue)) : (actualValue || '' as AttrValue)
  );
  
  // Add state for locale and channel
  const [localLocale, setLocalLocale] = useState<string>(
    isNew ? "default" : (value?.locale || "default")
  );
  
  const [localChannel, setLocalChannel] = useState<string>(
    isNew ? "default" : (value?.channel || "default")
  );
  
  // Use debounced callback for saving
  const debouncedSave = useDebouncedCallback((newValue: AttrValue) => {
    const sendValue = needsJSON ? JSON.stringify(newValue) : newValue

    if (isNew) {
      onSaveNew(attribute.id, sendValue);
    } else if (value?.id) {
      onUpdate(value.id, sendValue);
    }
  }, 800);
  
  // Handle value change
  const handleValueChange = useCallback((newValue: AttrValue) => {
    console.log(`Value changed for attribute ${attribute.id} to:`, newValue);
    console.log(`Current locale: ${localLocale}, channel: ${localChannel}`);
    
    // Process locale and channel
    const apiLocale = localLocale === 'default' ? null : localLocale;
    const apiChannel = localChannel === 'default' ? null : localChannel;
    
    console.log(`Using API values: locale=${apiLocale}, channel=${apiChannel}`);
    
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [debouncedSave, attribute.id, localLocale, localChannel]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Manually trigger save
      if (isNew) {
        onSaveNew(
          attribute.id, 
          localValue
        );
      } else if (value?.id) {
        onUpdate(
          value.id, 
          localValue
        );
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel(attribute.id);
    }
  }, [attribute.id, isNew, localValue, onCancel, onSaveNew, onUpdate, value?.id, localLocale, localChannel]);
  
  // Render attribute editor based on data type
  const renderAttributeEditor = () => {
    const isDisabled = savingState === 'saving';
    
    switch (attribute.data_type) {
      case 'text':
        return (
          <Input
            value={(localValue as any) || ''}
            onChange={(e) => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.text}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={(localValue as any) || ''}
            onChange={(e) => handleValueChange(parseFloat(e.target.value) as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.number}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(localValue)}
              onCheckedChange={(newValue) => handleValueChange(newValue as AttrValue)}
              disabled={isDisabled}
            />
            <span className="text-sm text-enterprise-600">
              {Boolean(localValue) ? attributeConfig.labels.boolean.yes : attributeConfig.labels.boolean.no}
            </span>
          </div>
        );
        
      case 'date':
        return (
          <div className="grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!localValue ? 'text-muted-foreground' : ''}`}
                  disabled={isDisabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localValue ? format(new Date(localValue as string), 'PPP') : attributeConfig.placeholders.selectDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localValue ? new Date(localValue as string) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Format date to ISO string (YYYY-MM-DD)
                      const formattedDate = format(date, 'yyyy-MM-dd');
                      console.log("Selected date:", date, "Formatted:", formattedDate);
                      handleValueChange(formattedDate as AttrValue);
                    } else {
                      handleValueChange('' as AttrValue);
                    }
                  }}
                  initialFocus
                  disabled={isDisabled}
                />
              </PopoverContent>
            </Popover>
          </div>
        );
        
      case 'price':
        // Expecting object { amount, currency }
        return (
          <div className='flex gap-2'>
            <Input
              type='number'
              step='0.01'
              value={(localValue as any)?.amount ?? ''}
              onChange={e => {
                const amt = parseFloat(e.target.value)
                handleValueChange({ amount: isNaN(amt) ? 0 : amt, currency: (localValue as any)?.currency ?? 'USD' } as AttrValue)
              }}
              disabled={isDisabled}
              placeholder='Amount'
              className='w-32'
            />
            <Select
              value={(localValue as any)?.currency ?? 'USD'}
              onValueChange={cur => handleValueChange({ amount: (localValue as any)?.amount ?? 0, currency: cur } as AttrValue)}
              disabled={isDisabled}
            >
              <SelectTrigger className='w-28'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['USD','EUR','GBP','JPY','CNY'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'measurement':
        // Expecting object { amount, unit }
        const units = ['mm','cm','m','in','ft']
        return (
          <div className='flex gap-2'>
            <Input
              type='number'
              value={(localValue as any)?.amount ?? ''}
              onChange={e => {
                const amt = parseFloat(e.target.value)
                handleValueChange({ amount: isNaN(amt) ? 0 : amt, unit: (localValue as any)?.unit ?? units[0] } as AttrValue)
              }}
              disabled={isDisabled}
              placeholder='Amount'
              className='w-28'
            />
            <Select
              value={(localValue as any)?.unit ?? units[0]}
              onValueChange={unit => handleValueChange({ amount: (localValue as any)?.amount ?? 0, unit } as AttrValue)}
              disabled={isDisabled}
            >
              <SelectTrigger className='w-24'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'url':
        return (
          <Input
            type='url'
            value={(localValue as any) || ''}
            onChange={e => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.url}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )

      case 'email':
        return (
          <Input
            type='email'
            value={(localValue as any) || ''}
            onChange={e => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.email}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )

      case 'phone':
        return (
          <Input
            type='tel'
            value={(localValue as any) || ''}
            onChange={e => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.phone}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )

      case 'rich_text':
        return (
          <textarea
            className='w-full border rounded p-2 text-sm'
            rows={4}
            value={(localValue as any) || ''}
            onChange={e => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder='Enter formatted text...'
          />
        )

      case 'media':
        return (
          <Input
            type='file'
            accept='image/*,video/*,application/pdf'
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                // For now just store file name; real implementation would upload and obtain asset_id
                handleValueChange({ asset_id: Date.now() } as AttrValue)
              }
            }}
            disabled={isDisabled}
          />
        )

      default:
        return (
          <Input
            value={(localValue as any) || ''}
            onChange={(e) => handleValueChange(e.target.value as AttrValue)}
            disabled={isDisabled}
            placeholder={attributeConfig.placeholders.text}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
    }
  };
  
  // Render saving state indicator
  const renderSavingState = () => {
    switch (savingState) {
      case 'saving':
        return (
          <span className="ml-2 inline-flex items-center text-enterprise-500">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs">Saving...</span>
          </span>
        );
        
      case 'saved':
        return (
          <span className="ml-2 inline-flex items-center text-success-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            <span className="text-xs">Saved</span>
          </span>
        );
        
      case 'error':
        return (
          <span className="ml-2 inline-flex items-center text-danger-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            <span className="text-xs">Error saving</span>
          </span>
        );
        
      default:
        return null;
    }
  };
  
  // Render value based on data type
  const renderValue = () => {
    // For editable mode, don't show value
    if (isEditable) {
      return renderAttributeEditor();
    }
    
    // Not in edit mode - render the value based on type
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">No value</span>;
    }
    
    // Use the normalised value when displaying
    function actualValueRef(): AttrValue {
      return (value && value.value) || '' as AttrValue;
    }
    const actualValue = actualValueRef();
    
    switch (attribute.data_type) {
      case 'boolean':
        return Boolean(actualValue) ? (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100">
            <Check className="h-3 w-3 mr-1" />
            Yes
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100">
            <X className="h-3 w-3 mr-1" />
            No
          </Badge>
        );
      case 'date':
        if (!actualValue) return <span className="text-muted-foreground italic">No date</span>;
        return format(new Date(actualValue as string), 'yyyy-MM-dd');
      case 'number':
        // Make sure we display 0 values properly (don't treat them as falsy)
        if (actualValue === 0) return "0";
        return actualValue?.toString() || '';
      case 'price':
        if (!actualValue) return <span className='text-muted-foreground italic'>No price</span>
        try {
          const { amount, currency } = actualValue as any
          return `${amount} ${currency}`
        } catch {
          return actualValue as string
        }
      case 'measurement':
        if (!actualValue) return <span className='text-muted-foreground italic'>No measurement</span>
        try {
          const { amount, unit } = actualValue as any
          return `${amount} ${unit || ''}`
        } catch {
          return actualValue as string
        }
      case 'url':
      case 'email':
      case 'phone':
        return (
          <a href={attribute.data_type === 'url' ? (actualValue as string) : undefined} target='_blank' rel='noopener noreferrer' className='text-primary underline'>
            {actualValue as string}
          </a>
        )
      case 'rich_text':
        return <div dangerouslySetInnerHTML={{ __html: actualValue as string }} />
      case 'media':
        // Expecting object { asset_id }
        if (!actualValue) return <span className='text-muted-foreground italic'>No media</span>
        try {
          const { asset_id } = actualValue as any
          return `Asset #${asset_id}`
        } catch {
          return actualValue as string
        }
      default:
        // Text
        return actualValue as string || '';
    }
  };
  
  // Render locale and channel selectors
  const renderLocaleChannelSelectors = () => {
    const { locales, channels } = useOrgSettings()
    
    if (!attribute.is_localisable && !attribute.is_scopable) return null;
    
    return (
      <div className="flex space-x-2">
        {attribute.is_localisable && (
          <div className="flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <Select
              value={localLocale}
              onValueChange={setLocalLocale}
              disabled={savingState === 'saving'}
            >
              <SelectTrigger className="h-7 w-[120px]">
                <SelectValue placeholder="Locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">All locales</SelectItem>
                {locales.map(locale => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {attribute.is_scopable && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5" />
              Channel
            </label>
            <Select 
              value={localChannel || "default"}
              onValueChange={setLocalChannel}
              disabled={savingState === 'saving'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">All channels</SelectItem>
                {channels.map(channel => (
                  <SelectItem key={channel.code} value={channel.code}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };
  
  const valueLocaleChannel = () => {
    const { locales, channels } = useOrgSettings()
    
    if (!value) return null;
    
    if (!value.locale && !value.channel) return null;
    
    return (
      <>
        {value.locale
          ? locales.find(l => l.code === value.locale)?.label || value.locale
          : attribute.is_localisable ? 'All locales' : selectedLocale === 'default' ? 'Default locale' : locales.find(l => l.code === selectedLocale)?.label || selectedLocale}
        {value.channel && attribute.is_scopable ? ` / ${channels.find(c => c.code === value.channel)?.label || value.channel}` : ''}
      </>
    );
  };
  
  return (
    <div className={`p-4 border rounded-md transition-all duration-200 ${isEditable ? 'border-primary shadow-sm bg-primary/5' : 'hover:border-slate-300'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{attribute.label}</span>
          
          {/* Data type indicator */}
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
            {(() => {
              switch (attribute.data_type) {
                case 'text': return attributeConfig.labels.dataTypes.text;
                case 'number': return attributeConfig.labels.dataTypes.number;
                case 'date': return attributeConfig.labels.dataTypes.date;
                case 'boolean': return attributeConfig.labels.dataTypes.boolean;
                case 'select': return attributeConfig.labels.dataTypes.select;
                case 'multiselect': return attributeConfig.labels.dataTypes.multiselect;
                case 'price': return attributeConfig.labels.dataTypes.price;
                case 'measurement': return attributeConfig.labels.dataTypes.measurement;
                case 'media': return attributeConfig.labels.dataTypes.media;
                case 'rich_text': return attributeConfig.labels.dataTypes.rich_text;
                case 'url': return attributeConfig.labels.dataTypes.url;
                case 'email': return attributeConfig.labels.dataTypes.email;
                case 'phone': return attributeConfig.labels.dataTypes.phone;
                default: return attribute.data_type;
              }
            })()}
          </Badge>
          
          {/* Group indicator if provided */}
          {groupName && (
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              <LayoutGrid className="w-3 h-3 mr-1" />
              {groupName}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isEditable ? (
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onCancel(attribute.id)}
                disabled={savingState === 'saving'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : isStaff ? (
            <div className="flex items-center gap-1">
              {/* Only show the trash button if there's a value to remove or we're in settings context */}
              {onRemove && (
                (value && value.value !== null && value.value !== undefined) || isSettingsContext ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onRemove}
                          className="text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="max-w-[280px] text-xs">
                        {isSettingsContext 
                          ? attributeConfig.tooltips.deleteWarning
                          : attributeConfig.tooltips.delete}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null
              )}
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(attribute.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="text-xs">
                    {attributeConfig.tooltips.edit}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Context information bar showing locale and channel */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Globe className="w-3 h-3 mr-1 text-blue-500" />
                  <span>
                    {valueLocaleChannel()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {attribute.is_localisable 
                  ? attributeConfig.tooltips.localisable
                  : attributeConfig.tooltips.nonLocalisable}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <span className="text-slate-300">|</span>
        
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Monitor className="w-3 h-3 mr-1 text-purple-500" />
                  <span>
                    {(() => {
                      const { channels } = useOrgSettings();
                      if (!value?.channel) return attribute.is_scopable ? 'All channels' : selectedChannel === 'default' ? 'Default channel' : channels.find(ch => ch.code === selectedChannel)?.name || selectedChannel;
                      
                      const channelLabel = channels.find(ch => ch.code === value.channel)?.name;
                      return channelLabel || value.channel;
                    })()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {attribute.is_scopable 
                  ? attributeConfig.tooltips.scopable
                  : attributeConfig.tooltips.nonScopable}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Show attribute code for technical users */}
        <span className="text-slate-300">|</span>
        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{attribute.code}</code>
      </div>
      
      <div className="space-y-4">
        {isEditable && renderLocaleChannelSelectors()}
        
        <div className="relative">
          <div className={value?.value === null || value?.value === undefined ? 'opacity-60' : ''}>
            {isEditable ? renderAttributeEditor() : renderValue()}
          </div>
          {renderSavingState()}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AttributeValueRow); 