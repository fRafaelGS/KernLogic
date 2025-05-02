import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkAttributes, qkAttributeValues, qkAttributeGroups } from '@/lib/queryKeys';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";
import isEqual from 'lodash/isEqual';

// Import refactored components
import {
  LocaleChannelSelector,
  AttributeValueRow,
  AddAttributeModal,
  AttributeGroupTabs,
  Attribute,
  AttributeValue,
  SavingState,
  AttributeGroup
} from '@/features/attributes';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface AttributesTabProps {
  productId: number;
}

// Helper function to generate consistent keys for attribute values
const makeAttrKey = (aId: number, l?: string | null, c?: string | null) => `${aId}::${l || ''}::${c || ''}`;

const AttributesTab: React.FC<AttributesTabProps> = ({ productId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = (user as any)?.is_staff || false;
  
  // State
  const [selectedLocale, setSelectedLocale] = useState('en_US');
  const [selectedChannel, setSelectedChannel] = useState('ecommerce');
  const [availableLocales] = useState([
    { code: 'en_US', label: 'English (US)' },
    { code: 'fr_FR', label: 'French' },
    { code: 'es_ES', label: 'Spanish' },
    { code: 'de_DE', label: 'German' },
    { code: 'it_IT', label: 'Italian' },
  ]);
  const [availableChannels] = useState([
    { code: 'ecommerce', label: 'E-commerce' },
    { code: 'mobile', label: 'Mobile App' },
    { code: 'pos', label: 'Point of Sale' },
    { code: 'marketplace', label: 'Marketplace' },
  ]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
  const [editableAttributeIds, setEditableAttributeIds] = useState<Record<number, boolean>>({});
  const [attributeValues, setAttributeValues] = useState<Record<number, AttributeValue>>({});
  const [savingStates, setSavingStates] = useState<Record<number, SavingState>>({});
  
  // Load attributes (with stable key and staleTime)
  const { 
    data: attributes = [], 
    isLoading: isLoadingAttributes,
    error: attributesError,
    refetch: refetchAttributes
  } = useQuery({
    queryKey: qkAttributes(),
    queryFn: async () => {
      const response = await axiosInstance.get(paths.attributes.root(), {
        headers: { 'Accept': 'application/json' }
      });
      return response.data;
    },
    staleTime: 60_000, // 1 minute - attributes rarely change
    enabled: ENABLE_CUSTOM_ATTRIBUTES,
  });
  
  // Load attribute groups
  const { 
    data: attributeGroups = [], 
    isLoading: isLoadingGroups,
    error: groupsError
  } = useQuery({
    queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel),
    queryFn: async () => {
      const response = await axiosInstance.get(paths.products.groups(productId), {
        headers: { 'Accept': 'application/json' },
        params: { locale: selectedLocale, channel: selectedChannel }
      });
      return response.data;
    },
    enabled: ENABLE_ATTRIBUTE_GROUPS && !!productId,
  });
  
  // Load attribute values when not using groups
  const { 
    data: values, 
    isLoading: isLoadingValues,
    error: valuesError
  } = useQuery({
    queryKey: qkAttributeValues(productId, selectedLocale, selectedChannel),
    queryFn: async () => {
      const response = await axiosInstance.get(paths.products.attributes(productId), {
        headers: { 'Accept': 'application/json' },
        params: { locale: selectedLocale, channel: selectedChannel }
      });
      return response.data;
    },
    enabled: ENABLE_CUSTOM_ATTRIBUTES && !!productId && !ENABLE_ATTRIBUTE_GROUPS,
  });
  
  // Process values when they change
  React.useEffect(() => {
    if (!values) return;
    
    // Create a map of attribute ID to value
    const valueMap: Record<number, AttributeValue> = {};
    const filteredValues = values.filter((value: AttributeValue) => 
      value.locale === selectedLocale && value.channel === selectedChannel
    );
    
    filteredValues.forEach((value: AttributeValue) => {
      valueMap[value.attribute] = value;
    });
    
    if (!isEqual(attributeValues, valueMap)) {
      setAttributeValues(valueMap);
    }
  }, [values, selectedLocale, selectedChannel]);
  
  // Process attribute groups into values when they change
  React.useEffect(() => {
    if (!attributeGroups || !ENABLE_ATTRIBUTE_GROUPS) return;
    
    console.log('Processing attribute groups:', attributeGroups);
    
    // Create a map of attribute ID to value from API response
    const apiMap: Record<string, AttributeValue> = {};
    attributeGroups.forEach((group: AttributeGroup) => {
      group.items.forEach((item: any) => {
        console.log('Processing group item:', item);
        // Make sure to handle both the direct value and value_id fields that come from the API
        if (item.value !== undefined) {
          // Convert 0 to a number to ensure it's treated as a valid value
          let displayValue = item.value;
          
          // Find the attribute definition to convert value to the right type if needed
          const attribute = attributes.find(a => a.id === item.attribute);
          if (attribute?.data_type === 'number' && typeof displayValue === 'string') {
            displayValue = parseFloat(displayValue) || 0;
          } else if (attribute?.data_type === 'boolean' && typeof displayValue === 'string') {
            displayValue = displayValue.toLowerCase() === 'true';
          }
          
          const key = makeAttrKey(item.attribute, item.locale || null, item.channel || null);
          apiMap[key] = {
            id: item.value_id,
            attribute: item.attribute,
            value: displayValue,
            locale: item.locale || null,
            channel: item.channel || selectedChannel
          };
          console.log(`Added value for attribute ${item.attribute}: ${displayValue} (type: ${typeof displayValue})`);
        }
      });
    });

    console.log('API values map:', apiMap);
    
    // Only update if there are actual values
    if (Object.keys(apiMap).length > 0) {
      // Do NOT replace the entire state - merge properly
      setAttributeValues(prev => {
        const mergedMap = { ...prev };
        
        // Merge in the API values
        Object.keys(apiMap).forEach(key => {
          const apiValue = apiMap[key];
          
          // Only update if value doesn't exist or if it's not in "saving" state
          const isSaving = savingStates[apiValue.attribute] === 'saving';
          if (!mergedMap[key] || !isSaving) {
            mergedMap[key] = apiValue;
          }
        });

        console.log('Merged attribute values:', mergedMap);
        return mergedMap;
      });
    }
  }, [attributeGroups, selectedLocale, selectedChannel, attributes, savingStates, makeAttrKey]);
  
  // Helper to get unassigned attributes for the Add modal
  const getUnassignedAttributes = useCallback(() => {
    if (!attributes) return [];
    
    if (ENABLE_ATTRIBUTE_GROUPS) {
      // In group mode we only consider attributes that already have a value.
      // Attributes present in a group but without a value SHOULD be selectable.
      return attributes.filter(attr =>
        !attributeValues[attr.id] &&
        !editableAttributeIds[attr.id]
      );
    }
    
    // In non-groups mode, just check attributeValues
    return attributes.filter(attr => 
      !attributeValues[attr.id] && 
      !editableAttributeIds[attr.id]
    );
  }, [attributes, attributeValues, editableAttributeIds]);
  
  // Create attribute value mutation with optimistic updates
  const createAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      attributeId, 
      value, 
      productId, 
      locale = null, 
      channel = null
    }: { 
      attributeId: number; 
      value: any; 
      productId: number; 
      locale?: string | null;
      channel?: string | null;
    }) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      // Debug the value before sending
      console.log(`Creating attribute value for ${attributeId} with:`, {
        value,
        type: typeof value,
        locale,
        channel,
        productId
      });
      
      // First, check if a value already exists for this combination
      try {
        const attrValues = await axiosInstance.get(paths.products.attributes(productId), {
          headers: { 'Accept': 'application/json' }
        });
        
        // Look for an existing value with the same attribute, locale, and channel
        const existingValue = attrValues.data.find((val: any) => 
          val.attribute === attributeId && 
          val.locale === locale && 
          val.channel === channel
        );
        
        if (existingValue) {
          console.log('Found existing attribute value:', existingValue);
          // If the value already exists and has the same value, just return it
          if (existingValue.value === value) {
            return existingValue;
          }
          
          // If it exists but has a different value, update it
          console.log('Updating existing attribute value with new value');
          const response = await axiosInstance.patch(
            paths.products.attributeValue(productId, existingValue.id),
            { value },
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          );
          return response.data;
        }
      } catch (error) {
        console.warn('Error checking for existing attribute value:', error);
        // Continue with creation attempt even if check fails
      }
      
      // Find attribute definition to format the value correctly
      const attrDef = attributes.find(a => a.id === attributeId);
      console.log('Attribute definition:', attrDef);
      
      // Format value based on data type
      let formattedValue = value;
      if (attrDef?.data_type === 'number' && value !== '') {
        formattedValue = Number(value);
        if (isNaN(formattedValue)) {
          formattedValue = 0;
        }
      } else if (attrDef?.data_type === 'boolean') {
        formattedValue = Boolean(value);
      } else if (value === '') {
        // For empty string values, explicitly set a default based on type
        if (attrDef?.data_type === 'number') {
          formattedValue = 0;
        } else if (attrDef?.data_type === 'boolean') {
          formattedValue = false;
        }
        // For text, empty string is fine
      }
      
      // Format payload
      const data = {
        attribute: attributeId,
        product: productId,
        value: formattedValue,
        locale: locale || null,
        channel: channel || null
      };
      
      console.log("Creating attribute value with final payload:", data);
      
      try {
        // POST request to create attribute value
        const response = await axiosInstance.post(paths.products.attributes(productId), data, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log("API response:", response.data);
        return response.data;
      } catch (error) {
        console.error("API error:", error);
        // Log the error response for debugging
        if (error.response) {
          console.error("Error response:", {
            status: error.response.status,
            data: error.response.data
          });
          
          // If error is a 400 with non_field_errors about uniqueness, find the existing value
          if (error.response.status === 400 && 
             (error.response.data.non_field_errors || 
              error.response.data.detail?.includes('unique'))) {
              
            console.log('Uniqueness error, trying to find the existing value');
            
            // Try to find the existing value again
            const attrValues = await axiosInstance.get(paths.products.attributes(productId), {
              headers: { 'Accept': 'application/json' }
            });
            
            // Look for an existing value with the same attribute, locale, and channel
            const existingValue = attrValues.data.find((val: any) => 
              val.attribute === attributeId && 
              val.locale === locale && 
              val.channel === channel
            );
            
            if (existingValue) {
              console.log('Found existing attribute value after error:', existingValue);
              return existingValue;
            }
          }
        }
        throw error;
      }
    },
    onMutate: async ({ attributeId, value, locale, channel }) => {
      // For optimistic updates
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically update to the new value
      // This is simplified; in a real implementation, you'd update the
      // nested data structure of the specific group and attribute
      
      return { previousData, attributeId, locale, channel };
    },
    onSuccess: (data) => {
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      console.log('Create attribute value success:', data);
      
      // Update attribute values in local state immediately, preserving all existing values
      setAttributeValues(prev => {
        console.log('Previous attribute values:', prev);
        // Create a shallow copy to ensure React detects the change
        const updated = { ...prev };
        // Add the new value without disturbing existing ones
        const key = makeAttrKey(data.attribute, data.locale, data.channel);
        updated[key] = {
          ...data,
          id: data.id,
          attribute: data.attribute,
          value: data.value // Ensure value is set correctly
        };
        console.log('Updated attribute values:', updated);
        return updated;
      });
      
      // Set saving state to 'saved' momentarily
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
      
      // Force refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any, variables, context) => {
      console.error('Error creating attribute value:', error);
      let errorMessage = error.response?.data?.detail || 'Failed to save attribute value';
      
      // If we have a uniqueness error, show a more helpful message
      if (error.response?.status === 400 && 
         (error.response?.data?.non_field_errors || 
          error.response?.data?.detail?.includes('unique'))) {
        errorMessage = 'This attribute value already exists';
      }
      
      toast.error(errorMessage);
      
      // Revert to previous data on error
      if (context) {
        const queryKey = ENABLE_ATTRIBUTE_GROUPS 
          ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
          : qkAttributeValues(productId, selectedLocale, selectedChannel);
          
        queryClient.setQueryData(queryKey, context.previousData);
        
        // Set saving state to 'error'
        setSavingStates(prev => ({
          ...prev,
          [context.attributeId]: 'error'
        }));
      }
    }
  });
  
  // Update attribute value mutation
  const updateAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      valueId, 
      value, 
      productId,
      locale = null,
      channel = null
    }: { 
      valueId: number; 
      value: any; 
      productId: number;
      locale?: string | null;
      channel?: string | null;
    }) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      // Debug the value before sending
      console.log(`Updating attribute value ${valueId} with:`, value);
      
      // Make sure the value is properly formatted based on type
      // Find the attribute value to get the attribute ID
      const attrValue = Object.values(attributeValues).find(
        (val: any) => val.id === valueId
      );
      
      if (!attrValue) {
        throw new Error(`Attribute value with ID ${valueId} not found`);
      }
      
      const attribute = attrValue.attribute;
      
      // Find attribute definition
      const attrDef = attributes.find(a => a.id === attribute);
      let formattedValue = value;
      
      // Handle special value types
      if (attrDef?.data_type === 'number') {
        formattedValue = Number(value);
      } else if (attrDef?.data_type === 'boolean') {
        formattedValue = Boolean(value);
      }
      
      console.log(`Formatted value (${attrDef?.data_type}):`, formattedValue);
      
      const response = await axiosInstance.patch(paths.products.attributeValue(productId, valueId), {
        value: formattedValue,
        locale: locale || null,
        channel: channel || null
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onMutate: async ({ valueId, value, locale, channel }) => {
      // Similar optimistic update logic to createAttributeValueMutation
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      // Find the attribute ID for this value ID to use in context
      const attrValue = Object.values(attributeValues).find(
        (val: any) => val.id === valueId
      );
      const attrId = attrValue?.attribute;
      
      return { previousData, attrId, locale, channel };
    },
    onSuccess: (data) => {
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
      // Update attribute values in local state immediately
      setAttributeValues(prev => {
        const updated = { ...prev };
        const key = makeAttrKey(data.attribute, data.locale, data.channel);
        updated[key] = {
          ...data,
          value: data.value // Ensure value is set correctly
        };
        return updated;
      });
      
      // Set saving state to 'saved' momentarily
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
    onError: (error: any, variables, context) => {
      console.error('Error updating attribute value:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute value';
      toast.error(errorMessage);
      
      // Revert to previous data on error
      if (context?.attrId) {
        const queryKey = ENABLE_ATTRIBUTE_GROUPS 
          ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
          : qkAttributeValues(productId, selectedLocale, selectedChannel);
          
        queryClient.setQueryData(queryKey, context.previousData);
        
        // Set saving state to 'error'
        setSavingStates(prev => ({
          ...prev,
          [context.attrId]: 'error'
        }));
      }
    }
  });
  
  // Update attribute group mutation (add attribute to group)
  const addToGroupMutation = useMutation({
    mutationFn: async ({ groupId, attributeId }: { groupId: number; attributeId: number }) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }

      console.log(`Adding attribute ${attributeId} to group ${groupId}`);
      
      try {
        // Use the new add-item endpoint
        const url = paths.attributeGroups.addItem(groupId);
        console.log(`Using API path: ${url}`);
        
        // Make a POST request to add a single item
        const response = await axiosInstance.post(
          url, 
          { attribute: attributeId }, 
          {
            headers: { 
              'Accept': 'application/json', 
              'Content-Type': 'application/json' 
            }
          }
        );
        console.log('Add item response:', response.data);
        return {
          ...response.data,
          id: groupId // Include the group ID for compatibility with existing code
        };
      } catch (error) {
        console.error('API error adding item to group:', error);
        if (error.response) {
          console.error('Error response:', {
            status: error.response.status,
            data: JSON.stringify(error.response.data)
          });
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log(`Successfully added attribute ${variables.attributeId} to group ${variables.groupId}`, data);
      
      toast.success('Attribute added to group successfully');
      
      // Invalidate groups query to refresh
      queryClient.invalidateQueries({ queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel) });
    },
    onError: (error: any) => {
      console.error('Error adding attribute to group:', error);
      
      let errorMessage = 'Failed to add attribute to group';
      
      // Improved error message extraction
      if (error.response?.data) {
        const responseData = error.response.data;
        console.error('Error response data:', responseData);
        
        if (responseData.detail) {
          errorMessage = `Error: ${responseData.detail}`;
        } else if (typeof responseData === 'string') {
          errorMessage = `Error: ${responseData}`;
        } else {
          // Try to extract any field error
          const firstErrorField = Object.keys(responseData)[0];
          if (firstErrorField) {
            errorMessage = `Error in ${firstErrorField}: ${responseData[firstErrorField]}`;
          }
        }
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  });
  
  // Event handlers
  const handleAddAttribute = useCallback((attribute: Attribute, locale?: string, channel?: string) => {
    console.log("Adding attribute:", attribute, "locale:", locale, "channel:", channel);
    
    // Don't close the modal immediately - let onSuccess handle it
    
    // Create an attribute value for this attribute
    createAttributeValueMutation.mutate({
      attributeId: attribute.id,
      value: '',  // Start with empty value
      productId: productId,  // Pass the product ID
      locale: locale, 
      channel: channel
    }, {
      onSuccess: (data) => {
        console.log("Created attribute value:", data);
        
        // Now add this attribute to the current group
        if (currentGroupId) {
          addToGroupMutation.mutate({
            groupId: currentGroupId,
            attributeId: attribute.id
          });
        }
        
        // Only close the modal after successful creation
        setIsAddModalOpen(false);
      }
    });
  }, [addToGroupMutation, createAttributeValueMutation, currentGroupId, productId, setIsAddModalOpen]);
  
  const handleEditAttribute = useCallback((attributeId: number) => {
    setEditableAttributeIds(prev => ({
      ...prev,
      [attributeId]: true
    }));
  }, []);
  
  const handleCancelEdit = useCallback((attributeId: number) => {
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
  }, [attributeValues]);
  
  const handleSaveNewValue = useCallback((attributeId: number, value: any, locale?: string, channel?: string) => {
    console.log(`handleSaveNewValue called for attribute ${attributeId} with value:`, value);
    
    // Set saving state for this attribute
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Call the mutation
    createAttributeValueMutation.mutate({
      attributeId,
      value,
      productId,
      locale,
      channel
    });
  }, [createAttributeValueMutation, productId]);
  
  const handleUpdateValue = useCallback((valueId: number, value: any, locale?: string, channel?: string) => {
    console.log(`handleUpdateValue called for value ${valueId} with:`, value);
    
    // Find the attribute ID for this value
    const attributeValue = Object.values(attributeValues || {}).find(v => v.id === valueId);
    const attributeId = attributeValue?.attribute;
    
    if (attributeId) {
      // Set saving state for this attribute
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saving'
      }));
    }
    
    // Call the mutation
    updateAttributeValueMutation.mutate({
      valueId,
      value,
      productId,
      locale,
      channel
    });
  }, [attributeValues, productId, updateAttributeValueMutation]);
  
  if (!ENABLE_CUSTOM_ATTRIBUTES) {
    return null;
  }
  
  const isLoading = isLoadingAttributes || isLoadingGroups || isLoadingValues;
  const hasError = Boolean(attributesError || groupsError || valuesError);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <LocaleChannelSelector
          selectedLocale={selectedLocale}
          selectedChannel={selectedChannel}
          availableLocales={availableLocales}
          availableChannels={availableChannels}
          onLocaleChange={setSelectedLocale}
          onChannelChange={setSelectedChannel}
        />
        
        {isStaff && !ENABLE_ATTRIBUTE_GROUPS && (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            disabled={createAttributeValueMutation.isPending}
          >
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
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : hasError ? (
            <div className="flex items-center justify-center text-danger-500 p-8">
              <AlertCircle className="h-6 w-6 mr-2" />
              <p>Failed to load attributes. Please try again later.</p>
            </div>
          ) : ENABLE_ATTRIBUTE_GROUPS ? (
            <AttributeGroupTabs
              groups={attributeGroups}
              attributes={attributes}
              attributeValues={attributeValues}
              editableAttributeIds={editableAttributeIds}
              savingStates={savingStates}
              isStaff={isStaff}
              onAddAttributeClick={(gid) => { setCurrentGroupId(gid); setIsAddModalOpen(true); }}
              onEditAttribute={handleEditAttribute}
              onCancelEdit={handleCancelEdit}
              onSaveNewValue={handleSaveNewValue}
              onUpdateValue={handleUpdateValue}
              availableLocales={availableLocales}
              availableChannels={availableChannels}
              makeAttrKey={makeAttrKey}
            />
          ) : attributes.length === 0 ? (
            <div className="py-6 text-center text-enterprise-500">
              <p>No attributes defined yet.</p>
              {isStaff && (
                <p className="text-sm mt-1">Click "Add Attribute" to get started.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {attributes.map((attribute: Attribute) => {
                const value = attributeValues[attribute.id];
                const isEditable = editableAttributeIds[attribute.id];
                
                if (!isEditable && !value) return null;
                
                return (
                  <AttributeValueRow
                    key={attribute.id}
                    attribute={attribute}
                    value={value || null}
                    isEditable={Boolean(isEditable)}
                    isNew={Boolean(isEditable && !value)}
                    onEdit={handleEditAttribute}
                    onCancel={handleCancelEdit}
                    onSaveNew={handleSaveNewValue}
                    onUpdate={handleUpdateValue}
                    savingState={savingStates[attribute.id] || 'idle'}
                    isStaff={isStaff}
                    availableLocales={availableLocales}
                    availableChannels={availableChannels}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddAttributeModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        availableAttributes={getUnassignedAttributes()}
        onAddAttribute={handleAddAttribute}
        isPending={createAttributeValueMutation.isPending}
        availableLocales={availableLocales}
        availableChannels={availableChannels}
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
      />
    </div>
  );
};

export default AttributesTab; 