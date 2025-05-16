import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttributeService } from '@/services/AttributeService';
import { Attribute, AttributeValue, AttributeGroup, SavingState } from '@/features/attributes';
import { qkAttributes, qkAttributeValues, qkAttributeGroups } from '@/lib/queryKeys';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { makeAttributeKey, normalizeLocaleOrChannel } from '@/lib/attributeUtils';
import isEqual from 'lodash/isEqual';
import useOrganization from './useOrganization';

/**
 * Custom hook for managing product attributes
 * 
 * Provides a comprehensive interface for working with attributes including:
 * - Loading attributes, values, and groups
 * - Adding, updating, and removing attribute values
 * - Handling attribute groups
 * - Managing UI state (editing, saving)
 */
export const useAttributes = (
  productId: number,
  options?: {
    enableGroups?: boolean;
    isStaff?: boolean;
    isSettingsContext?: boolean;
  }
) => {
  const {
    enableGroups = false,
    isStaff = false,
    isSettingsContext = false
  } = options || {};
  
  const queryClient = useQueryClient();
  const { defaultLocale, defaultChannel } = useOrganization();

  // State - initialize with org defaults
  const [selectedLocale, setSelectedLocale] = useState(defaultLocale);
  const [selectedChannel, setSelectedChannel] = useState(defaultChannel);
  const [editableAttributeIds, setEditableAttributeIds] = useState<Record<number, boolean>>({});
  const [attributeValues, setAttributeValues] = useState<Record<string, AttributeValue>>({});
  const [savingStates, setSavingStates] = useState<Record<number, SavingState>>({});
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
  
  // Update locale/channel when org defaults change
  useEffect(() => {
    if (defaultLocale && !selectedLocale) {
      setSelectedLocale(defaultLocale);
    }
    if (defaultChannel && !selectedChannel) {
      setSelectedChannel(defaultChannel);
    }
  }, [defaultLocale, defaultChannel, selectedLocale, selectedChannel]);
  
  // Confirmation dialog for removing attributes
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<
    | { itemId: number; groupId: number }
    | { valueId: number; productId: number }
    | null
  >(null);
  const [confirmRemoveType, setConfirmRemoveType] = useState<'value' | 'group_item'>('value');

  // Load attributes
  const { 
    data: attributes = [], 
    isLoading: isLoadingAttributes,
    error: attributesError,
    refetch: refetchAttributes
  } = useQuery({
    queryKey: qkAttributes(),
    queryFn: () => AttributeService.fetchAttributes(),
    staleTime: 60_000, // 1 minute - attributes rarely change
  });
  
  // Load attribute groups if enabled
  const { 
    data: attributeGroups = [], 
    isLoading: isLoadingGroups,
    error: groupsError
  } = useQuery({
    queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel),
    queryFn: () => AttributeService.fetchAttributeGroups(productId, selectedLocale, selectedChannel),
    enabled: enableGroups && !!productId,
  });
  
  // Load attribute values when not using groups
  const { 
    data: values = [], 
    isLoading: isLoadingValues,
    error: valuesError
  } = useQuery({
    queryKey: qkAttributeValues(productId, selectedLocale, selectedChannel),
    queryFn: () => AttributeService.fetchAttributeValues(productId, selectedLocale, selectedChannel),
    enabled: !!productId && !enableGroups,
  });

  // Deduplicate attributes to prevent duplicates
  const uniqueAttributes = useMemo(() => {
    if (!attributes) return [] as Attribute[];
    
    const seen = new Set<number>();
    return attributes.filter(attr => {
      if (seen.has(attr.id)) return false;
      seen.add(attr.id);
      return true;
    }) as Attribute[];
  }, [attributes]);

  // Process values when they change
  useEffect(() => {
    if (!values?.length) return;
    
    // Create a map of attribute ID to value
    const valueMap: Record<string, AttributeValue> = {};
    const filteredValues = values.filter((value: AttributeValue) => 
      value.locale === selectedLocale && value.channel === selectedChannel
    );
    
    filteredValues.forEach((value: AttributeValue) => {
      const key = makeAttributeKey(value.attribute, value.locale, value.channel);
      valueMap[key] = value;
    });
    
    if (!isEqual(attributeValues, valueMap)) {
      setAttributeValues(valueMap);
    }
  }, [values, selectedLocale, selectedChannel]);
  
  // Process attribute groups into values when they change
  useEffect(() => {
    if (!attributeGroups?.length || !enableGroups) return;
    
    // Create a map of attribute ID to value from API response
    const apiMap: Record<string, AttributeValue> = {};
    
    attributeGroups.forEach((group: AttributeGroup) => {
      group.items.forEach((item: any) => {
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
        }
      });
    });
    
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

        return mergedMap;
      });
    }
  }, [attributeGroups, selectedLocale, selectedChannel, attributes, savingStates, enableGroups]);

  // Create attribute value mutation
  const createAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      attributeId, 
      value, 
      locale = null, 
      channel = null
    }: { 
      attributeId: number; 
      value: any; 
      locale?: string | null;
      channel?: string | null;
    }) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      // Set saving state for this attribute
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saving'
      }));
      
      try {
        const result = await AttributeService.createAttributeValue(
          attributeId, 
          value, 
          productId,
          locale,
          channel,
          attributes
        );
        return result;
      } catch (error) {
        console.error('Error creating attribute value:', error);
        setSavingStates(prev => ({
          ...prev,
          [attributeId]: 'error'
        }));
        throw error;
      }
    },
    onSuccess: (data) => {
      const queryKey = enableGroups
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      // Update attribute values in local state immediately
      setAttributeValues(prev => {
        // Create a shallow copy to ensure React detects the change
        const updated = { ...prev };
        // Add the new value without disturbing existing ones
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
    onError: (error: any, variables) => {
      console.error('Error creating attribute value:', error);
      let errorMessage = error.response?.data?.detail || 'Failed to save attribute value';
      
      // If we have a uniqueness error, show a more helpful message
      if (error.response?.status === 400 && 
         (error.response?.data?.non_field_errors || 
          error.response?.data?.detail?.includes('unique'))) {
        errorMessage = 'This attribute value already exists';
      }
      
      toast.error(errorMessage);
      
      // Set saving state to 'error'
      setSavingStates(prev => ({
        ...prev,
        [variables.attributeId]: 'error'
      }));
    }
  });

  // Update attribute value mutation
  const updateAttributeValueMutation = useMutation({
    mutationFn: async ({ 
      valueId, 
      value, 
      locale = null,
      channel = null
    }: { 
      valueId: number; 
      value: any;
      locale?: string | null;
      channel?: string | null;
    }) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      // Find the attribute ID for this value ID
      const attrValue = Object.values(attributeValues).find(
        (val: any) => val.id === valueId
      );
      
      if (!attrValue) {
        throw new Error(`Attribute value with ID ${valueId} not found`);
      }
      
      const attributeId = attrValue.attribute;
      
      // Set saving state for this attribute
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saving'
      }));
      
      try {
        const result = await AttributeService.updateAttributeValue(
          valueId, 
          value, 
          productId,
          locale, 
          channel,
          attributes
        );
        return { ...result, attributeId };
      } catch (error) {
        setSavingStates(prev => ({
          ...prev,
          [attributeId]: 'error'
        }));
        throw error;
      }
    },
    onSuccess: (data) => {
      const queryKey = enableGroups
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      // Update attribute values in local state immediately
      setAttributeValues(prev => {
        const updated = { ...prev };
        const key = makeAttributeKey(data.attribute, data.locale, data.channel);
        updated[key] = {
          ...data,
          value: data.value
        };
        return updated;
      });
      
      // Set saving state to 'saved' momentarily
      setSavingStates(prev => ({
        ...prev,
        [data.attributeId || data.attribute]: 'saved'
      }));
      
      // Reset saving state after a delay
      setTimeout(() => {
        setSavingStates(prev => ({
          ...prev,
          [data.attributeId || data.attribute]: 'idle'
        }));
      }, 2000);
      
      // Reset editable state
      setEditableAttributeIds(prev => {
        const newState = { ...prev };
        delete newState[data.attributeId || data.attribute];
        return newState;
      });
      
      // Force refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any, variables) => {
      console.error('Error updating attribute value:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute value';
      toast.error(errorMessage);
      
      // Find the attribute ID for this value ID to set error state
      const attrValue = Object.values(attributeValues).find(
        (val: any) => val.id === variables.valueId
      );
      
      if (attrValue) {
        setSavingStates(prev => ({
          ...prev,
          [attrValue.attribute]: 'error'
        }));
      }
    }
  });

  // Delete attribute value mutation
  const deleteAttributeValueMutation = useMutation({
    mutationFn: async ({ valueId }: { valueId: number }) => {
      await AttributeService.deleteAttributeValue(valueId, productId);
      return valueId;
    },
    onSuccess: (valueId) => {
      toast.success('Attribute value removed from product');
      
      // Find the attribute that this value was for
      const attrValue = Object.values(attributeValues).find(val => val.id === valueId);
      
      if (attrValue) {
        // Remove from local state
        setAttributeValues(prev => {
          const updated = { ...prev };
          const key = makeAttributeKey(attrValue.attribute, attrValue.locale, attrValue.channel);
          delete updated[key];
          return updated;
        });
      }
      
      // Refresh data
      const queryKey = enableGroups
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Error removing attribute value from product:', error);
      toast.error('Failed to remove attribute value from product');
    }
  });

  // Remove attribute from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ itemId, groupId }: { itemId: number, groupId: number }) => {
      await AttributeService.removeAttributeFromGroup(itemId, groupId);
      return { itemId, groupId };
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

  // Handler functions
  const handleAddAttribute = useCallback(async (attribute: Attribute, locale?: string | null, channel?: string | null) => {
    try {
      // Convert 'default' to null for backend
      const apiLocale = normalizeLocaleOrChannel(locale || selectedLocale);
      const apiChannel = normalizeLocaleOrChannel(channel || selectedChannel);
      
      const data = await createAttributeValueMutation.mutateAsync({
        attributeId: attribute.id,
        value: '',  // Start with empty value
        locale: apiLocale, 
        channel: apiChannel
      });
        
      // Mark the new attribute as "editing" right away
      setEditableAttributeIds(prev => ({
        ...prev,
        [data.attribute]: true
      }));
        
      // Success message
      toast.success(`Added attribute ${attribute.label}`);
      
      return data;
    } catch (error: any) {
      console.error("Error adding attribute:", error);
      const errorMessage = error.response?.data?.detail || 'Failed to add attribute';
      toast.error(errorMessage);
      throw error;
    }
  }, [createAttributeValueMutation, selectedLocale, selectedChannel]);
  
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
    const key = makeAttributeKey(attributeId, selectedLocale, selectedChannel);
    if (!attributeValues[key]) {
      setAttributeValues(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  }, [attributeValues, selectedLocale, selectedChannel]);
  
  const handleSaveNewValue = useCallback(async (attributeId: number, value: any) => {
    try {
      // Set saving state for this attribute
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'saving'
      }));
      
      await AttributeService.createAttributeValue(
        attributeId,
        value,
        productId,
        selectedLocale === 'default' ? null : selectedLocale,
        selectedChannel === 'default' ? null : selectedChannel,
        attributes
      );
      
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
      const queryKey = enableGroups
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
      return true;
    } catch (error) {
      console.error('Failed to create attribute value:', error);
      
      // Set saving state to 'error'
      setSavingStates(prev => ({
        ...prev,
        [attributeId]: 'error'
      }));
      
      toast.error('Failed to save attribute value');
      return false;
    }
  }, [attributes, productId, selectedLocale, selectedChannel, queryClient, enableGroups]);
  
  const handleUpdateValue = useCallback(async (valueId: number, value: any) => {
    try {
      await updateAttributeValueMutation.mutateAsync({
        valueId,
        value,
        locale: selectedLocale === 'default' ? null : selectedLocale,
        channel: selectedChannel === 'default' ? null : selectedChannel
      });
      return true;
    } catch (error) {
      return false;
    }
  }, [updateAttributeValueMutation, selectedLocale, selectedChannel]);
  
  // Handler for removing attribute values from a product
  const handleRemoveAttributeValue = useCallback((valueId: number) => {
    // Store information for the confirmation dialog
    setItemToRemove({ valueId, productId });
    setConfirmRemoveType('value');
    setConfirmRemoveOpen(true);
  }, [productId]);

  // Handler for removing attributes from groups
  const handleRemoveAttribute = useCallback((itemId: number, groupId: number) => {
    setItemToRemove({ itemId, groupId });
    setConfirmRemoveType('group_item');
    setConfirmRemoveOpen(true);
  }, []);

  // Handle confirmation of removal
  const handleConfirmRemove = useCallback(() => {
    if (!itemToRemove) {
      setConfirmRemoveOpen(false);
      return;
    }
    
    if (confirmRemoveType === 'value' && 'valueId' in itemToRemove) {
      // Delete attribute value from product
      deleteAttributeValueMutation.mutate({
        valueId: itemToRemove.valueId
      });
    } else if (confirmRemoveType === 'group_item' && 'itemId' in itemToRemove && 'groupId' in itemToRemove) {
      // Remove attribute from group
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

  // Helper to get unassigned attributes
  const getUnassignedAttributes = useCallback(() => {
    if (!uniqueAttributes?.length) return [];
    
    if (enableGroups && currentGroupId) {
      return AttributeService.getAvailableAttributesForGroup(
        uniqueAttributes,
        attributeGroups,
        currentGroupId,
        attributeValues,
        selectedLocale,
        selectedChannel,
        editableAttributeIds
      );
    }
    
    // In non-groups mode, use the utility function to filter unused attributes
    return AttributeService.getUnassignedAttributes(
      uniqueAttributes,
      attributeValues,
      selectedLocale,
      selectedChannel
    ).filter(attr => !editableAttributeIds[attr.id]);
  }, [
    uniqueAttributes, 
    attributeValues, 
    editableAttributeIds, 
    enableGroups, 
    currentGroupId, 
    attributeGroups, 
    selectedLocale, 
    selectedChannel
  ]);

  // Determine loading and error states
  const isLoading = isLoadingAttributes || (enableGroups ? isLoadingGroups : isLoadingValues);
  const hasError = Boolean(attributesError || (enableGroups ? groupsError : valuesError));
  
  useEffect(() => {
    console.log('attributeGroups from useAttributes:', attributeGroups)
  }, [attributeGroups])

  return {
    // Data
    attributes: uniqueAttributes,
    attributeValues,
    attributeGroups,
    
    // State
    selectedLocale,
    selectedChannel,
    setSelectedLocale,
    setSelectedChannel,
    editableAttributeIds,
    savingStates,
    currentGroupId,
    setCurrentGroupId,
    confirmRemoveOpen,
    confirmRemoveType,
    itemToRemove,
    isLoading,
    hasError,
    
    // Mutations
    handleAddAttribute,
    handleEditAttribute,
    handleCancelEdit,
    handleSaveNewValue,
    handleUpdateValue,
    handleRemoveAttributeValue,
    handleRemoveAttribute,
    handleConfirmRemove,
    handleCancelRemove,
    
    // Helpers
    getUnassignedAttributes,
    
    // Settings
    isStaff,
    isSettingsContext,
    enableGroups
  };
};

export default useAttributes; 