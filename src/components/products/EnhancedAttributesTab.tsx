import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ENABLE_CUSTOM_ATTRIBUTES, ENABLE_ATTRIBUTE_GROUPS } from '@/config/featureFlags';
import { toast } from "sonner";

// Import our custom hook
import { useAttributes } from '@/hooks/useAttributes';

// Import refactored components
import {
  LocaleChannelSelector,
  AttributeValueRow,
  AddAttributeModal,
  AttributeGroupTabs,
  Attribute
} from '@/features/attributes';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  AlertCircle, 
  Filter, 
  Search, 
  FileDown, 
  FileUp, 
  Tag, 
  CircleSlash,
  CheckCircle,
  Activity,
  Circle
} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LOCALES, LocaleCode } from '@/config/locales'
import { CHANNELS, ChannelCode } from '@/config/channels'

interface EnhancedAttributesTabProps {
  productId: number;
}

/**
 * Enhanced version of the AttributesTab component using the new attribute management system
 * This component provides a more maintainable and efficient way to manage product attributes
 */
const EnhancedAttributesTab: React.FC<EnhancedAttributesTabProps> = ({ productId }) => {
  const { user } = useAuth();
  const isStaff = (user as any)?.is_staff || false;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode>(LOCALES[0].code)
  const [selectedChannel, setSelectedChannel] = useState<ChannelCode>(CHANNELS[0].code)

  // Use our custom hook for attribute management
  const {
    // Data
    attributes,
    attributeValues,
    attributeGroups,
    
    // State
    editableAttributeIds,
    savingStates,
    currentGroupId,
    setCurrentGroupId,
    confirmRemoveOpen,
    confirmRemoveType,
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
    getUnassignedAttributes
  } = useAttributes(productId, {
    enableGroups: ENABLE_ATTRIBUTE_GROUPS,
    isStaff,
    isSettingsContext: false
  });

  // Calculate attribute completion metrics
  const calculateAttributeCompletion = () => {
    if (!attributes || attributes.length === 0) return { filled: 0, total: 0, percentage: 0 };
    
    const uniqueAttributes = new Set();
    
    // Get all attributes in groups if using groups
    if (ENABLE_ATTRIBUTE_GROUPS && attributeGroups) {
      attributeGroups.forEach(group => {
        if (group.items) {
          group.items.forEach(item => {
            uniqueAttributes.add(item.attribute);
          });
        }
      });
    } else {
      // Otherwise count all attributes
      attributes.forEach(attr => uniqueAttributes.add(attr.id));
    }
    
    const total = uniqueAttributes.size;
    
    // Count filled attributes
    let filled = 0;
    uniqueAttributes.forEach(attrId => {
      const key = Object.keys(attributeValues).find(k => k.startsWith(`${attrId}::`));
      if (key && attributeValues[key]?.value !== null && attributeValues[key]?.value !== undefined) {
        filled++;
      }
    });
    
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;
    
    return { filled, total, percentage };
  };
  
  const completion = calculateAttributeCompletion();
  
  // Filter attributes based on search query
  const filterAttributes = (attrs) => {
    if (!searchQuery) return attrs;
    
    const lowerQuery = searchQuery.toLowerCase();
    return attrs.filter(attr => 
      attr.label.toLowerCase().includes(lowerQuery) || 
      attr.code.toLowerCase().includes(lowerQuery)
    );
  };
  
  // Function to handle attribute export
  const handleExportAttributes = () => {
    // This would be implemented with actual export functionality
    toast.success("Attribute data exported successfully");
  };
  
  // Function to handle attribute import
  const handleImportAttributes = () => {
    // This would be implemented with actual import functionality
    toast.success("Attribute data imported successfully");
  };

  if (!ENABLE_CUSTOM_ATTRIBUTES) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Product Attributes</h2>
            <p className="text-muted-foreground">
              Manage specifications, technical details, and product information
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search attributes..."
                className="pl-8 md:w-[200px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {isStaff && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Attribute Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleExportAttributes}>
                      <FileDown className="mr-2 h-4 w-4" />
                      <span>Export Attributes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleImportAttributes}>
                      <FileUp className="mr-2 h-4 w-4" />
                      <span>Import Attributes</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isStaff && !ENABLE_ATTRIBUTE_GROUPS && (
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="ml-auto md:ml-0"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Attribute
              </Button>
            )}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-4">
          <LocaleChannelSelector
            selectedLocale={selectedLocale}
            selectedChannel={selectedChannel}
            availableLocales={LOCALES}
            availableChannels={CHANNELS}
            onLocaleChange={setSelectedLocale}
            onChannelChange={setSelectedChannel}
          />
          
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-md">
            <div className="flex flex-col text-xs text-right mr-2">
              <span className="font-semibold">Attributes Completion</span>
              <span className="text-muted-foreground">{completion.filled} of {completion.total} attributes filled</span>
            </div>
            <div className="w-[120px] h-3 relative">
              <Progress value={completion.percentage} className="h-3" />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={
                      completion.percentage === 100 
                        ? "bg-success-100 text-success-700 border-success-200" 
                        : completion.percentage >= 50
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-danger-100 text-danger-700 border-danger-200"
                    }
                  >
                    {completion.percentage}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Attribute completion status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div>
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : hasError ? (
          <Card>
            <CardContent className="flex items-center justify-center text-danger-500 p-8">
              <AlertCircle className="h-6 w-6 mr-2" />
              <p>Failed to load attributes. Please try again later.</p>
            </CardContent>
          </Card>
        ) : ENABLE_ATTRIBUTE_GROUPS ? (
          <AttributeGroupTabs
            groups={attributeGroups}
            attributes={filterAttributes(attributes)}
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
            availableLocales={LOCALES}
            availableChannels={CHANNELS}
            selectedLocale={selectedLocale}
            selectedChannel={selectedChannel}
          />
        ) : attributes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Tag className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No attributes defined yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Attributes help you manage product specifications and details in a structured way.
              </p>
              {isStaff && (
                <Button onClick={() => setIsAddModalOpen(true)} size="lg">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Your First Attribute
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Technical Specifications</CardTitle>
              <CardDescription>
                Product details and specifications for the current locale and channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {searchQuery && filterAttributes(attributes).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CircleSlash className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No attributes match your search query: "{searchQuery}"</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                filterAttributes(attributes).map((attribute: Attribute) => {
                  // Check if this attribute has a value or is being edited
                  const key = Object.keys(attributeValues).find(k => 
                    k.startsWith(`${attribute.id}::`) && 
                    k.includes(`::${selectedLocale === 'default' ? '' : selectedLocale}::`) &&
                    k.includes(`::${selectedChannel === 'default' ? '' : selectedChannel}`)
                  );
                  const value = key ? attributeValues[key] : null;
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
                      availableLocales={LOCALES}
                      availableChannels={CHANNELS}
                      selectedLocale={selectedLocale}
                      selectedChannel={selectedChannel}
                      onRemove={value && value.id ? () => handleRemoveAttributeValue(value.id) : undefined}
                    />
                  );
                })
              )}
            </CardContent>
            {isStaff && !ENABLE_ATTRIBUTE_GROUPS && (
              <CardFooter className="flex justify-center pt-2 pb-6">
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  variant="outline"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
      
      {/* Status panel */}
      {!isLoading && !hasError && (
        <Card className="bg-slate-50 border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 flex items-center gap-1"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Status</span>
                  </Badge>
                  <span className="text-sm font-medium">
                    {completion.percentage === 100 
                      ? 'Complete' 
                      : completion.percentage > 0 
                        ? 'In Progress' 
                        : 'Not Started'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Locale:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {LOCALES.find(l => l.code === selectedLocale)?.label || selectedLocale}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Channel:</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {CHANNELS.find(c => c.code === selectedChannel)?.label || selectedChannel}
                  </Badge>
                </div>
              </div>
              
              <div>
                {completion.percentage === 100 ? (
                  <div className="flex items-center text-success-600 font-medium">
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    All attributes completed
                  </div>
                ) : (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        View Attribute Checklist
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Attribute Completion Checklist</SheetTitle>
                        <SheetDescription>
                          Track which attributes still need to be filled for this product
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        {/* Attribute checklist would go here */}
                        <div className="border rounded-lg divide-y">
                          {attributes.map(attr => {
                            const key = Object.keys(attributeValues).find(k => 
                              k.startsWith(`${attr.id}::`)
                            );
                            const hasValue = key && attributeValues[key]?.value !== null && attributeValues[key]?.value !== undefined;
                            
                            return (
                              <div key={attr.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                  {hasValue ? (
                                    <CheckCircle className="h-4 w-4 text-success-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span>{attr.label}</span>
                                </div>
                                {!hasValue && isStaff && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      handleEditAttribute(attr.id);
                                    }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <AddAttributeModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        availableAttributes={getUnassignedAttributes()}
        onAddAttribute={handleAddAttribute}
        isPending={false}
        availableLocales={LOCALES}
        availableChannels={CHANNELS}
        selectedLocale={selectedLocale}
        selectedChannel={selectedChannel}
        groupId={currentGroupId}
        attributeValues={attributeValues}
      />
      
      <AlertDialog open={confirmRemoveOpen}>
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

export default EnhancedAttributesTab; 