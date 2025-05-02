import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { Edit, Calendar as CalendarIcon, Globe, Monitor } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onSaveNew: (attributeId: number, value: any, locale?: string, channel?: string) => void;
  onUpdate: (valueId: number, value: any, locale?: string, channel?: string) => void;
  savingState: SavingState;
  isStaff: boolean;
  availableLocales?: Array<{ code: string, label: string }>;
  availableChannels?: Array<{ code: string, label: string }>;
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
  availableChannels = []
}) => {
  // Keep a local value for editing
  const [localValue, setLocalValue] = useState<any>(
    isNew ? '' : value?.value
  );
  
  // Add state for locale and channel
  const [localLocale, setLocalLocale] = useState<string | null>(
    isNew ? null : value?.locale || null
  );
  
  const [localChannel, setLocalChannel] = useState<string | null>(
    isNew ? null : value?.channel || null
  );
  
  // Use debounced callback for saving
  const debouncedSave = useDebouncedCallback((newValue: any) => {
    if (isNew) {
      onSaveNew(attribute.id, newValue, localLocale, localChannel);
    } else if (value?.id) {
      onUpdate(value.id, newValue, localLocale, localChannel);
    }
  }, 800);
  
  // Handle value change
  const handleValueChange = useCallback((newValue: any) => {
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [debouncedSave]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Manually trigger save
      if (isNew) {
        onSaveNew(attribute.id, localValue, localLocale, localChannel);
      } else if (value?.id) {
        onUpdate(value.id, localValue, localLocale, localChannel);
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
                    console.log("Selected date:", date);
                    const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;
                    console.log("Formatted date:", formattedDate);
                    handleValueChange(formattedDate);
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
              value={localLocale || ""}
              onValueChange={setLocalLocale}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All locales</SelectItem>
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
              value={localChannel || ""}
              onValueChange={setLocalChannel}
              disabled={isDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All channels</SelectItem>
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
    <div className="border rounded-md overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-medium">{attribute.label}</span>
          <Badge variant="outline" className="ml-2 text-xs">
            {attribute.data_type}
          </Badge>
          
          {/* Display badges for locale and channel when not editing */}
          {!isEditable && (
            <>
              {value?.locale && (
                <Badge variant="outline" className="ml-2 text-xs bg-blue-50">
                  <Globe className="h-3 w-3 mr-1" />
                  {value.locale || 'All'}
                </Badge>
              )}
              {value?.channel && (
                <Badge variant="outline" className="ml-2 text-xs bg-purple-50">
                  <Monitor className="h-3 w-3 mr-1" />
                  {value.channel || 'All'}
                </Badge>
              )}
            </>
          )}
        </div>
        
        {isStaff && !isEditable && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(attribute.id)}
            className="h-7 px-2"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
      </div>
      
      <div className="p-4">
        {isEditable ? (
          <div className="space-y-4">
            {/* Add locale/channel selectors */}
            {renderLocaleChannelSelectors()}
            
            {renderAttributeEditor()}
            
            <div className="flex items-center justify-between">
              <div>
                {renderSavingState()}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(attribute.id)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={savingState === 'saving'}
                  onClick={() => {
                    if (isNew) {
                      onSaveNew(attribute.id, localValue, localLocale, localChannel);
                    } else if (value?.id) {
                      onUpdate(value.id, localValue, localLocale, localChannel);
                    }
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-1.5">
            {renderValue()}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AttributeValueRow); 