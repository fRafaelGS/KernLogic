import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/domains/core/components/ui/input';
import { Button } from '@/domains/core/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/domains/core/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/domains/core/components/ui/dialog';
import { Label } from '@/domains/core/components/ui/label';
import { Search, Plus, Edit2, Trash2, Check, X, Save } from 'lucide-react';
import { Switch } from '@/domains/core/components/ui/switch';
import { Badge } from '@/domains/core/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/domains/core/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { toast } from 'sonner';
import { Product } from '@/services/productService';

interface Attribute {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  unit?: string;
  required?: boolean;
  visible_storefront?: boolean;
  visible_search?: boolean;
}

// Mock attributes data
const mockAttributes: Attribute[] = [
  { 
    id: 'attr1', 
    name: 'Weight', 
    value: '2.5', 
    type: 'number', 
    unit: 'kg',
    required: true,
    visible_storefront: true,
    visible_search: true
  },
  { 
    id: 'attr2', 
    name: 'Material', 
    value: 'Aluminum', 
    type: 'text',
    required: false,
    visible_storefront: true,
    visible_search: true
  },
  { 
    id: 'attr3', 
    name: 'Dimensions', 
    value: '15 x 10 x 5', 
    type: 'text',
    unit: 'cm',
    required: true,
    visible_storefront: true,
    visible_search: true
  },
  { 
    id: 'attr4', 
    name: 'Warranty', 
    value: '2', 
    type: 'number',
    unit: 'years',
    required: false,
    visible_storefront: true,
    visible_search: false
  },
  { 
    id: 'attr5', 
    name: 'Water Resistant', 
    value: 'true', 
    type: 'boolean',
    required: false,
    visible_storefront: true,
    visible_search: true
  },
  { 
    id: 'attr6', 
    name: 'Color', 
    value: 'Black', 
    type: 'select',
    options: ['Black', 'White', 'Silver', 'Blue', 'Red'],
    required: true,
    visible_storefront: true,
    visible_search: true
  }
];

// Mock attribute templates for categories
const mockTemplates = [
  { name: 'Electronics', attributes: ['Weight', 'Dimensions', 'Warranty', 'Color'] },
  { name: 'Clothing', attributes: ['Size', 'Color', 'Material', 'Care Instructions'] },
  { name: 'Furniture', attributes: ['Dimensions', 'Weight', 'Material', 'Assembly Required'] }
];

interface ProductDetailAttributesProps {
  product: Product;
  onSave?: (attributes: Attribute[]) => Promise<void>;
  readOnly?: boolean;
}

export function ProductDetailAttributes({ product, onSave, readOnly = false }: ProductDetailAttributesProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewAttributeDialogOpen, setIsNewAttributeDialogOpen] = useState(false);
  const [newAttribute, setNewAttribute] = useState<Omit<Attribute, 'id'>>({
    name: '',
    value: '',
    type: 'text',
    visible_storefront: true,
    visible_search: true,
    required: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Load attributes (would normally fetch from API)
  useEffect(() => {
    // Simulate API loading
    setLoading(true);
    setTimeout(() => {
      setAttributes(mockAttributes);
      setLoading(false);
    }, 500);
  }, [product.id]);
  
  // Filter attributes based on search
  const filteredAttributes = attributes.filter(attr => 
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    attr.value.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle search with debounce
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  };
  
  // Handle adding new attribute
  const handleAddAttribute = () => {
    if (!newAttribute.name.trim()) {
      toast.error('Attribute name is required');
      return;
    }
    
    const newId = `attr${Date.now()}`;
    const attributeToAdd = {
      ...newAttribute,
      id: newId
    };
    
    setAttributes(prev => [...prev, attributeToAdd]);
    setIsNewAttributeDialogOpen(false);
    
    // Reset form
    setNewAttribute({
      name: '',
      value: '',
      type: 'text',
      visible_storefront: true,
      visible_search: true,
      required: false
    });
    
    toast.success(`Attribute "${newAttribute.name}" added`);
    
    // Save changes if onSave is provided
    if (onSave) {
      const updatedAttributes = [...attributes, attributeToAdd];
      onSave(updatedAttributes).catch(() => {
        // Rollback on error
        setAttributes(attributes);
        toast.error('Failed to save attribute');
      });
    }
  };
  
  // Handle editing attribute value
  const startEditing = (attribute: Attribute) => {
    if (readOnly) return;
    setEditingId(attribute.id);
    setEditValue(attribute.value);
  };
  
  // Save edited value
  const saveEdit = (attribute: Attribute) => {
    const updatedAttributes = attributes.map(attr => 
      attr.id === attribute.id ? { ...attr, value: editValue } : attr
    );
    
    setAttributes(updatedAttributes);
    setEditingId(null);
    
    if (onSave) {
      setLoading(true);
      onSave(updatedAttributes)
        .then(() => {
          toast.success(`Updated ${attribute.name}`);
        })
        .catch(() => {
          // Rollback on error
          setAttributes(attributes);
          toast.error(`Failed to update ${attribute.name}`);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
  };
  
  // Handle deleting attribute
  const handleDeleteAttribute = (attributeId: string) => {
    if (readOnly) return;
    
    const attributeToDelete = attributes.find(attr => attr.id === attributeId);
    if (!attributeToDelete) return;
    
    const updatedAttributes = attributes.filter(attr => attr.id !== attributeId);
    setAttributes(updatedAttributes);
    
    toast.success(`Removed attribute "${attributeToDelete.name}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          setAttributes(attributes);
          toast.info(`Restored attribute "${attributeToDelete.name}"`);
        }
      }
    });
    
    if (onSave) {
      onSave(updatedAttributes).catch(() => {
        // Rollback on error
        setAttributes(attributes);
        toast.error('Failed to delete attribute');
      });
    }
  };
  
  // Render value based on attribute type
  const renderValue = (attribute: Attribute) => {
    if (editingId === attribute.id) {
      switch (attribute.type) {
        case 'boolean':
          return (
            <div className="flex items-center space-x-2">
              <Switch 
                checked={editValue === 'true'} 
                onCheckedChange={(checked) => setEditValue(checked ? 'true' : 'false')} 
              />
              <span>{editValue === 'true' ? 'Yes' : 'No'}</span>
            </div>
          );
        case 'select':
          return (
            <select
              className="w-full p-2 border rounded"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            >
              {attribute.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        default:
          return (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
          );
      }
    }
    
    switch (attribute.type) {
      case 'boolean':
        return (
          <Badge variant="outline" className={attribute.value === 'true' ? 'bg-success-50 text-success-700' : 'bg-slate-50'}>
            {attribute.value === 'true' ? 'Yes' : 'No'}
          </Badge>
        );
      case 'number':
        return (
          <span>
            {attribute.value} {attribute.unit}
          </span>
        );
      default:
        return attribute.value;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search attributes..."
            className="pl-9"
            onChange={handleSearch}
          />
        </div>
        
        {!readOnly && (
          <Button variant="primary" size="sm" onClick={() => setIsNewAttributeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Attribute
          </Button>
        )}
      </div>
      
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-40 bg-slate-200 rounded"/>
                <div className="h-4 w-60 bg-slate-200 rounded"/>
                <div className="h-4 w-52 bg-slate-200 rounded"/>
              </div>
            </div>
          ) : filteredAttributes.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              {searchTerm ? (
                <>
                  <p className="mb-2">No attributes matching "{searchTerm}"</p>
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <p className="mb-2">No attributes defined for this product</p>
                  {!readOnly && (
                    <Button variant="outline" size="sm" onClick={() => setIsNewAttributeDialogOpen(true)}>
                      Add your first attribute
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Name</TableHead>
                  <TableHead className="w-1/2">Value</TableHead>
                  <TableHead className="w-1/8">Visibility</TableHead>
                  <TableHead className="w-1/8 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.map(attribute => (
                  <TableRow key={attribute.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {attribute.name}
                        {attribute.required && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="ml-2 bg-primary-50 text-primary-700 text-[10px] px-1">REQ</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Required attribute</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-h-[36px]">
                        {renderValue(attribute)}
                        {editingId === attribute.id && (
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => saveEdit(attribute)}
                            >
                              <Check className="h-4 w-4 text-success-600" />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-danger-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={attribute.visible_storefront 
                                  ? 'bg-success-50 text-success-700 border-success-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                                }
                              >
                                Store
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{attribute.visible_storefront ? 'Visible' : 'Hidden'} in storefront</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={attribute.visible_search 
                                  ? 'bg-success-50 text-success-700 border-success-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                                }
                              >
                                Search
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{attribute.visible_search ? 'Used' : 'Not used'} in search</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!readOnly && (
                        <div className="flex items-center justify-end gap-1">
                          {editingId !== attribute.id && (
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => startEditing(attribute)}
                            >
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDeleteAttribute(attribute.id)}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500 hover:text-danger-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* New attribute dialog */}
      <Dialog open={isNewAttributeDialogOpen} onOpenChange={setIsNewAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Attribute</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attrName" className="text-right">
                Name *
              </Label>
              <Input
                id="attrName"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute({ ...newAttribute, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g. Weight, Color, Size"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attrType" className="text-right">
                Type
              </Label>
              <select
                id="attrType"
                value={newAttribute.type}
                onChange={(e) => setNewAttribute({ 
                  ...newAttribute, 
                  type: e.target.value as Attribute['type'],
                  // Clear options if type is not select
                  options: e.target.value === 'select' ? [''] : undefined
                })}
                className="col-span-3 p-2 border rounded-md"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Yes/No</option>
                <option value="select">Select (Options)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attrValue" className="text-right">
                Value
              </Label>
              {newAttribute.type === 'boolean' ? (
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch 
                    id="attrValue"
                    checked={newAttribute.value === 'true'} 
                    onCheckedChange={(checked) => 
                      setNewAttribute({ ...newAttribute, value: checked ? 'true' : 'false' })
                    } 
                  />
                  <span>{newAttribute.value === 'true' ? 'Yes' : 'No'}</span>
                </div>
              ) : newAttribute.type === 'select' ? (
                <div className="col-span-3 space-y-2">
                  <Input
                    value={newAttribute.value}
                    onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
                    placeholder="Selected value"
                  />
                  <div className="border p-2 rounded-md space-y-2 max-h-32 overflow-y-auto">
                    {(newAttribute.options || ['']).map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          placeholder={`Option ${index + 1}`}
                          onChange={(e) => {
                            const newOptions = [...(newAttribute.options || [''])];
                            newOptions[index] = e.target.value;
                            setNewAttribute({ ...newAttribute, options: newOptions });
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            const newOptions = [...(newAttribute.options || [''])];
                            newOptions.splice(index, 1);
                            if (newOptions.length === 0) newOptions.push('');
                            setNewAttribute({ ...newAttribute, options: newOptions });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const newOptions = [...(newAttribute.options || ['']), ''];
                        setNewAttribute({ ...newAttribute, options: newOptions });
                      }}
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="col-span-3 flex gap-2">
                  <div className="flex-grow">
                    <Input
                      id="attrValue"
                      value={newAttribute.value}
                      type={newAttribute.type === 'number' ? 'number' : 'text'}
                      step={newAttribute.type === 'number' ? '0.01' : undefined}
                      onChange={(e) => setNewAttribute({ ...newAttribute, value: e.target.value })}
                      placeholder={newAttribute.type === 'number' ? '0.00' : 'Value'}
                    />
                  </div>
                  {newAttribute.type === 'number' && (
                    <div className="w-24">
                      <Input
                        placeholder="Unit"
                        value={newAttribute.unit || ''}
                        onChange={(e) => setNewAttribute({ ...newAttribute, unit: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">
                <Label>Options</Label>
              </div>
              <div className="col-span-3 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="required"
                    checked={newAttribute.required || false} 
                    onCheckedChange={(checked) => 
                      setNewAttribute({ ...newAttribute, required: checked })
                    } 
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="visibleStorefront"
                    checked={newAttribute.visible_storefront || false} 
                    onCheckedChange={(checked) => 
                      setNewAttribute({ ...newAttribute, visible_storefront: checked })
                    } 
                  />
                  <Label htmlFor="visibleStorefront">Show in storefront</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="visibleSearch"
                    checked={newAttribute.visible_search || false} 
                    onCheckedChange={(checked) => 
                      setNewAttribute({ ...newAttribute, visible_search: checked })
                    } 
                  />
                  <Label htmlFor="visibleSearch">Searchable</Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewAttributeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAttribute}>
              Add Attribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Suggested attributes from templates */}
      {attributes.length === 0 && !readOnly && !searchTerm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suggested attributes for {typeof product.category === 'string' 
              ? product.category 
              : Array.isArray(product.category) 
                ? (product.category.length > 0 ? product.category[product.category.length - 1].name : '')
                : product.category?.name || ''}</CardTitle>
          </CardHeader>
          <CardContent>
            {mockTemplates.find(t => t.name === product.category) ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 mb-2">
                  Common attributes for products in this category:
                </p>
                <div className="flex flex-wrap gap-2">
                  {mockTemplates
                    .find(t => t.name === product.category)?.attributes
                    .map((attrName, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100"
                        onClick={() => {
                          setNewAttribute({
                            name: attrName,
                            value: '',
                            type: 'text',
                            visible_storefront: true,
                            visible_search: true,
                            required: false
                          });
                          setIsNewAttributeDialogOpen(true);
                        }}
                      >
                        {attrName}
                      </Badge>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No attribute templates found for {typeof product.category === 'string'
                  ? product.category
                  : Array.isArray(product.category)
                    ? (product.category.length > 0 ? product.category[product.category.length - 1].name : '')
                    : product.category?.name || 'this category'}.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 