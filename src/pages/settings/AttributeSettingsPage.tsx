import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  LayoutGrid, 
  Tag, 
  ListFilter, 
  Trash2, 
  MoreHorizontal, 
  ChevronDown 
} from 'lucide-react';

// Import custom hooks and services
import { useAttributes } from '@/hooks/useAttributes';
import { AttributeService } from '@/services/AttributeService';
import { qkAttributes } from '@/lib/queryKeys';

// Import UI components
import {
  LocaleChannelSelector,
  AttributeValueRow,
  AddAttributeModal,
  AttributeGroupTabs,
  Attribute,
  AttributeGroup
} from '@/features/attributes';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

/**
 * Attribute Settings Page Component
 * 
 * Provides an interface for managing global attribute settings, including:
 * - Creating, editing, and deleting attributes
 * - Managing attribute groups
 * - Configuring attribute properties (localization, channels, data types)
 */
const AttributeSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('attributes');
  const [isCreateAttributeDialogOpen, setIsCreateAttributeDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<Attribute | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<AttributeGroup | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'attribute' | 'group'>('attribute');
  
  // New attribute form state
  const [newAttributeData, setNewAttributeData] = useState({
    code: '',
    label: '',
    data_type: 'text',
    is_localisable: false,
    is_scopable: false
  });
  
  // New group form state
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: ''
  });

  // Add state for select options
  const [newOption, setNewOption] = useState('')
  const [options, setOptions] = useState<{ value: string, label: string }[]>([])

  // Load attribute groups
  const {
    data: attributeGroups = [],
    isLoading: isLoadingGroups,
    error: groupsError
  } = useQuery({
    queryKey: ['attributeGroups'],
    queryFn: async () => {
      // This would be replaced with a proper API call in a real implementation
      return [
        {
          id: 1,
          name: 'Basic Information',
          description: 'Core product details',
          items: []
        },
        {
          id: 2,
          name: 'Technical Specs',
          description: 'Technical specifications',
          items: []
        },
        {
          id: 3,
          name: 'Marketing',
          description: 'Marketing information',
          items: []
        }
      ] as AttributeGroup[];
    }
  });

  // Load attributes using our custom hook
  const {
    attributes,
    isLoading: isLoadingAttributes,
    hasError: hasAttributesError
  } = useAttributes(0, { isSettingsContext: true });

  // Handle creating a new attribute
  const handleCreateAttribute = async () => {
    try {
      // Build payload
      const payload = {
        ...newAttributeData,
        options: newAttributeData.data_type === 'select' ? options : undefined
      }
      // Replace with actual API call in real implementation
      // await axiosInstance.post(paths.attributes.root(), payload)
      toast.success(`Attribute ${newAttributeData.label} created successfully`)
      setIsCreateAttributeDialogOpen(false)
      setNewAttributeData({
        code: '',
        label: '',
        data_type: 'text',
        is_localisable: false,
        is_scopable: false
      })
      setOptions([])
      setNewOption('')
      queryClient.invalidateQueries({ queryKey: qkAttributes() })
    } catch (error) {
      console.error('Error creating attribute:', error)
      toast.error('Failed to create attribute')
    }
  };
  
  // Handle creating a new attribute group
  const handleCreateGroup = async () => {
    try {
      // Replace with actual API call in real implementation
      // const response = await axiosInstance.post(paths.attributeGroups.root(), newGroupData);
      
      // For demo purposes, we'll just fake a success
      toast.success(`Group ${newGroupData.name} created successfully`);
      setIsCreateGroupDialogOpen(false);
      
      // Reset form
      setNewGroupData({
        name: '',
        description: ''
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
    } catch (error) {
      console.error('Error creating attribute group:', error);
      toast.error('Failed to create attribute group');
    }
  };
  
  // Handle attribute deletion
  const handleDeleteAttribute = async () => {
    if (!attributeToDelete) return;
    
    try {
      // Replace with actual API call in real implementation
      // await axiosInstance.delete(paths.attributes.byId(attributeToDelete.id));
      
      // For demo purposes, we'll just fake a success
      toast.success(`Attribute ${attributeToDelete.label} deleted successfully`);
      setConfirmDeleteOpen(false);
      setAttributeToDelete(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: qkAttributes() });
    } catch (error) {
      console.error('Error deleting attribute:', error);
      toast.error('Failed to delete attribute');
    }
  };
  
  // Handle group deletion
  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    
    try {
      // Replace with actual API call in real implementation
      // await axiosInstance.delete(paths.attributeGroups.byId(groupToDelete.id));
      
      // For demo purposes, we'll just fake a success
      toast.success(`Group ${groupToDelete.name} deleted successfully`);
      setConfirmDeleteOpen(false);
      setGroupToDelete(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['attributeGroups'] });
    } catch (error) {
      console.error('Error deleting attribute group:', error);
      toast.error('Failed to delete attribute group');
    }
  };
  
  // Handle opening delete confirmation for attribute
  const confirmDeleteAttribute = (attribute: Attribute) => {
    setAttributeToDelete(attribute);
    setDeleteType('attribute');
    setConfirmDeleteOpen(true);
  };
  
  // Handle opening delete confirmation for group
  const confirmDeleteGroup = (group: AttributeGroup) => {
    setGroupToDelete(group);
    setDeleteType('group');
    setConfirmDeleteOpen(true);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attribute Settings</h1>
          <p className="text-muted-foreground">Manage attributes and attribute groups for your products.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="attributes" className="min-w-[140px]">
            <Tag className="h-4 w-4 mr-2" />
            Attributes
          </TabsTrigger>
          <TabsTrigger value="groups" className="min-w-[140px]">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Attribute Groups
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="attributes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Attributes</h2>
            <Button onClick={() => setIsCreateAttributeDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Attribute
            </Button>
          </div>
          
          {isLoadingAttributes ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : hasAttributesError ? (
            <Card>
              <CardContent className="py-8 text-center text-red-600">
                Error loading attributes. Please try again later.
              </CardContent>
            </Card>
          ) : attributes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="mb-4 text-muted-foreground">No attributes defined yet.</p>
                <Button onClick={() => setIsCreateAttributeDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Attribute
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributes.map(attr => (
                      <TableRow key={attr.id}>
                        <TableCell className="font-medium">{attr.label}</TableCell>
                        <TableCell><code>{attr.code}</code></TableCell>
                        <TableCell>{attr.data_type}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {attr.is_localisable && (
                              <Badge variant="outline" className="bg-blue-50">Localisable</Badge>
                            )}
                            {attr.is_scopable && (
                              <Badge variant="outline" className="bg-green-50">Scopable</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                Edit Attribute
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => confirmDeleteAttribute(attr)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Attribute Groups</h2>
            <Button onClick={() => setIsCreateGroupDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
          
          {isLoadingGroups ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : groupsError ? (
            <Card>
              <CardContent className="py-8 text-center text-red-600">
                Error loading attribute groups. Please try again later.
              </CardContent>
            </Card>
          ) : attributeGroups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="mb-4 text-muted-foreground">No attribute groups defined yet.</p>
                <Button onClick={() => setIsCreateGroupDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {attributeGroups.map(group => (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{group.name}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Manage Attributes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => confirmDeleteGroup(group)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription>
                      {group.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {group.items.length > 0 ? (
                        <p>{group.items.length} attributes in this group</p>
                      ) : (
                        <p>No attributes in this group yet</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-0">
                    <Button variant="outline" size="sm">
                      Manage Attributes
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Attribute Dialog */}
      <Dialog open={isCreateAttributeDialogOpen} onOpenChange={setIsCreateAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Attribute</DialogTitle>
            <DialogDescription>
              Define a new attribute for your products. Attributes can be used to store product information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">
                Label
              </Label>
              <Input
                id="label"
                value={newAttributeData.label}
                onChange={(e) => setNewAttributeData({
                  ...newAttributeData,
                  label: e.target.value,
                  code: e.target.value.toLowerCase().replace(/\s+/g, '_')
                })}
                className="col-span-3"
                placeholder="e.g. Product Weight"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Code
              </Label>
              <Input
                id="code"
                value={newAttributeData.code}
                onChange={(e) => setNewAttributeData({
                  ...newAttributeData,
                  code: e.target.value.toLowerCase().replace(/\s+/g, '_')
                })}
                className="col-span-3"
                placeholder="e.g. product_weight"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Data Type
              </Label>
              <Select
                value={newAttributeData.data_type}
                onValueChange={value => {
                  setNewAttributeData({ ...newAttributeData, data_type: value })
                  if (value !== 'select') setOptions([])
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Options UI for select type */}
            {newAttributeData.data_type === 'select' && (
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label className='text-right'>Options</Label>
                <div className='col-span-3 space-y-2'>
                  <div className='flex gap-2'>
                    <Input
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      placeholder='Add option...'
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newOption.trim()) {
                          setOptions([...options, { value: newOption.trim(), label: newOption.trim() }])
                          setNewOption('')
                        }
                      }}
                    />
                    <Button
                      type='button'
                      onClick={() => {
                        if (newOption.trim()) {
                          setOptions([...options, { value: newOption.trim(), label: newOption.trim() }])
                          setNewOption('')
                        }
                      }}
                      disabled={!newOption.trim()}
                    >Add</Button>
                  </div>
                  {options.length > 0 && (
                    <div className='space-y-1'>
                      {options.map((opt, idx) => (
                        <div key={idx} className='flex items-center gap-2'>
                          <Input
                            value={opt.label}
                            onChange={e => {
                              const updated = [...options]
                              updated[idx] = { ...opt, label: e.target.value, value: e.target.value }
                              setOptions(updated)
                            }}
                            className='w-48'
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                          >Remove</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">
                <Label>Properties</Label>
              </div>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_localisable"
                    checked={newAttributeData.is_localisable}
                    onCheckedChange={(checked) => setNewAttributeData({
                      ...newAttributeData,
                      is_localisable: checked as boolean
                    })}
                  />
                  <Label htmlFor="is_localisable">
                    Localisable (can have different values per language)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_scopable"
                    checked={newAttributeData.is_scopable}
                    onCheckedChange={(checked) => setNewAttributeData({
                      ...newAttributeData,
                      is_scopable: checked as boolean
                    })}
                  />
                  <Label htmlFor="is_scopable">
                    Scopable (can have different values per channel)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAttributeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAttribute}>Create Attribute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Group Dialog */}
      <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Attribute Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize your attributes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="group-name" className="text-right">
                Name
              </Label>
              <Input
                id="group-name"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({
                  ...newGroupData,
                  name: e.target.value
                })}
                className="col-span-3"
                placeholder="e.g. Technical Specifications"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="group-description" className="text-right pt-2">
                Description
              </Label>
              <Input
                id="group-description"
                value={newGroupData.description}
                onChange={(e) => setNewGroupData({
                  ...newGroupData,
                  description: e.target.value
                })}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'attribute' 
                ? `Delete Attribute "${attributeToDelete?.label}"` 
                : `Delete Group "${groupToDelete?.name}"`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'attribute' 
                ? "Are you sure you want to delete this attribute? This action will remove it from all products and cannot be undone."
                : "Are you sure you want to delete this attribute group? Attributes within this group will not be deleted, but they will be unassigned."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteType === 'attribute' ? handleDeleteAttribute : handleDeleteGroup}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AttributeSettingsPage; 