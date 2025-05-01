import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { useAuth } from '@/contexts/AuthContext';
import { debounce } from 'lodash';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';

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
  LayersIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AttributeGroupItem {
  id: number;
  attribute: number;
  order: number;
  value?: any;
  locale?: string;
  channel?: string;
}

interface AttributeGroup {
  id: number;
  name: string;
  order: number;
  items: AttributeGroupItem[];
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
  const [selectedGroupTab, setSelectedGroupTab] = useState<string | null>(null);
  
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
  
  // Load attribute groups
  const { 
    data: attributeGroups, 
    isLoading: isLoadingGroups,
    error: groupsError
  } = useQuery({
    queryKey: ['attributeGroups', productId, selectedLocale, selectedChannel],
    queryFn: async () => {
      const response = await axiosInstance.get(paths.products.groups(productId), {
        headers: {
          'Accept': 'application/json'
        },
        params: {
          locale: selectedLocale,
          channel: selectedChannel
        }
      });
      return response.data;
    },
    enabled: ENABLE_ATTRIBUTE_GROUPS && !!productId,
  });
  
  // Once groups are loaded, set the first group as the selected tab
  useEffect(() => {
    if (attributeGroups && attributeGroups.length > 0 && selectedGroupTab === null) {
      setSelectedGroupTab(attributeGroups[0].id.toString());
    }
  }, [attributeGroups, selectedGroupTab]);
  
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
    enabled: ENABLE_CUSTOM_ATTRIBUTES && !!productId && !ENABLE_ATTRIBUTE_GROUPS,
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
  
  // Process attribute groups into values when they change
  useEffect(() => {
    if (!attributeGroups || !ENABLE_ATTRIBUTE_GROUPS) return;
    
    // Create a map of attribute ID to value
    const valueMap: Record<number, any> = {};
    
    attributeGroups.forEach((group: AttributeGroup) => {
      group.items.forEach((item: AttributeGroupItem) => {
        if (item.value !== undefined) {
          valueMap[item.attribute] = {
            id: item.id,
            attribute: item.attribute,
            value: item.value,
            locale: item.locale || selectedLocale,
            channel: item.channel || selectedChannel
          };
        }
      });
    });
    
    setAttributeValues(valueMap);
  }, [attributeGroups, selectedLocale, selectedChannel]);
  
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
      // Invalidate both attribute values and attribute groups queries
      queryClient.invalidateQueries({ queryKey: ['attributeValues', productId] });
      if (ENABLE_ATTRIBUTE_GROUPS) {
        queryClient.invalidateQueries({ queryKey: ['attributeGroups', productId] });
      }
      
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
      // Invalidate both attribute values and attribute groups queries
      queryClient.invalidateQueries({ queryKey: ['attributeValues', productId] });
      if (ENABLE_ATTRIBUTE_GROUPS) {
        queryClient.invalidateQueries({ queryKey: ['attributeGroups', productId] });
      }
      
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
  
  // Find attribute by ID
  const findAttributeById = (id: number) => {
    return attributes?.find(attr => attr.id === id);
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
            onChange={(e) => handleInputChange(parseFloat(e.target.value))}
            disabled={isDisabled}
            placeholder={`Enter ${attribute.label}`}
          />
        );
        
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(currentValue)}
              onCheckedChange={handleInputChange}
              disabled={isDisabled}
            />
            <span className="text-sm text-enterprise-600">
              {Boolean(currentValue) ? 'Yes' : 'No'}
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
                  className={`w-full justify-start text-left font-normal ${!currentValue ? 'text-muted-foreground' : ''}`}
                  disabled={isDisabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentValue ? format(new Date(currentValue), 'PPP') : `Select ${attribute.label}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={currentValue ? new Date(currentValue) : undefined}
                  onSelect={(date) => handleInputChange(date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
        
      case 'select':
        // This is a mock select for now, would be populated from attribute options in a real app
        return (
          <Select
            value={currentValue || ''}
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
  
  // Render saving state indicator
  const renderSavingState = (attributeId: number) => {
    const saveState = savingStates[attributeId] || 'idle';
    
    switch (saveState) {
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

  // Render the attribute groups as tabs
  const renderAttributeGroupsTabs = () => {
    if (!attributeGroups || attributeGroups.length === 0) {
      return (
        <div className="py-6 text-center text-enterprise-500">
          <LayersIcon className="mx-auto h-8 w-8 text-enterprise-300 mb-2" />
          <p>No attribute groups found.</p>
          <p className="text-sm mt-1">Contact your administrator to set up attribute groups.</p>
        </div>
      );
    }

    return (
      <Tabs 
        value={selectedGroupTab || attributeGroups[0].id.toString()} 
        onValueChange={setSelectedGroupTab}
        className="space-y-4"
      >
        <TabsList className="w-full justify-start">
          {attributeGroups.map((group) => (
            <TabsTrigger 
              key={group.id} 
              value={group.id.toString()}
              className="px-4 py-2"
            >
              {group.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {attributeGroups.map((group) => (
          <TabsContent key={group.id} value={group.id.toString()} className="pt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{group.name}</h3>
                {isStaff && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-8"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Add Attribute
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {group.items.length === 0 ? (
                  <div className="p-6 text-center text-enterprise-500 border rounded-md bg-slate-50">
                    No attributes in this group yet.
                  </div>
                ) : (
                  group.items.map((item) => {
                    const attribute = findAttributeById(item.attribute);
                    if (!attribute) return null;
                    
                    const value = attributeValues[attribute.id];
                    const isEditable = editableAttributeIds[attribute.id];
                    
                    return (
                      <div key={item.id} className="border rounded-md overflow-hidden">
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
                              onClick={() => handleEditAttribute(attribute.id)}
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
                              {renderAttributeEditor(attribute, value, !value)}
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  {renderSavingState(attribute.id)}
                                </div>
                                
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelEdit(attribute.id)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-1.5">
                              {renderAttributeValue(attribute, value)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };
  
  // Render add attribute modal
  const renderAddAttributeModal = () => {
    const unassignedAttributes = getUnassignedAttributes();
    const filteredAttributes = filterAttributesByQuery(unassignedAttributes, searchQuery);
    
    return (
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attribute</DialogTitle>
            <DialogDescription>
              Add a new attribute to your product.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search attributes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <ScrollArea className="h-[300px]">
                <Command>
                  <CommandInput
                    placeholder="Search attributes..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="border-0"
                  />
                  <CommandList>
                    {filteredAttributes.length === 0 ? (
                      <CommandEmpty>No attributes found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredAttributes.map((attribute) => (
                          <CommandItem
                            key={attribute.id}
                            onSelect={() => handleAddAttribute(attribute.id)}
                            className="flex items-center justify-between px-4 py-2 cursor-pointer"
                          >
                            <div>
                              <div className="font-medium">{attribute.label}</div>
                              <div className="text-sm text-enterprise-500">{attribute.code}</div>
                            </div>
                            <Badge variant="outline">{attribute.data_type}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Main render
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Select value={selectedLocale} onValueChange={setSelectedLocale}>
            <SelectTrigger className="w-[140px]">
              <Globe className="w-3.5 h-3.5 mr-2" />
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              {availableLocales.map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[160px]">
              <Languages className="w-3.5 h-3.5 mr-2" />
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {availableChannels.map((channel) => (
                <SelectItem key={channel.code} value={channel.code}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {isStaff && !ENABLE_ATTRIBUTE_GROUPS && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Product Attributes</CardTitle>
          <CardDescription>
            Manage the attributes and specifications of this product.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {(isLoadingAttributes || isLoadingGroups || isLoadingValues) ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : attributesError || groupsError || valuesError ? (
            <div className="flex items-center justify-center text-danger-500 p-8">
              <AlertCircle className="h-6 w-6 mr-2" />
              <p>Failed to load attributes. Please try again later.</p>
            </div>
          ) : ENABLE_ATTRIBUTE_GROUPS ? (
            // Show attribute groups as tabs when enabled
            renderAttributeGroupsTabs()
          ) : attributes?.length === 0 ? (
            <div className="py-6 text-center text-enterprise-500">
              <p>No attributes defined yet.</p>
              {isStaff && (
                <p className="text-sm mt-1">Click "Add Attribute" to get started.</p>
              )}
            </div>
          ) : (
            // Show flat attribute list when attribute groups are disabled
            <div className="space-y-4">
              {attributes.map((attribute) => {
                const value = attributeValues[attribute.id];
                const isEditable = editableAttributeIds[attribute.id];
                
                if (!isEditable && !value) return null;
                
                return (
                  <div key={attribute.id} className="border rounded-md overflow-hidden">
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
                          onClick={() => handleEditAttribute(attribute.id)}
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
                          {renderAttributeEditor(attribute, value, !value)}
                          
                          <div className="flex items-center justify-between">
                            <div>
                              {renderSavingState(attribute.id)}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelEdit(attribute.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1.5">
                          {renderAttributeValue(attribute, value)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {renderAddAttributeModal()}
    </div>
  );
};

export default AttributesTab; 