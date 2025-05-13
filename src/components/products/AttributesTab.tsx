import React, { useState, useCallback, useMemo } from 'react';
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { 
  makeAttributeKey, 
  deduplicateAttributes, 
  normalizeLocaleOrChannel,
  filterUnusedAttributes
} from '@/lib/attributeUtils';

interface AttributesTabProps {
  productId: number;
}

const AttributesTab: React.FC<AttributesTabProps> = ({ productId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isStaff = (user as any)?.is_staff || false;
  
  // State
  const [selectedLocale, setSelectedLocale] = useState<string>('en_US');
  const [selectedChannel, setSelectedChannel] = useState<string>('ecommerce');
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
  
  // Helper values for API calls
  const apiLocale = selectedLocale === 'default' ? null : selectedLocale;
  const apiChannel = selectedChannel === 'default' ? null : selectedChannel;
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
  const [editableAttributeIds, setEditableAttributeIds] = useState<Record<number, boolean>>({});
  const [attributeValues, setAttributeValues] = useState<Record<number, AttributeValue>>({});
  const [savingStates, setSavingStates] = useState<Record<number, SavingState>>({});
  
  // Confirmation dialog for removing attributes
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<
    | { itemId: number; groupId: number }
    | { valueId: number; productId: number }
    | null
  >(null);
  const [confirmRemoveType, setConfirmRemoveType] = useState<'value' | 'group_item'>('value');

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
  
  // Load attribute groups (always fetch every group assigned to this product)
  const {
    data: attributeGroups = [],
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useQuery({
    queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel),
    queryFn: async () => {
      return axiosInstance.get(
        paths.products.groups(productId),
        { headers: { 'Accept': 'application/json' } }
      ).then(r => r.data);
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
        params: {
          ...(apiLocale != null ? { locale: apiLocale } : {}),
          ...(apiChannel != null ? { channel: apiChannel } : {}),
        }
      });
      return response.data;
    },
    enabled: ENABLE_CUSTOM_ATTRIBUTES && !!productId && !ENABLE_ATTRIBUTE_GROUPS,
  });
  
  // Process values when they change
  React.useEffect(() => {
    if (!values) return;
    // Build a map of attributeId to the best value for the current locale/channel, with fallback
    const valueMap: Record<number, AttributeValue> = {};
    values.forEach((v: AttributeValue) => {
      if (!valueMap[v.attribute]) {
        valueMap[v.attribute] = v;
      } else {
        // Prefer more specific values: exact match > locale-only > channel-only > global
        const curr = valueMap[v.attribute];
        // Score: 3 = exact, 2 = locale only, 1 = channel only, 0 = global
        const score = (val: AttributeValue) => (
          (val.locale === selectedLocale ? 2 : (val.locale ? 1 : 0)) +
          (val.channel === selectedChannel ? 1 : (val.channel ? 0.5 : 0))
        );
        if (score(v) > score(curr)) valueMap[v.attribute] = v;
      }
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
          
          const key = makeAttributeKey(item.attribute, item.locale || null, item.channel || null);
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
  }, [attributeGroups, selectedLocale, selectedChannel, attributes, savingStates, makeAttributeKey]);
  
  // Deduplicate attributes to prevent duplicates from appearing in the modal
  const uniqueAttributes = useMemo(() => {
    if (!attributes) return [] as Attribute[];
    return deduplicateAttributes(attributes) as Attribute[];
  }, [attributes]);

  // Track used attribute keys for accurate filtering
  const usedAttributeKeys = useMemo(() => {
    return new Set(Object.keys(attributeValues));
  }, [attributeValues]);
  
  // Helper to get unassigned attributes for the Add modal
  const getUnassignedAttributes = useCallback(() => {
    if (!uniqueAttributes) return [];
    
    if (ENABLE_ATTRIBUTE_GROUPS && currentGroupId) {
      console.log('Getting attributes for group', currentGroupId);
      
      // Find the current group
      const currentGroup = attributeGroups.find((g: any) => g.id === currentGroupId);
      if (!currentGroup) {
        console.log('Group not found:', currentGroupId);
        return [];
      }
      
      // Get all attributes that are part of this group
      const groupItems = currentGroup.items || [];
      console.log('Group items:', groupItems);
      
      // Get the attributes that are part of this group
      const groupAttributeIds = groupItems.map((item: any) => item.attribute);
      console.log('Group attribute IDs:', groupAttributeIds);
      
      // Return attributes that ARE in the group but DON'T have values yet
      return uniqueAttributes.filter(attr => 
        // Attribute must be in the group
        groupAttributeIds.includes(attr.id) && 
        // But must not have a value yet for this locale/channel
        !usedAttributeKeys.has(makeAttributeKey(attr.id, normalizeLocaleOrChannel(selectedLocale), normalizeLocaleOrChannel(selectedChannel))) &&
        // And must not already be in edit mode
        !editableAttributeIds[attr.id]
      );
    }
    
    // In non-groups mode, use the utility function to filter unused attributes
    return filterUnusedAttributes(
      uniqueAttributes,
      attributeValues,
      selectedLocale,
      selectedChannel
    ).filter(attr => !editableAttributeIds[attr.id]);
  }, [uniqueAttributes, attributeValues, usedAttributeKeys, editableAttributeIds, ENABLE_ATTRIBUTE_GROUPS, currentGroupId, attributeGroups, selectedLocale, selectedChannel]);
  
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
      console.log("Posting to:", paths.products.attributes(productId));
      
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
        const key = makeAttributeKey(data.attribute, data.locale, data.channel);
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
        const key = makeAttributeKey(data.attribute, data.locale, data.channel);
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
  
  // Use an improved handleAddAttribute with better error handling and feedback
  const handleAddAttribute = useCallback(async (attribute: Attribute, locale?: string | null, channel?: string | null) => {
    console.log("Adding attribute value for:", attribute, "with locale:", locale || selectedLocale, "channel:", channel || selectedChannel);
    
    // Convert 'default' to null for backend
    const apiLocale = normalizeLocaleOrChannel(locale || selectedLocale);
    const apiChannel = normalizeLocaleOrChannel(channel || selectedChannel);
    
    console.log(`Using API values: locale=${apiLocale}, channel=${apiChannel}`);
    
    try {
      // Call the mutation and await its completion to properly handle errors
      const data = await createAttributeValueMutation.mutateAsync({
        attributeId: attribute.id,
        value: '',  // Start with empty value
        productId: productId,
        locale: apiLocale, 
        channel: apiChannel
      });
      
      console.log("Created attribute value:", data);
        
      // Mark the new attribute as "editing" right away
      setEditableAttributeIds(prev => ({
        ...prev,
        [data.attribute]: true
      }));
        
      // Ensure the groups query is refreshed to show the new value
      queryClient.invalidateQueries({ 
        queryKey: ENABLE_ATTRIBUTE_GROUPS
          ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
          : qkAttributeValues(productId, selectedLocale, selectedChannel)
      });
        
      // Close the modal after successful creation
      setIsAddModalOpen(false);
      
      // Success message
      toast.success(`Added attribute ${attribute.label}`);
      
    } catch (error: any) {
      console.error("Error adding attribute:", error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.detail || 'Failed to add attribute';
      toast.error(errorMessage);
      
      // Don't close the modal on error to allow retrying
    }
  }, [createAttributeValueMutation, productId, selectedLocale, selectedChannel, queryClient, setIsAddModalOpen]);
  
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
  
  const handleSaveNewValue = useCallback(async (attributeId: number, value: any) => {
    console.log(`handleSaveNewValue called for attribute ${attributeId} with value:`, value);
    
    // Set saving state for this attribute
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Find attribute definition to format the value correctly
    const attrDef = attributes.find(a => a.id === attributeId);
    
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
    
    console.log(`Creating attribute value for ${attributeId} with:`, {
      value: formattedValue,
      type: attrDef?.data_type,
      locale: selectedLocale,
      channel: selectedChannel,
      productId
    });
    
    // *** ACTUALLY fire the POST ***
    try {
      const payload = {
        attribute: attributeId,
        product: productId,
        value: formattedValue,
        locale: selectedLocale === 'default' ? null : selectedLocale,
        channel: selectedChannel === 'default' ? null : selectedChannel,
      };
      
      const response = await axiosInstance.post(
        paths.products.attributes(productId),
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Create attribute value response:', response.data);
      
      // Update attribute values in local state immediately
      const data = response.data;
      setAttributeValues(prev => {
        const updated = { ...prev };
        const key = makeAttributeKey(data.attribute, data.locale, data.channel);
        updated[key] = {
          ...data,
          id: data.id,
          attribute: data.attribute,
          value: data.value
        };
        return updated;
      });
      
      // Set saving state to 'saved' momentarily
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saved'
      }));
      
      // Reset saving state after a delay
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [attributeId]: 'idle'
        }));
      }, 2000);
      
      // Reset editable state
      setEditableAttributeIds(prev => {
        const newState = { ...prev };
        delete newState[attributeId];
        return newState;
      });
      
      // Force refetch to ensure data consistency
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
    } catch (error) {
      console.error('Failed to create attribute value:', error);
      
      // Set saving state to 'error'
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'error'
      }));
      
      let errorMessage = error.response?.data?.detail || 'Failed to save attribute value';
      
      // If we have a uniqueness error, show a more helpful message
      if (error.response?.status === 400 && 
         (error.response?.data?.non_field_errors || 
          error.response?.data?.detail?.includes('unique'))) {
        errorMessage = 'This attribute value already exists';
      }
      
      toast.error(errorMessage);
    }
  }, [attributes, productId, selectedLocale, selectedChannel, queryClient]);
  
  const handleUpdateValue = useCallback(async (valueId: number, value: any) => {
    console.log(`handleUpdateValue called for value ${valueId} with:`, value);
    
    // Find the attribute ID for this value
    const attributeValue = Object.values(attributeValues || {}).find(v => v.id === valueId);
    const attributeId = attributeValue?.attribute;
    
    if (!attributeId) {
      console.error(`Attribute value with ID ${valueId} not found`);
      toast.error('Cannot update: attribute value not found');
      return;
    }
    
    // Set saving state for this attribute
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Find attribute definition
    const attrDef = attributes.find(a => a.id === attributeId);
    let formattedValue = value;
      
    // Handle special value types
    if (attrDef?.data_type === 'number') {
      formattedValue = Number(value);
    } else if (attrDef?.data_type === 'boolean') {
      formattedValue = Boolean(value);
    }
    
    console.log(`Formatted value (${attrDef?.data_type}):`, formattedValue);
    
    try {
      const payload = {
        value: formattedValue,
        locale: selectedLocale === 'default' ? null : selectedLocale,
        channel: selectedChannel === 'default' ? null : selectedChannel
      };
      
      const response = await axiosInstance.patch(
        paths.products.attributeValue(productId, valueId), 
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Update attribute value response:', response.data);
      
      // Update attribute values in local state immediately
      const data = response.data;
      setAttributeValues(prev => {
        const updated = { ...prev };
        const key = makeAttributeKey(data.attribute, data.locale, data.channel);
        updated[key] = {
          ...data,
          value: data.value // Ensure value is set correctly
        };
        return updated;
      });
      
      // Set saving state to 'saved' momentarily
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saved'
      }));
      
      // Reset saving state after a delay
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [attributeId]: 'idle'
        }));
      }, 2000);
      
      // Reset editable state
      setEditableAttributeIds(prev => {
        const newState = { ...prev };
        delete newState[attributeId];
        return newState;
      });
      
      // Force refetch to ensure data consistency
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
    } catch (error) {
      console.error('Failed to update attribute value:', error);
      
      // Set saving state to 'error'
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'error'
      }));
      
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute value';
      toast.error(errorMessage);
    }
  }, [attributes, attributeValues, productId, selectedLocale, selectedChannel, queryClient]);
  
  // Mutation to remove an attribute from a group
  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ itemId, groupId }: { itemId: number, groupId: number }) => {
      await axiosInstance.delete(paths.attributeGroups.removeItem(groupId, itemId));
    },
    onSuccess: () => {
      toast.success('Attribute removed from group');
      // Refresh the attribute groups data
      queryClient.invalidateQueries({ 
        queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel) 
      });
    },
    onError: (error: any) => {
      console.error('Error removing attribute from group:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove attribute from group');
    }
  });

  // Add a new mutation for deleting product attribute values
  const deleteAttributeValueMutation = useMutation({
    mutationFn: async ({ valueId, productId }: { valueId: number, productId: number }) => {
      // Use a dedicated endpoint for deleting attribute values from a product
      await axiosInstance.delete(paths.products.attributeValue(productId, valueId));
    },
    onSuccess: () => {
      toast.success('Attribute value removed from product');
      // Refresh the attribute values data
      queryClient.invalidateQueries({ 
        queryKey: ENABLE_ATTRIBUTE_GROUPS
          ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
          : qkAttributeValues(productId, selectedLocale, selectedChannel)
      });
    },
    onError: (error: any) => {
      console.error('Error removing attribute value from product:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove attribute value from product');
    }
  });

  // Create a handler for removing attribute values from a product
  const handleRemoveAttributeValue = useCallback((valueId: number) => {
    // Store information for the confirmation dialog
    setItemToRemove({ valueId, productId });
    setConfirmRemoveType('value'); // Add a new state variable for tracking what type of removal we're confirming
    setConfirmRemoveOpen(true);
  }, [productId]);

  // Modify the handleRemoveAttribute function to only be used in group contexts
  const handleRemoveAttribute = useCallback((itemId: number, groupId: number) => {
    setItemToRemove({ itemId, groupId });
    setConfirmRemoveType('group_item');
    setConfirmRemoveOpen(true);
  }, []);

  // Update handleConfirmRemove to handle both types of removal
  const handleConfirmRemove = useCallback(() => {
    if (!itemToRemove) {
      setConfirmRemoveOpen(false);
      return;
    }
    
    if (confirmRemoveType === 'value' && 'valueId' in itemToRemove) {
      // Delete attribute value from product
      deleteAttributeValueMutation.mutate({
        valueId: itemToRemove.valueId,
        productId: itemToRemove.productId
      });
    } else if (confirmRemoveType === 'group_item' && 'itemId' in itemToRemove && 'groupId' in itemToRemove) {
      // Remove attribute from group (existing functionality)
      removeFromGroupMutation.mutate({
        itemId: itemToRemove.itemId,
        groupId: itemToRemove.groupId
      });
    }
    
    setConfirmRemoveOpen(false);
    setItemToRemove(null);
  }, [itemToRemove, confirmRemoveType, deleteAttributeValueMutation, removeFromGroupMutation]);

  // Handler for canceling removal
  const handleCancelRemove = useCallback(() => {
    setConfirmRemoveOpen(false);
    setItemToRemove(null);
  }, []);

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
              attributes={uniqueAttributes as Attribute[]}
              attributeValues={attributeValues}
              editableAttributeIds={editableAttributeIds}
              savingStates={savingStates}
              isStaff={isStaff}
              onAddAttributeClick={(gid) => { setCurrentGroupId(gid); setIsAddModalOpen(true); }}
              onEditAttribute={handleEditAttribute}
              onCancelEdit={handleCancelEdit}
              onSaveNewValue={handleSaveNewValue}
              onUpdateValue={handleUpdateValue}
              onRemoveAttribute={handleRemoveAttribute}
              onRemoveAttributeValue={handleRemoveAttributeValue}
              availableLocales={availableLocales}
              availableChannels={availableChannels}
              makeAttrKey={makeAttributeKey}
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
                const key = makeAttributeKey(attribute.id, selectedLocale, selectedChannel);
                const value = attributeValues[key];
                const isEditable = editableAttributeIds[attribute.id];
                
                if (!isEditable && !value) return null;
                
                // In non-group mode, check if value matches selected locale/channel
                if (!isEditable && value) {
                  const valueLocale = value.locale;
                  const valueChannel = value.channel;
                  
                  // Skip rendering if this value has a specific locale/channel 
                  // that doesn't match the current selection
                  const shouldHide = 
                    // If value has a specific locale that doesn't match selectedLocale, hide it
                    (valueLocale && valueLocale !== selectedLocale) ||
                    // If value has a specific channel that doesn't match selectedChannel, hide it
                    (valueChannel && valueChannel !== selectedChannel);
                  
                  if (shouldHide) {
                    console.log(`Hiding attribute ${attribute.label} with locale=${valueLocale} channel=${valueChannel} because it doesn't match selection locale=${selectedLocale} channel=${selectedChannel}`);
                    return null;
                  }
                }
                
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
                    onRemove={value && value.id ? () => handleRemoveAttributeValue(value.id) : undefined}
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
        groupId={currentGroupId}
        attributeValues={attributeValues}
      />
      
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmRemoveType === 'value' ? 'Remove Attribute Value' : 'Remove Attribute From Group'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemoveType === 'value' 
                ? 'Are you sure you want to remove this attribute value from the product? This will only affect this specific product, not the global attribute definition or group assignments.'
                : 'Are you sure you want to remove this attribute from the group? The attribute itself will not be deleted, just removed from this group.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttributesTab; 