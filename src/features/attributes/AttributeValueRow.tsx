import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, X, Loader2, CheckCircle2, AlertCircle, Trash2, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Edit, Calendar as CalendarIcon, Globe, Monitor } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  availableLocales?: Array<{ code: string, label: string }>;
  availableChannels?: Array<{ code: string, label: string }>;
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
  availableLocales = [],
  availableChannels = [],
  onRemove,
  isSettingsContext = false,
  groupName = "",
  selectedLocale = "default",
  selectedChannel = "default"
}) => {
  // Keep a local value for editing
  const [localValue, setLocalValue] = useState<any>(
    isNew ? '' : value?.value
  );
  
  // Add state for locale and channel
  const [localLocale, setLocalLocale] = useState<string>(
    isNew ? "default" : (value?.locale || "default")
  );
  
  const [localChannel, setLocalChannel] = useState<string>(
    isNew ? "default" : (value?.channel || "default")
  );
  
  // Use debounced callback for saving
  const debouncedSave = useDebouncedCallback((newValue: any) => {
    if (isNew) {
      onSaveNew(attribute.id, newValue);
    } else if (value?.id) {
      onUpdate(value.id, newValue);
    }
  }, 800);
  
  // Handle value change
  const handleValueChange = useCallback((newValue: any) => {
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
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label} (press Enter to save)`}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => handleValueChange(parseFloat(e.target.value))}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label} (press Enter to save)`}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(localValue)}
              onCheckedChange={handleValueChange}
              disabled={isDisabled}
            />
            <span className="text-sm text-enterprise-600">
              {Boolean(localValue) ? 'Yes' : 'No'}
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
                  {localValue ? format(new Date(localValue), 'PPP') : `Select ${attribute.label}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localValue ? new Date(localValue) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Format date to ISO string (YYYY-MM-DD)
                      const formattedDate = format(date, 'yyyy-MM-dd');
                      console.log("Selected date:", date, "Formatted:", formattedDate);
                      handleValueChange(formattedDate);
                    } else {
                      handleValueChange(null);
                    }
                  }}
                  initialFocus
                  disabled={isDisabled}
                />
              </PopoverContent>
            </Popover>
          </div>
        );
        
      default:
        return (
          <Input
            value={localValue || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label} (press Enter to save)`}
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
    
    // Extract the actual value from the AttributeValue object if needed
    const actualValue = typeof value === 'object' && value !== null && 'value' in value 
      ? value.value 
      : value;
    
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
      default:
        // Text
        return actualValue as string || '';
    }
  };
  
  // Render locale and channel selectors
  const renderLocaleChannelSelectors = () => {
    const isDisabled = savingState === 'saving';
    
    return (
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Locale selector - only show if attribute is localisable */}
        {attribute.is_localisable && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              Locale
            </label>
            <Select
              value={localLocale || "default"}
              onValueChange={setLocalLocale}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">All locales</SelectItem>
                {availableLocales.map(locale => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Channel selector - only show if attribute is scopable */}
        {attribute.is_scopable && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Monitor className="h-3.5 w-3.5" />
              Channel
            </label>
            <Select 
              value={localChannel || "default"}
              onValueChange={setLocalChannel}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">All channels</SelectItem>
                {availableChannels.map(channel => (
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
  
  return (
    <div className={`p-4 border rounded-md transition-all duration-200 ${isEditable ? 'border-primary shadow-sm bg-primary/5' : 'hover:border-slate-300'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{attribute.label}</span>
          
          {/* Data type indicator */}
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
            {attribute.data_type === 'text' && 'Text'}
            {attribute.data_type === 'number' && 'Number'}
            {attribute.data_type === 'date' && 'Date'}
            {attribute.data_type === 'boolean' && 'Boolean'}
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
                          ? 'Remove this attribute from the group. This will not delete the attribute itself.' 
                          : 'Remove this value from the product. This will only affect this specific product.'}
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
                    Edit this attribute value
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
                    {value?.locale 
                      ? availableLocales.find(l => l.code === value.locale)?.label || value.locale
                      : attribute.is_localisable ? 'All locales' : selectedLocale === 'default' ? 'Default locale' : availableLocales.find(l => l.code === selectedLocale)?.label || selectedLocale}
                  </span>
                  {attribute.is_localisable && (
                    <Badge variant="outline" className="ml-1 h-4 px-1 bg-blue-50 border-blue-200">
                      <span className="text-[9px]">Localisable</span>
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {attribute.is_localisable 
                  ? 'This attribute can have different values per language'
                  : 'This attribute has the same value in all languages'}
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
                    {value?.channel 
                      ? availableChannels.find(c => c.code === value.channel)?.label || value.channel
                      : attribute.is_scopable ? 'All channels' : selectedChannel === 'default' ? 'Default channel' : availableChannels.find(c => c.code === selectedChannel)?.label || selectedChannel}
                  </span>
                  {attribute.is_scopable && (
                    <Badge variant="outline" className="ml-1 h-4 px-1 bg-purple-50 border-purple-200">
                      <span className="text-[9px]">Scopable</span>
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {attribute.is_scopable 
                  ? 'This attribute can have different values per sales channel'
                  : 'This attribute has the same value in all sales channels'}
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