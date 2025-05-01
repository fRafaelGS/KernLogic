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
        headers: { 'Accept': 'application/json' }
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
    
    // Create a map of attribute ID to value from API response
    const apiMap: Record<number, AttributeValue> = {};
    attributeGroups.forEach((group: AttributeGroup) => {
      group.items.forEach((item: any) => {
        if (item.value !== undefined) {
          apiMap[item.attribute] = {
            id: item.id,
            attribute: item.attribute,
            value: item.value,
            locale: item.locale || selectedLocale,
            channel: item.channel || selectedChannel
          };
        }
      });
    });

    // Merge with current local (optimistic) state so we don't lose unsaved rows
    const mergedMap = { ...attributeValues, ...apiMap };

    if (!isEqual(attributeValues, mergedMap)) {
      setAttributeValues(mergedMap);
    }
  }, [attributeGroups, selectedLocale, selectedChannel, attributeValues]);
  
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
    mutationFn: async ({ attributeId, value }: { attributeId: number, value: any }) => {
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
    onMutate: async ({ attributeId, value }) => {
      // For optimistic updates
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      // Optimistically update to the new value
      // This is simplified; in a real implementation, you'd update the
      // nested data structure of the specific group and attribute
      
      return { previousData, attributeId };
    },
    onSuccess: (data) => {
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
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
      console.error('Error creating attribute value:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save attribute value';
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
    mutationFn: async ({ valueId, value }: { valueId: number, value: any }) => {
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
    onMutate: async ({ valueId, value }) => {
      // Similar optimistic update logic to createAttributeValueMutation
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      
      // Find the attribute ID for this value ID to use in context
      const attrId = Object.values(attributeValues).find(
        (val: any) => val.id === valueId
      )?.attribute;
      
      return { previousData, attrId };
    },
    onSuccess: (data) => {
      const queryKey = ENABLE_ATTRIBUTE_GROUPS 
        ? qkAttributeGroups(productId, selectedLocale, selectedChannel)
        : qkAttributeValues(productId, selectedLocale, selectedChannel);
        
      queryClient.invalidateQueries({ queryKey });
      
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

      // Find existing group data
      const group = attributeGroups.find((g: any) => g.id === groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Determine next order value
      const maxOrder = group.items.reduce((acc: number, item: any) => Math.max(acc, item.order), 0);

      // Build payload keeping existing items ids & orders
      const itemsPayload = [
        ...group.items.map((item: any) => ({ id: item.id, attribute: item.attribute, order: item.order })),
        { attribute: attributeId, order: maxOrder + 1 }
      ];

      await axiosInstance.patch(paths.attributeGroups.byId(groupId), { items: itemsPayload }, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate groups query to refresh
      queryClient.invalidateQueries({ queryKey: qkAttributeGroups(productId, selectedLocale, selectedChannel) });
    },
    onError: (error: any) => {
      console.error('Error updating group:', error);
      toast.error('Failed to add attribute to group');
    }
  });
  
  // Event handlers
  const handleAddAttribute = useCallback((attributeId: number, groupId?: number) => {
    const attribute = attributes.find(attr => attr.id === attributeId);
    if (!attribute) return;
    
    // Set this attribute as editable
    setEditableAttributeIds(prev => ({
      ...prev,
      [attributeId]: true
    }));
    
    // Create an initial empty value based on data type
    let initialValue: any = '';
    switch (attribute.data_type) {
      case 'boolean':
        initialValue = false;
        break;
      case 'number':
        initialValue = 0;
        break;
      case 'date':
        initialValue = '';
        break;
      default:
        initialValue = '';
    }
    
    // Add the attribute value to local state
    setAttributeValues(prev => ({
      ...prev,
      [attributeId]: {
        attribute: attributeId,
        value: initialValue,
        locale: selectedLocale,
        channel: selectedChannel
      }
    }));
    
    // Set saving state to 'saving'
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Immediately save the new value to the server
    createAttributeValueMutation.mutate({ attributeId, value: initialValue });
    
    // If we are in group mode and have target group, also update the group
    if (ENABLE_ATTRIBUTE_GROUPS && groupId) {
      addToGroupMutation.mutate({ groupId, attributeId });
    }
    
    // Close the modal
    setIsAddModalOpen(false);
    setCurrentGroupId(null);
  }, [attributes, createAttributeValueMutation, selectedChannel, selectedLocale, addToGroupMutation]);
  
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
  
  const handleSaveNewValue = useCallback((attributeId: number, value: any) => {
    // Set saving state
    setSavingStates(prev => ({
      ...prev,
      [attributeId]: 'saving'
    }));
    
    // Create the attribute value
    createAttributeValueMutation.mutate({ attributeId, value });
  }, [createAttributeValueMutation]);
  
  const handleUpdateValue = useCallback((valueId: number, value: any) => {
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
  }, [attributeValues, updateAttributeValueMutation]);
  
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
        onAddAttribute={(attrId) => handleAddAttribute(attrId, currentGroupId ?? undefined)}
        isPending={createAttributeValueMutation.isPending}
      />
    </div>
  );
};

export default AttributesTab; 