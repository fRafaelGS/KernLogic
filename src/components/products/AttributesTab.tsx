import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { useAuth } from '@/contexts/AuthContext';
import { debounce } from 'lodash';
import { ENABLE_CUSTOM_ATTRIBUTES } from '@/config/featureFlags';

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PlusCircle,
  X,
  CheckCircle2,
  AlertCircle,
  CircleAlert,
  Loader2,
  CalendarIcon,
  Calendar as CalendarIcon2, 
  Languages,
  Globe,
  Check,
  Edit,
  Save,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface Attribute {
  id: number;
  code: string;
  label: string;
  data_type: string;
  is_localisable: boolean;
  is_scopable: boolean;
  organization: number;
  created_by: number;
}

interface AttributeValue {
  id: number;
  locale: string;
  channel: string;
  value: any;
  attribute: number;
  product: number;
  organization: number;
}

interface AttributesTabProps {
  productId: number;
}

const AttributesTab: React.FC<AttributesTabProps> = ({ productId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = (user as any)?.is_staff || false;
  
  // State
  const [selectedLocale, setSelectedLocale] = useState('en_US');
  const [selectedChannel, setSelectedChannel] = useState('ecommerce');
  const [availableLocales, setAvailableLocales] = useState([
    { code: 'en_US', label: 'English (US)' },
    { code: 'fr_FR', label: 'French' },
    { code: 'es_ES', label: 'Spanish' },
    { code: 'de_DE', label: 'German' },
    { code: 'it_IT', label: 'Italian' },
  ]);
  const [availableChannels, setAvailableChannels] = useState([
    { code: 'ecommerce', label: 'E-commerce' },
    { code: 'mobile', label: 'Mobile App' },
    { code: 'pos', label: 'Point of Sale' },
    { code: 'marketplace', label: 'Marketplace' },
  ]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editableAttributeIds, setEditableAttributeIds] = useState<Record<number, boolean>>({});
  const [attributeValues, setAttributeValues] = useState<Record<number, any>>({});
  const [savingStates, setSavingStates] = useState<Record<number, 'idle' | 'saving' | 'saved' | 'error'>>({});
  
  // Load attributes
  const { 
    data: attributes, 
    isLoading: isLoadingAttributes,
    error: attributesError
  } = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const response = await axiosInstance.get(paths.attributes.root(), {
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.data;
    },
    enabled: ENABLE_CUSTOM_ATTRIBUTES,
  });
  
  // Filter attributes that haven't been assigned yet
  const getUnassignedAttributes = () => {
    if (!attributes || !attributeValues) return [];
    
    return attributes.filter(attr => 
      !attributeValues[attr.id] && 
      !Object.keys(editableAttributeIds).includes(attr.id.toString())
    );
  };
  
  // Filter attributes by search query
  const filterAttributesByQuery = (attrs: Attribute[], query: string) => {
    if (!query.trim()) return attrs;
    
    const lowerQuery = query.toLowerCase();
    return attrs.filter(attr => 
      attr.code.toLowerCase().includes(lowerQuery) || 
      attr.label.toLowerCase().includes(lowerQuery)
    );
  };
  
  // Load attribute values for this product
  const { 
    data: values, 
    isLoading: isLoadingValues,
    error: valuesError
  } = useQuery({
    queryKey: ['attributeValues', productId, selectedLocale, selectedChannel],
    queryFn: async () => {
      const response = await axiosInstance.get(paths.products.attributes(productId), {
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.data;
    },
    enabled: ENABLE_CUSTOM_ATTRIBUTES && !!productId,
  });
  
  // Process values when they change
  useEffect(() => {
    if (!values) return;
    
    // Create a map of attribute ID to value
    const valueMap: Record<number, any> = {};
    const filteredValues = values.filter((value: AttributeValue) => 
      value.locale === selectedLocale && value.channel === selectedChannel
    );
    
    filteredValues.forEach((value: AttributeValue) => {
      valueMap[value.attribute] = {
        ...value
      };
    });
    
    setAttributeValues(valueMap);
  }, [values, selectedLocale, selectedChannel]);
  
  // Create attribute value mutation
  const createAttributeValueMutation = useMutation({
    mutationFn: async ({ attributeId, value }: { attributeId: number, value: any }) => {
      // Add staff gate - return early if not staff
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      // Determine if we should send locale/channel
      const attribute = attributes?.find(attr => attr.id === attributeId);
      const payload: any = {
        attribute: attributeId,
        value,
      };
      
      // Only include locale if the attribute is localisable
      if (attribute?.is_localisable) {
        payload.locale = selectedLocale;
      } else {
        payload.locale = null;
      }
      
      // Only include channel if the attribute is scopable
      if (attribute?.is_scopable) {
        payload.channel = selectedChannel;
      } else {
        payload.channel = null;
      }
      
      const response = await axiosInstance.post(paths.products.attributes(productId), payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attributeValues', productId] });
      
      // Set saving state to 'saved' momentarily using functional updater
      setSavingStates(prev => ({
        ...prev,
        [data.attribute]: 'saved'
      }));
      
      // Reset saving state after a delay
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [data.attribute]: 'idle'
        }));
      }, 2000);
      
      // Reset editable state
      setEditableAttributeIds(prev => {
        const newState = { ...prev };
        delete newState[data.attribute];
        return newState;
      });
    },
    onError: (error: any, variables) => {
      console.error('Error creating attribute value:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save attribute value';
      toast.error(errorMessage);
      
      // Set saving state to 'error' using functional updater
      setSavingStates(prev => ({
        ...prev,
        [variables.attributeId]: 'error'
      }));
    }
  });
  
  // Update attribute value mutation
  const updateAttributeValueMutation = useMutation({
    mutationFn: async ({ valueId, value }: { valueId: number, value: any }) => {
      // Add staff gate - return early if not staff
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      const response = await axiosInstance.patch(paths.products.attributeValue(productId, valueId), {
        value
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attributeValues', productId] });
      
      // Set saving state to 'saved' momentarily using functional updater
      setSavingStates(prev => ({
        ...prev,
        [data.attribute]: 'saved'
      }));
      
      // Reset saving state after a delay
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [data.attribute]: 'idle'
        }));
      }, 2000);
      
      // Reset editable state
      setEditableAttributeIds(prev => {
        const newState = { ...prev };
        delete newState[data.attribute];
        return newState;
      });
    },
    onError: (error: any, variables) => {
      console.error('Error updating attribute value:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute value';
      toast.error(errorMessage);
      
      // Find the attribute ID for this value ID
      const attrId = Object.values(attributeValues).find(
        (val: any) => val.id === variables.valueId
      )?.attribute;
      
      if (attrId) {
        // Set saving state to 'error' using functional updater
        setSavingStates(prev => ({
          ...prev,
          [attrId]: 'error'
        }));
      }
    }
  });
  
  // Handle adding an attribute
  const handleAddAttribute = (attributeId: number) => {
    // Set this attribute as editable
    setEditableAttributeIds(prev => ({
      ...prev,
      [attributeId]: true
    }));
    
    // Close the modal
    setIsAddModalOpen(false);
  };
  
  // Handle making an attribute editable
  const handleEditAttribute = (attributeId: number) => {
    setEditableAttributeIds(prev => ({
      ...prev,
      [attributeId]: true
    }));
  };
  
  // Handle saving a new attribute value
  const handleSaveNewValue = (attributeId: number, value: any) => {
    // Set saving state
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Create the attribute value
    createAttributeValueMutation.mutate({ attributeId, value });
  };
  
  // Handle saving an existing attribute value
  const handleUpdateValue = (valueId: number, value: any) => {
    // Find the attribute ID for this value ID
    const attrId = Object.values(attributeValues).find(
      (val: any) => val.id === valueId
    )?.attribute;
    
    if (attrId) {
      // Set saving state
      setSavingStates(prev => ({
        ...prev,
        [attrId]: 'saving'
      }));
    }
    
    // Update the attribute value
    updateAttributeValueMutation.mutate({ valueId, value });
  };
  
  // Handle value change with debounce
  const debouncedHandleChange = debounce((
    attributeId: number, 
    value: any, 
    isNewValue: boolean,
    valueId?: number
  ) => {
    if (isNewValue) {
      handleSaveNewValue(attributeId, value);
    } else if (valueId) {
      handleUpdateValue(valueId, value);
    }
  }, 800);
  
  // Handle value change
  const handleValueChange = (
    attributeId: number, 
    value: any, 
    isNewValue: boolean = false,
    valueId?: number
  ) => {
    // Update local state immediately for better UX
    if (isNewValue) {
      // This is a new value being created
      setAttributeValues(prev => ({
        ...prev,
        [attributeId]: {
          attribute: attributeId,
          value: value,
          locale: selectedLocale,
          channel: selectedChannel
        }
      }));
    } else {
      // This is an existing value being updated
      setAttributeValues(prev => ({
        ...prev,
        [attributeId]: {
          ...prev[attributeId],
          value: value
        }
      }));
    }
    
    // Set saving state to 'saving'
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Use debounced handler for the API call
    debouncedHandleChange(attributeId, value, isNewValue, valueId);
  };
  
  // Handle cancelling edit
  const handleCancelEdit = (attributeId: number) => {
    setEditableAttributeIds(prev => {
      const newState = { ...prev };
      delete newState[attributeId];
      return newState;
    });
    
    // Reset saving state
    setSavingStates(prev => {
      const newState = { ...prev };
      delete newState[attributeId];
      return newState;
    });
    
    // If this is a new attribute and value doesn't exist yet, remove it from the list
    if (!attributeValues[attributeId]) {
      setAttributeValues(prev => {
        const newState = { ...prev };
        delete newState[attributeId];
        return newState;
      });
    }
  };
  
  // Render attribute value editor based on attribute type
  const renderAttributeEditor = (attribute: Attribute, value: any, isNew: boolean = false) => {
    const saveState = savingStates[attribute.id] || 'idle';
    const isDisabled = saveState === 'saving';
    const currentValue = isNew ? '' : value?.value;
    
    const handleInputChange = (newValue: any) => {
      handleValueChange(
        attribute.id, 
        newValue, 
        isNew, 
        isNew ? undefined : value?.id
      );
    };
    
    switch (attribute.data_type) {
      case 'text':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label}`}
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => {
              // Proper number handling - send null instead of NaN
              const value = e.target.value === '' ? null : e.target.valueAsNumber;
              handleInputChange(isNaN(value) ? null : value);
            }}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label}`}
          />
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!currentValue}
              onCheckedChange={handleInputChange}
              disabled={isDisabled}
            />
            <span className="text-sm text-slate-500">
              {!!currentValue ? 'Yes' : 'No'}
            </span>
          </div>
        );
        
      case 'select':
        return (
          <Select
            value={String(currentValue || '')}
            onValueChange={handleInputChange}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${attribute.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        );
        
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={isDisabled}
              >
                <CalendarIcon2 className="mr-2 h-4 w-4" />
                {currentValue ? 
                  format(new Date(currentValue), 'yyyy-MM-dd') : 
                  <span className="text-slate-500">Select date</span>
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentValue ? new Date(currentValue) : undefined}
                onSelect={(date) => handleInputChange(date ? format(date, 'yyyy-MM-dd') : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
        
      default:
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label}`}
          />
        );
    }
  };
  
  // Render attribute value display
  const renderAttributeValue = (attribute: Attribute, value: any) => {
    if (!value) return <span className="text-slate-400">—</span>;
    
    const currentValue = value.value;
    
    switch (attribute.data_type) {
      case 'boolean':
        return currentValue ? 
          <Badge variant="outline" className="bg-success-50 text-success-700 border-success-200">Yes</Badge> : 
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">No</Badge>;
        
      case 'date':
        return currentValue ? 
          format(new Date(currentValue), 'PP') : 
          <span className="text-slate-400">—</span>;
        
      default:
        return currentValue || <span className="text-slate-400">—</span>;
    }
  };
  
  // Render saving state indicator
  const renderSavingState = (attributeId: number) => {
    const state = savingStates[attributeId] || 'idle';
    
    switch (state) {
      case 'saving':
        return (
          <div className="flex items-center text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs">Saving...</span>
          </div>
        );
        
      case 'saved':
        return (
          <div className="flex items-center text-success-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            <span className="text-xs">Saved</span>
          </div>
        );
        
      case 'error':
        return (
          <div className="flex items-center text-danger-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            <span className="text-xs">Error</span>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Render add attribute modal
  const renderAddAttributeModal = () => {
    const unassignedAttributes = getUnassignedAttributes();
    const filteredAttributes = filterAttributesByQuery(unassignedAttributes, searchQuery);
    
    return (
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Attribute</DialogTitle>
            <DialogDescription>
              Select an attribute to add to this product
            </DialogDescription>
          </DialogHeader>
          
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              placeholder="Search attributes..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No attributes found.</CommandEmpty>
              {filteredAttributes.length === 0 && !searchQuery ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  All available attributes have been added to this product.
                </div>
              ) : (
                <CommandGroup>
                  {filteredAttributes.map((attr) => (
                    <CommandItem
                      key={attr.id}
                      onSelect={() => handleAddAttribute(attr.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{attr.label}</span>
                        <span className="text-xs text-slate-500">{attr.code} • {attr.data_type}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Group attributes by data type
  const attributesByType = React.useMemo(() => {
    if (!attributes || !Array.isArray(attributes)) return {};
    
    return attributes.reduce((acc: Record<string, Attribute[]>, attr: Attribute) => {
      if (!acc[attr.data_type]) {
        acc[attr.data_type] = [];
      }
      
      // Check if this attribute has a value or is being edited
      const hasValueOrEditable = attributeValues[attr.id] || editableAttributeIds[attr.id];
      
      if (hasValueOrEditable) {
        acc[attr.data_type].push(attr);
      }
      
      return acc;
    }, {});
  }, [attributes, attributeValues, editableAttributeIds]);
  
  // Determine if there are any attributes with values
  const hasAttributeValues = React.useMemo(() => {
    return Object.keys(attributesByType).length > 0;
  }, [attributesByType]);
  
  // Add debounce cleanup with useEffect
  useEffect(() => {
    // Cleanup function for debounced handlers
    return () => {
      debouncedHandleChange.cancel();
    };
  }, [debouncedHandleChange]);
  
  // If feature flag is disabled, don't render the component
  if (!ENABLE_CUSTOM_ATTRIBUTES) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Product Attributes</CardTitle>
          <CardDescription>
            View and manage attributes for this product
          </CardDescription>
        </div>
        
        <div className="flex space-x-4">
          {/* Context Selector */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="locale" className="text-xs flex items-center">
              <Languages className="h-3 w-3 mr-1" /> Locale:
            </Label>
            <Select
              value={selectedLocale}
              onValueChange={setSelectedLocale}
            >
              <SelectTrigger id="locale" className="h-8 w-[110px]">
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                {availableLocales.map(locale => (
                  <SelectItem key={locale.code} value={locale.code}>
                    {locale.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="channel" className="text-xs flex items-center">
              <Globe className="h-3 w-3 mr-1" /> Channel:
            </Label>
            <Select
              value={selectedChannel}
              onValueChange={setSelectedChannel}
            >
              <SelectTrigger id="channel" className="h-8 w-[130px]">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {availableChannels.map(channel => (
                  <SelectItem key={channel.code} value={channel.code}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {(isLoadingAttributes || isLoadingValues) ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : attributesError || valuesError ? (
          <div className="flex items-center justify-center text-danger-500 p-8">
            <AlertCircle className="h-6 w-6 mr-2" />
            <p>Failed to load attributes. Please try again.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action buttons */}
            <div className="flex justify-end">
              {isStaff && renderAddAttributeModal()}
            </div>
            
            {/* No attributes message */}
            {!hasAttributeValues && (
              <div className="border rounded-md p-8 text-center text-slate-500">
                <p className="mb-4">No attributes have been added to this product yet.</p>
                {isStaff && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Your First Attribute
                  </Button>
                )}
              </div>
            )}
            
            {/* Attribute groups by data type */}
            {Object.entries(attributesByType).map(([dataType, attrs]) => (
              <div key={dataType} className="space-y-3">
                <h3 className="font-medium capitalize flex items-center text-sm">
                  {dataType} Attributes
                  <Badge variant="outline" className="ml-2 text-xs">
                    {(attrs as any[]).length}
                  </Badge>
                </h3>
                
                <div className="space-y-2">
                  {(attrs as any[]).map(attr => {
                    const isEditable = !!editableAttributeIds[attr.id];
                    const currentValue = attributeValues[attr.id];
                    const isNewValue = !currentValue?.id;
                    
                    return (
                      <div 
                        key={attr.id} 
                        className="border rounded-md p-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm flex items-center">
                              {attr.label}
                              {attr.is_localisable && (
                                <Badge variant="outline" className="ml-2 px-1 py-0 h-4 text-[10px]">
                                  <Languages className="h-2.5 w-2.5 mr-1" />
                                  Localisable
                                </Badge>
                              )}
                              {attr.is_scopable && (
                                <Badge variant="outline" className="ml-2 px-1 py-0 h-4 text-[10px]">
                                  <Globe className="h-2.5 w-2.5 mr-1" />
                                  Scopable
                                </Badge>
                              )}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {attr.code}
                            </p>
                          </div>
                          
                          {isStaff && !isEditable && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditAttribute(attr.id)}
                              className="h-8 px-2"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              <span className="text-xs">Edit</span>
                            </Button>
                          )}
                          
                          {isEditable && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancelEdit(attr.id)}
                                className="h-8 px-2 text-danger-500 hover:text-danger-600 hover:bg-danger-50"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs">Cancel</span>
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          {isEditable ? (
                            <div className="space-y-1">
                              {renderAttributeEditor(attr, currentValue, isNewValue)}
                              <div className="h-5">
                                {renderSavingState(attr.id)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              {renderAttributeValue(attr, currentValue)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttributesTab; 