import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { config } from '@/config/config';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/domains/core/components/ui/card";
import { Button } from "@/domains/core/components/ui/button";
import { 
  Loader2, 
  PlusCircle, 
  AlertCircle, 
  Pencil, 
  Trash, 
  GripVertical, 
  Check, 
  X 
} from 'lucide-react';
import { Badge } from "@/domains/core/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/domains/core/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/domains/core/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/domains/core/components/ui/table";
import { Input } from "@/domains/core/components/ui/input";
import { Label } from "@/domains/core/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/domains/core/components/ui/tooltip";
import { Skeleton } from "@/domains/core/components/ui/skeleton";

// Types
interface Attribute {
  id: number;
  code: string;
  label: string;
  data_type: string;
}

interface AttributeGroupItem {
  id?: number;
  attribute: number;
  order: number;
}

interface AttributeGroup {
  id: number;
  name: string;
  order: number;
  items: AttributeGroupItem[];
}

// Form values interface
interface GroupFormValues {
  name: string;
  order: number;
  items: AttributeGroupItem[];
}

// Import our utility functions at the top of the file
import {
  updateAttributeGroup,
  reorderAttributeGroupItems,
  addAttributeToGroup,
  removeAttributeFromGroup,
  createAttributeGroup,
  deleteAttributeGroup,
} from '../../products/services/attributeGroupApi';

// Sortable item wrapper for drag-and-drop
const SortableAttributeItem = ({ item, attributes, onRemove }: { 
  item: AttributeGroupItem; 
  attributes: Attribute[];
  onRemove: (id: number) => void;
}) => {
  const attribute = attributes.find(a => a.id === item.attribute);
  const { attributes: sortableAttributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: item.id?.toString() || `new-${item.attribute}` 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!attribute) return null;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center justify-between p-2 mb-2 bg-white border rounded-md"
    >
      <div className="flex items-center">
        <div className="cursor-move p-1" {...listeners} {...sortableAttributes}>
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>
        <span className="ml-2">{attribute.label}</span>
        <Badge variant="secondary" className="ml-2">
          {attribute.data_type}
        </Badge>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onRemove(attribute.id)} 
        className="text-gray-500 hover:text-red-500"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const AttributeGroupsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // const isStaff = (user as any)?.is_staff || false;
  
  // Add debug logs
  console.log("User in AttributeGroupsPage:", user);
  console.log("Original isStaff value:", (user as any)?.is_staff || false);
  
  // Force isStaff to true for testing
  const isStaff = true;
  
  // Access the configuration
  const attributeGroupsConfig = config.settings.display.attributeGroupsPage;
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<GroupFormValues>({
    name: '',
    order: 0,
    items: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<number | null>(null);

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch attribute groups
  const { 
    data: groups, 
    isLoading: isLoadingGroups, 
    error: groupsError, 
    refetch: refetchGroups 
  } = useQuery({
    queryKey: ['attributeGroups'],
    queryFn: async () => {
      const response = await axiosInstance.get(paths.attributeGroups.root(), {
        headers: { 'Accept': 'application/json' }
      });
      return response.data;
    },
    enabled: ENABLE_ATTRIBUTE_GROUPS,
  });

  // Fetch attributes for selecting
  const { 
    data: attributes, 
    isLoading: isLoadingAttributes 
  } = useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const response = await axiosInstance.get(paths.attributes.root(), {
        headers: { 'Accept': 'application/json' }
      });
      return response.data;
    },
    enabled: ENABLE_ATTRIBUTE_GROUPS,
  });

  // Modify the update mutation to only handle group properties, not items
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Omit<GroupFormValues, 'items'> }) => {
      // Only send name and order to update group properties
      return await updateAttributeGroup(id, {
        name: data.name,
        order: data.order
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      toast.success('Attribute group updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error updating attribute group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute group';
      toast.error(errorMessage);
      
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    },
  });

  // Create a new mutation for adding attributes to a group
  const addAttributeMutation = useMutation({
    mutationFn: async ({ groupId, attributeId }: { groupId: number; attributeId: number }) => {
      return await addAttributeToGroup(groupId, attributeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
    },
    onError: (error: any) => {
      console.error('Error adding attribute to group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add attribute to group';
      toast.error(errorMessage);
    }
  });

  // Create a new mutation for removing attributes from a group
  const removeAttributeMutation = useMutation({
    mutationFn: async ({ groupId, itemId }: { groupId: number; itemId: number }) => {
      return await removeAttributeFromGroup(groupId, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
    },
    onError: (error: any) => {
      console.error('Error removing attribute from group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to remove attribute from group';
      toast.error(errorMessage);
    }
  });

  // Create a new mutation for reordering items
  const reorderItemsMutation = useMutation({
    mutationFn: async ({ groupId, itemIds }: { groupId: number; itemIds: number[] }) => {
      return await reorderAttributeGroupItems(groupId, itemIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
    },
    onError: (error: any) => {
      console.error('Error reordering attributes in group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to reorder attributes';
      toast.error(errorMessage);
    }
  });

  // Update the createMutation to use our utility
  const createMutation = useMutation({
    mutationFn: async (data: GroupFormValues) => {
      // First create the group without items
      const { name, order } = data;
      return await createAttributeGroup({ name, order });
    },
    onSuccess: (newGroup) => {
      // If there are items to add, add them one by one
      if (formValues.items && formValues.items.length > 0) {
        Promise.all(
          formValues.items.map((item, index) => 
            addAttributeToGroup(newGroup.id, item.attribute)
          )
        ).then(() => {
          // After adding all attributes, reorder them if needed
          if (formValues.items.length > 1) {
            const itemIds = formValues.items.map(item => item.id).filter(id => id !== undefined) as number[];
            if (itemIds.length > 1) {
              reorderAttributeGroupItems(newGroup.id, itemIds);
            }
          }
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      toast.success('Attribute group created successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error creating attribute group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create attribute group';
      toast.error(errorMessage);
      
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    },
  });

  // Update the deleteMutation to use our utility
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      return await deleteAttributeGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
      toast.success('Attribute group deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting attribute group:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete attribute group';
      toast.error(errorMessage);
    },
  });

  // Update available attributes when attributes or selected group changes
  useEffect(() => {
    if (attributes && selectedGroupId) {
      const group = groups?.find((g: AttributeGroup) => g.id === selectedGroupId);
      if (group) {
        // Filter out attributes that are already in the group
        const groupAttributeIds = group.items.map((item: AttributeGroupItem) => item.attribute);
        setAvailableAttributes(attributes.filter((attr: Attribute) => !groupAttributeIds.includes(attr.id)));
      } else {
        setAvailableAttributes(attributes);
      }
    } else if (attributes) {
      setAvailableAttributes(attributes);
    }
  }, [attributes, selectedGroupId, groups]);

  // Reset form values and errors
  const resetForm = () => {
    setFormValues({
      name: '',
      order: 0,
      items: [],
    });
    setFormErrors({});
    setSelectedGroupId(null);
    setSelectedAttribute(null);
  };

  // Handle opening the edit modal
  const handleEdit = (group: AttributeGroup) => {
    setSelectedGroup(group);
    setSelectedGroupId(group.id);
    setFormValues({
      name: group.name,
      order: group.order,
      items: [...group.items], // Create a copy to avoid mutating the original
    });
    setIsEditModalOpen(true);
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle adding an attribute to the group
  const handleAddAttribute = () => {
    if (selectedAttribute) {
      const newItem = {
        attribute: selectedAttribute,
        order: formValues.items.length,
      };
      
      setFormValues(prev => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
      
      // Update available attributes
      setAvailableAttributes(prev => prev.filter(attr => attr.id !== selectedAttribute));
      setSelectedAttribute(null);
    }
  };

  // Handle removing an attribute from the group
  const handleRemoveAttribute = (attributeId: number) => {
    // Find the attribute to add back to available list
    const attribute = attributes?.find((attr: Attribute) => attr.id === attributeId);
    if (attribute) {
      setAvailableAttributes(prev => [...prev, attribute]);
    }
    
    // Remove the item from the form values
    setFormValues(prev => ({
      ...prev,
      items: prev.items.filter(item => item.attribute !== attributeId),
    }));
  };

  // Handle drag and drop reordering
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      // Find the indices for the dragged and target items
      const activeIndex = formValues.items.findIndex(
        item => (item.id?.toString() || `new-${item.attribute}`) === active.id
      );
      
      const overIndex = formValues.items.findIndex(
        item => (item.id?.toString() || `new-${item.attribute}`) === over.id
      );
      
      // Reorder the items
      const updatedItems = [...formValues.items];
      const [movedItem] = updatedItems.splice(activeIndex, 1);
      updatedItems.splice(overIndex, 0, movedItem);
      
      // Update order values
      const reorderedItems = updatedItems.map((item, index) => ({
        ...item,
        order: index,
      }));
      
      // Update form values
      setFormValues(prev => ({
        ...prev,
        items: reorderedItems,
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formValues.name.trim()) {
      errors.name = 'Name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (selectedGroup && isEditModalOpen) {
      // First update the basic group properties
      updateMutation.mutate({ 
        id: selectedGroup.id, 
        data: { 
          name: formValues.name, 
          order: formValues.order 
        } 
      });
      
      // Track which items were added, removed, or reordered
      const originalItemIds = new Set(selectedGroup.items.map(item => item.attribute));
      const newItemIds = new Set(formValues.items.map(item => item.attribute));
      
      // Find items to add (in new but not in original)
      const itemsToAdd = formValues.items.filter(item => 
        !originalItemIds.has(item.attribute)
      );
      
      // Find items to remove (in original but not in new)
      const itemsToRemove = selectedGroup.items.filter(item => 
        !newItemIds.has(item.attribute)
      );
      
      // Handle removals
      itemsToRemove.forEach(item => {
        if (item.id) {
          removeAttributeMutation.mutate({ 
            groupId: selectedGroup.id, 
            itemId: item.id 
          });
        }
      });
      
      // Handle additions
      itemsToAdd.forEach(item => {
        addAttributeMutation.mutate({ 
          groupId: selectedGroup.id, 
          attributeId: item.attribute 
        });
      });
      
      // If we have existing items that need reordering
      const existingItems = selectedGroup.items.filter(item => 
        newItemIds.has(item.attribute) && item.id
      );
      
      if (existingItems.length > 0) {
        // Get the new order from formValues
        const newOrderMap = new Map(
          formValues.items.map((item, index) => [item.attribute, index])
        );
        
        // Sort existing items according to the new order
        const sortedItems = [...existingItems].sort((a, b) => {
          const orderA = newOrderMap.get(a.attribute) ?? 0;
          const orderB = newOrderMap.get(b.attribute) ?? 0;
          return orderA - orderB;
        });
        
        // If the order has changed, reorder
        const itemIds = sortedItems.map(item => item.id).filter(Boolean) as number[];
        if (itemIds.length > 1) {
          reorderItemsMutation.mutate({ 
            groupId: selectedGroup.id, 
            itemIds 
          });
        }
      }
    } else {
      // For creation, we can just use our existing mutation
      createMutation.mutate({ 
        name: formValues.name, 
        order: formValues.order,
        items: formValues.items
      });
    }
  };

  // Handle attribute group deletion
  const handleDelete = (group: AttributeGroup) => {
    deleteMutation.mutate(group.id);
  };

  // Filter attributes that haven't been assigned yet
  const getUnassignedAttributes = () => {
    if (!attributes || !formValues.items) return [];
    
    // Get attribute IDs already in the form
    const formAttributeIds = formValues.items.map((item: AttributeGroupItem) => item.attribute);
    
    return attributes.filter((attr: Attribute) => 
      !formAttributeIds.includes(attr.id) // Don't show attributes already in the form
    );
  };

  if (!ENABLE_ATTRIBUTE_GROUPS) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-enterprise-900">Attribute Groups</h1>
        <p className="text-enterprise-600 mt-1">
          {attributeGroupsConfig.description}
        </p>
      </div>

      {isLoadingGroups ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : groupsError ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-danger-500 p-8">
              <AlertCircle className="h-6 w-6 mr-2" />
              <p>Failed to load attribute groups. Please try again.</p>
            </div>
            <div className="flex justify-center mt-4">
              <Button onClick={() => refetchGroups()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-enterprise-500">
              {groups?.length || 0} attribute groups available
            </p>
            {isStaff && (
              <Button onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Group
              </Button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Attribute Groups</CardTitle>
              <CardDescription>
                {attributeGroupsConfig.groupDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups?.length > 0 ? (
                    groups.map((group: AttributeGroup) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.order}</TableCell>
                        <TableCell>
                          {group.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {group.items.slice(0, 3).map((item) => {
                                const attribute = attributes?.find((a: Attribute) => a.id === item.attribute);
                                return attribute ? (
                                  <Badge key={item.id} variant="outline" className="bg-slate-100">
                                    {attribute.label}
                                  </Badge>
                                ) : null;
                              })}
                              {group.items.length > 3 && (
                                <Badge variant="outline" className="bg-slate-100">
                                  +{group.items.length - 3} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">No attributes</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(group)}
                                    disabled={!isStaff}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isStaff ? 'Edit group' : 'Read-only mode'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (isStaff) {
                                        document.getElementById(`delete-dialog-${group.id}`)?.click();
                                      }
                                    }}
                                    disabled={!isStaff}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isStaff ? 'Delete group' : 'Read-only mode'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                        No attribute groups found. Create your first group to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* AlertDialogs for delete confirmation */}
              {groups?.map((group: AttributeGroup) => (
                <AlertDialog key={`alert-${group.id}`}>
                  <AlertDialogTrigger className="hidden" id={`delete-dialog-${group.id}`}>
                    Open
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Attribute Group</AlertDialogTitle>
                      <AlertDialogDescription>
                        {attributeGroupsConfig.deleteConfirmationText}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(group)}
                        className="bg-danger-500 hover:bg-danger-600 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Attribute Group Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Attribute Group</DialogTitle>
            <DialogDescription>
              {attributeGroupsConfig.createModalDescription}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Technical Specifications, Marketing"
                  className={formErrors.name ? 'border-danger-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-danger-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order">
                  Display Order
                </Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  value={formValues.order}
                  onChange={handleInputChange}
                  min={0}
                />
                <p className="text-xs text-slate-500">
                  Lower numbers display first
                </p>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label>Attributes in this group</Label>
                
                {/* Attribute selector */}
                <div className="flex space-x-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedAttribute || ''}
                    onChange={(e) => setSelectedAttribute(Number(e.target.value))}
                    disabled={isLoadingAttributes || getUnassignedAttributes().length === 0}
                  >
                    <option value="">Select an attribute</option>
                    {getUnassignedAttributes().map((attr: Attribute) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.label} ({attr.data_type})
                      </option>
                    ))}
                  </select>
                  <Button 
                    type="button" 
                    onClick={handleAddAttribute}
                    disabled={createMutation.isPending || updateMutation.isPending || !selectedAttribute}
                  >
                    Add
                  </Button>
                </div>
                
                {/* Draggable attribute list */}
                <div className="mt-4 border rounded-md p-3 min-h-[100px] bg-slate-50">
                  {formValues.items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      No attributes added yet. Add attributes from the selector above.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={formValues.items.map(item => item.id?.toString() || `new-${item.attribute}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {formValues.items.map((item) => (
                          <SortableAttributeItem
                            key={item.id?.toString() || `new-${item.attribute}`}
                            item={item}
                            attributes={attributes || []}
                            onRemove={handleRemoveAttribute}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Attribute Group Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attribute Group</DialogTitle>
            <DialogDescription>
              {attributeGroupsConfig.editModalDescription}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Name <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Technical Specifications, Marketing"
                  className={formErrors.name ? 'border-danger-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-sm text-danger-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-order">
                  Display Order
                </Label>
                <Input
                  id="edit-order"
                  name="order"
                  type="number"
                  value={formValues.order}
                  onChange={handleInputChange}
                  min={0}
                />
                <p className="text-xs text-slate-500">
                  Lower numbers display first
                </p>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label>Attributes in this group</Label>
                
                {/* Attribute selector */}
                <div className="flex space-x-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedAttribute || ''}
                    onChange={(e) => setSelectedAttribute(Number(e.target.value))}
                    disabled={isLoadingAttributes || getUnassignedAttributes().length === 0}
                  >
                    <option value="">Select an attribute</option>
                    {getUnassignedAttributes().map((attr: Attribute) => (
                      <option key={attr.id} value={attr.id}>
                        {attr.label} ({attr.data_type})
                      </option>
                    ))}
                  </select>
                  <Button 
                    type="button" 
                    onClick={handleAddAttribute}
                    disabled={createMutation.isPending || updateMutation.isPending || !selectedAttribute}
                  >
                    Add
                  </Button>
                </div>
                
                {/* Draggable attribute list */}
                <div className="mt-4 border rounded-md p-3 min-h-[100px] bg-slate-50">
                  {formValues.items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      No attributes added yet. Add attributes from the selector above.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={formValues.items.map(item => item.id?.toString() || `new-${item.attribute}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {formValues.items.map((item) => (
                          <SortableAttributeItem
                            key={item.id?.toString() || `new-${item.attribute}`}
                            item={item}
                            attributes={attributes || []}
                            onRemove={handleRemoveAttribute}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributeGroupsPage; 