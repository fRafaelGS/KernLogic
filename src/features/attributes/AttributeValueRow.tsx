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
  isStaff
}) => {
  // Keep a local value for editing
  const [localValue, setLocalValue] = useState<any>(
    isNew ? '' : value?.value
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
    setLocalValue(newValue);
    debouncedSave(newValue);
  }, [debouncedSave]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Manually trigger save
      if (isNew) {
        onSaveNew(attribute.id, localValue);
      } else if (value?.id) {
        onUpdate(value.id, localValue);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel(attribute.id);
    }
  }, [attribute.id, isNew, localValue, onCancel, onSaveNew, onUpdate, value?.id]);
  
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
            placeholder={`Enter ${attribute.label}`}
            onKeyDown={handleKeyDown}
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => handleValueChange(parseFloat(e.target.value))}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label}`}
            onKeyDown={handleKeyDown}
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
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!localValue ? 'text-muted-foreground' : ''}`}
                  disabled={isDisabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localValue ? format(new Date(localValue), 'PPP') : `Select ${attribute.label}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localValue ? new Date(localValue) : undefined}
                  onSelect={(date) => handleValueChange(date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
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
            placeholder={`Enter ${attribute.label}`}
            onKeyDown={handleKeyDown}
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
  
  // Render attribute value display
  const renderAttributeValue = () => {
    if (!value) return <span className="text-enterprise-400 italic">Not set</span>;
    
    const displayValue = value.value;
    
    switch (attribute.data_type) {
      case 'text':
        return <span>{displayValue || ''}</span>;
        
      case 'number':
        return <span>{displayValue || ''}</span>;
        
      case 'boolean':
        return (
          <Badge variant={displayValue ? 'default' : 'outline'}>
            {displayValue ? 'Yes' : 'No'}
          </Badge>
        );
        
      case 'date':
        return displayValue ? (
          <span>{format(new Date(displayValue), 'PPP')}</span>
        ) : (
          <span className="text-enterprise-400 italic">Not set</span>
        );
        
      case 'select':
        return <Badge variant="outline">{displayValue || ''}</Badge>;
        
      default:
        return <span>{displayValue || ''}</span>;
    }
  };
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
        <div>
          <span className="font-medium">{attribute.label}</span>
          <Badge variant="outline" className="ml-2 text-xs">
            {attribute.data_type}
          </Badge>
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
              </div>
            </div>
          </div>
        ) : (
          <div className="py-1.5">
            {renderAttributeValue()}
          </div>
        )}
      </div>
    </div>
  );
};

// Missing import for Edit icon and CalendarIcon
import { Edit, Calendar as CalendarIcon } from 'lucide-react';

export default React.memo(AttributeValueRow); 