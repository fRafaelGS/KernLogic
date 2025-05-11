import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { ENABLE_CUSTOM_ATTRIBUTES } from '@/config/featureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { usePriceMetadata } from '@/hooks/usePriceMetadata'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, AlertCircle, Pencil, Trash, Check, X, InfoIcon } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

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
  is_core?: boolean;
  in_use?: boolean;
}

// Attribute form values interface
interface AttributeFormValues {
  code: string;
  label: string;
  data_type: string;
  is_localisable: boolean;
  is_scopable: boolean;
  currencies?: string[];
  units?: string[];
  options?: string[];
  enableHtmlSanitizer?: boolean;
}

// --- PriceTypeControls ---
function PriceTypeControls({ selectedCurrencies, onChange }: { selectedCurrencies: string[], onChange: (currencies: string[]) => void }) {
  const { currencies, loading } = usePriceMetadata()

  if (loading) return <div className='text-xs text-slate-500'>Loading currencies…</div>

  function handleToggle(code: string) {
    if (selectedCurrencies.includes(code)) {
      onChange(selectedCurrencies.filter(c => c !== code))
    } else {
      onChange([...selectedCurrencies, code])
    }
  }

  return (
    <div className='pt-2'>
      <Label>Currencies</Label>
      <div className='flex flex-wrap gap-2 mt-1'>
        {currencies.map(c => (
          <label key={c.iso_code} className='flex items-center gap-1 text-sm'>
            <input
              type='checkbox'
              checked={selectedCurrencies.includes(c.iso_code)}
              onChange={() => handleToggle(c.iso_code)}
            />
            {c.iso_code} <span className='text-slate-400'>({c.symbol})</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// --- MeasurementTypeControls ---
const DEFAULT_UNITS = ['kg', 'g', 'lb', 'oz', 'cm', 'mm', 'm', 'in', 'ft', 'l', 'ml']

function MeasurementTypeControls({ selectedUnits, onChange }: { selectedUnits: string[], onChange: (units: string[]) => void }) {
  function handleToggle(unit: string) {
    if (selectedUnits.includes(unit)) {
      onChange(selectedUnits.filter(u => u !== unit))
    } else {
      onChange([...selectedUnits, unit])
    }
  }

  return (
    <div className='pt-2'>
      <Label>Units</Label>
      <div className='flex flex-wrap gap-2 mt-1'>
        {DEFAULT_UNITS.map(unit => (
          <label key={unit} className='flex items-center gap-1 text-sm'>
            <input
              type='checkbox'
              checked={selectedUnits.includes(unit)}
              onChange={() => handleToggle(unit)}
            />
            {unit}
          </label>
        ))}
      </div>
      <div className='mt-2'>
        <Label htmlFor='custom-units' className='text-xs'>Custom units (comma separated)</Label>
        <input
          id='custom-units'
          type='text'
          className='border rounded px-2 py-1 text-xs w-full mt-1'
          placeholder='e.g. box, pack'
          value={selectedUnits.filter(u => !DEFAULT_UNITS.includes(u)).join(', ')}
          onChange={e => {
            const custom = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            const merged = [...DEFAULT_UNITS.filter(u => selectedUnits.includes(u)), ...custom]
            onChange(merged)
          }}
        />
      </div>
    </div>
  )
}

function OptionListEditor({ options, onChange }: { options: string[], onChange: (options: string[]) => void }) {
  const [input, setInput] = useState('')
  function addOption() {
    const val = input.trim()
    if (val && !options.includes(val)) {
      onChange([...options, val])
      setInput('')
    }
  }
  function removeOption(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }
  function editOption(idx: number, val: string) {
    const newOpts = [...options]
    newOpts[idx] = val
    onChange(newOpts)
  }
  return (
    <div className='pt-2'>
      <Label>Options</Label>
      <div className='flex gap-2 mt-1'>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addOption() }}
          placeholder='Add option'
        />
        <Button type='button' onClick={addOption}>Add</Button>
      </div>
      <ul className='mt-2 space-y-1'>
        {options.map((opt, i) => (
          <li key={i} className='flex items-center gap-2'>
            <Input
              value={opt}
              onChange={e => editOption(i, e.target.value)}
              className='w-40'
            />
            <Button type='button' variant='ghost' onClick={() => removeOption(i)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const AttributesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // const isStaff = (user as any)?.is_staff || false;

  // Add debug logs
  console.log("User in AttributesPage:", user);
  console.log("Original isStaff value:", (user as any)?.is_staff || false);

  // Temporarily force isStaff to true for testing
  const isStaff = true;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [formValues, setFormValues] = useState<AttributeFormValues>({
    code: '',
    label: '',
    data_type: 'text',
    is_localisable: false,
    is_scopable: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch attributes
  const { data: attributes, isLoading, error, refetch } = useQuery({
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

  // Create attribute mutation
  const createMutation = useMutation({
    mutationFn: async (data: AttributeFormValues) => {
      const response = await axiosInstance.post(paths.attributes.root(), data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success('Attribute created successfully');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error creating attribute:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create attribute';
      toast.error(errorMessage);
      
      // Set form errors if returned from API
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    },
  });

  // Update attribute mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AttributeFormValues }) => {
      const response = await axiosInstance.patch(paths.attributes.byId(id), data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success('Attribute updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error updating attribute:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update attribute';
      toast.error(errorMessage);
      
      // Set form errors if returned from API
      if (error.response?.data) {
        setFormErrors(error.response.data);
      }
    },
  });

  // Delete attribute mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Add staff gate
      if (!isStaff) {
        toast.error('Read-only tenant');
        throw new Error('Permission denied');
      }
      
      await axiosInstance.delete(paths.attributes.byId(id), {
        headers: {
          'Accept': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast.success('Attribute deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting attribute:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete attribute';
      toast.error(errorMessage);
    },
  });

  // Reset form values and errors
  const resetForm = () => {
    setFormValues({
      code: '',
      label: '',
      data_type: 'text',
      is_localisable: false,
      is_scopable: false,
    });
    setFormErrors({});
  };

  // Handle opening the edit modal
  const handleEdit = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setFormValues({
      code: attribute.code,
      label: attribute.label,
      data_type: attribute.data_type,
      is_localisable: attribute.is_localisable,
      is_scopable: attribute.is_scopable,
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

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
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

  // Handle switch change
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormValues(prev => ({ ...prev, [name]: checked }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formValues.code.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[a-z0-9_]+$/.test(formValues.code)) {
      errors.code = 'Code must contain only lowercase letters, numbers, and underscores';
    }
    
    if (!formValues.label.trim()) {
      errors.label = 'Label is required';
    }
    
    if (!formValues.data_type) {
      errors.data_type = 'Data type is required';
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
    
    if (selectedAttribute && isEditModalOpen) {
      updateMutation.mutate({ id: selectedAttribute.id, data: formValues });
    } else {
      createMutation.mutate(formValues);
    }
  };

  // Handle attribute deletion
  const handleDelete = (attribute: Attribute) => {
    if (attribute.is_core) {
      toast.error('Core attributes cannot be deleted');
      return;
    }
    
    if (attribute.in_use) {
      toast.error('Attributes in use cannot be deleted');
      return;
    }
    
    deleteMutation.mutate(attribute.id);
  };

  // Categorize attributes by data type for display
  const categorizedAttributes = (attributes && Array.isArray(attributes)) 
    ? attributes.reduce((acc: Record<string, Attribute[]>, attr: Attribute) => {
        const category = attr.data_type;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(attr);
        return acc;
      }, {})
    : {};

  if (!ENABLE_CUSTOM_ATTRIBUTES) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-enterprise-900">Attributes</h1>
        <p className="text-enterprise-600 mt-1">
          Manage product attributes that can be assigned to products.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-danger-500 p-8">
              <AlertCircle className="h-6 w-6 mr-2" />
              <p>Failed to load attributes. Please try again.</p>
            </div>
            <div className="flex justify-center mt-4">
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className="text-sm text-enterprise-500">
              {attributes?.length || 0} attributes available
            </p>
            {isStaff && (
              <Button onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Attribute
              </Button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Attribute Definitions</CardTitle>
              <CardDescription>
                Define attributes that can be assigned to products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Localisable</TableHead>
                    <TableHead>Scopable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributes?.length > 0 ? (
                    attributes.map((attribute: Attribute) => (
                      <TableRow key={attribute.id}>
                        <TableCell className="font-medium">
                          {attribute.code}
                          {attribute.is_core && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                              Core
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{attribute.label}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {attribute.data_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attribute.is_localisable ? (
                            <Check className="h-4 w-4 text-success-500" />
                          ) : (
                            <X className="h-4 w-4 text-slate-300" />
                          )}
                        </TableCell>
                        <TableCell>
                          {attribute.is_scopable ? (
                            <Check className="h-4 w-4 text-success-500" />
                          ) : (
                            <X className="h-4 w-4 text-slate-300" />
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
                                    onClick={() => handleEdit(attribute)}
                                    disabled={attribute.is_core || !isStaff}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {attribute.is_core ? 'Core attributes cannot be edited' : 'Edit attribute'}
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
                                      if (!(attribute.is_core || attribute.in_use || !isStaff)) {
                                        // Open alert dialog programmatically
                                        document.getElementById(`delete-dialog-${attribute.id}`)?.click();
                                      }
                                    }}
                                    disabled={attribute.is_core || attribute.in_use || !isStaff}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {attribute.is_core
                                    ? 'Core attributes cannot be deleted'
                                    : attribute.in_use
                                    ? 'Attributes in use cannot be deleted'
                                    : 'Delete attribute'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        No attributes found. Create your first attribute to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* Move AlertDialogs outside the table structure */}
              {attributes?.length > 0 && 
                attributes.map((attribute: Attribute) => (
                  <AlertDialog key={`alert-${attribute.id}`}>
                    <AlertDialogTrigger className="hidden" id={`delete-dialog-${attribute.id}`}>
                      Open
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the attribute "{attribute.label}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(attribute)}
                          className="bg-danger-500 hover:bg-danger-600 text-white"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ))
              }
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Attribute Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Attribute</DialogTitle>
            <DialogDescription>
              Add a new attribute that can be assigned to products.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formValues.code}
                  onChange={handleInputChange}
                  placeholder="e.g. material, color, weight"
                  className={formErrors.code ? 'border-danger-500' : ''}
                />
                {formErrors.code && (
                  <p className="text-sm text-danger-500">{formErrors.code}</p>
                )}
                <p className="text-xs text-slate-500">
                  Use lowercase letters, numbers, and underscores only
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="label">
                  Label <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="label"
                  name="label"
                  value={formValues.label}
                  onChange={handleInputChange}
                  placeholder="e.g. Material, Color, Weight"
                  className={formErrors.label ? 'border-danger-500' : ''}
                />
                {formErrors.label && (
                  <p className="text-sm text-danger-500">{formErrors.label}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data_type">
                  Data Type <span className="text-danger-500">*</span>
                </Label>
                <Select
                  value={formValues.data_type}
                  onValueChange={(value) => handleSelectChange('data_type', value)}
                >
                  <SelectTrigger 
                    id="data_type"
                    className={formErrors.data_type ? 'border-danger-500' : ''}
                  >
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="rich_text">Rich Text</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="measurement">Measurement</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.data_type && (
                  <p className="text-sm text-danger-500">{formErrors.data_type}</p>
                )}
              </div>
              
              {formValues.data_type === 'price' && (
                <PriceTypeControls
                  selectedCurrencies={formValues.currencies || []}
                  onChange={currencies => setFormValues(prev => ({ ...prev, currencies }))}
                />
              )}
              {formValues.data_type === 'measurement' && (
                <MeasurementTypeControls
                  selectedUnits={formValues.units || []}
                  onChange={units => setFormValues(prev => ({ ...prev, units }))}
                />
              )}
              {['select', 'multiselect'].includes(formValues.data_type) && (
                <OptionListEditor
                  options={formValues.options || []}
                  onChange={options => setFormValues(prev => ({ ...prev, options }))}
                />
              )}
              {formValues.data_type === 'rich_text' && (
                <div className='flex items-center gap-2 pt-2'>
                  <Switch
                    id='enable-html-sanitizer'
                    checked={!!formValues.enableHtmlSanitizer}
                    onCheckedChange={checked => setFormValues(prev => ({ ...prev, enableHtmlSanitizer: checked }))}
                  />
                  <Label htmlFor='enable-html-sanitizer'>Enable HTML sanitizer</Label>
                </div>
              )}
              
              <div className="flex items-center justify-between space-x-2 pt-2">
                <div className="flex flex-col">
                  <Label htmlFor="is_localisable">Localisable</Label>
                  <p className="text-xs text-slate-500">
                    Can have different values per locale
                  </p>
                </div>
                <Switch
                  id="is_localisable"
                  checked={formValues.is_localisable}
                  onCheckedChange={(checked) => handleSwitchChange('is_localisable', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2 pt-2">
                <div className="flex flex-col">
                  <Label htmlFor="is_scopable">Scopable</Label>
                  <p className="text-xs text-slate-500">
                    Can have different values per channel
                  </p>
                </div>
                <Switch
                  id="is_scopable"
                  checked={formValues.is_scopable}
                  onCheckedChange={(checked) => handleSwitchChange('is_scopable', checked)}
                />
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
                  'Create Attribute'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Attribute Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attribute</DialogTitle>
            <DialogDescription>
              Update attribute properties.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">
                  Code
                </Label>
                <Input
                  id="edit-code"
                  name="code"
                  value={formValues.code}
                  onChange={handleInputChange}
                  disabled // Code cannot be changed after creation
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500">
                  The code cannot be changed after creation
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-label">
                  Label <span className="text-danger-500">*</span>
                </Label>
                <Input
                  id="edit-label"
                  name="label"
                  value={formValues.label}
                  onChange={handleInputChange}
                  placeholder="e.g. Material, Color, Weight"
                  className={formErrors.label ? 'border-danger-500' : ''}
                />
                {formErrors.label && (
                  <p className="text-sm text-danger-500">{formErrors.label}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-data-type">
                  Data Type
                </Label>
                <Input
                  id="edit-data-type"
                  value={formValues.data_type}
                  disabled // Data type cannot be changed after creation
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500">
                  The data type cannot be changed after creation
                </p>
              </div>
              
              <div className="flex items-center justify-between space-x-2 pt-2">
                <div className="flex flex-col">
                  <Label htmlFor="edit-is-localisable">Localisable</Label>
                  <p className="text-xs text-slate-500">
                    Can have different values per locale
                  </p>
                </div>
                <Switch
                  id="edit-is-localisable"
                  checked={formValues.is_localisable}
                  onCheckedChange={(checked) => handleSwitchChange('is_localisable', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2 pt-2">
                <div className="flex flex-col">
                  <Label htmlFor="edit-is-scopable">Scopable</Label>
                  <p className="text-xs text-slate-500">
                    Can have different values per channel
                  </p>
                </div>
                <Switch
                  id="edit-is-scopable"
                  checked={formValues.is_scopable}
                  onCheckedChange={(checked) => handleSwitchChange('is_scopable', checked)}
                />
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
                  'Update Attribute'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributesPage; 