import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, LayoutGrid, Tag, Info } from 'lucide-react';
import { AttributeValueRow, Attribute, AttributeValue, SavingState, AttributeGroup } from './index';
import { makeAttributeKey } from '@/lib/attributeUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AttributeGroupTabsProps {
  groups: AttributeGroup[];
  attributes: Attribute[];
  attributeValues: Record<string, AttributeValue>;
  editableAttributeIds: Record<number, boolean>;
  savingStates: Record<number, SavingState>;
  isStaff: boolean;
  onAddAttributeClick: (groupId: number) => void;
  onEditAttribute: (attributeId: number) => void;
  onCancelEdit: (attributeId: number) => void;
  onSaveNewValue: (attributeId: number, value: any) => void;
  onUpdateValue: (valueId: number, value: any) => void;
  onRemoveAttribute: (itemId: number, groupId: number) => void;
  onRemoveAttributeValue: (valueId: number) => void;
  availableLocales: Array<{ code: string, label: string }>;
  availableChannels: Array<{ code: string, label: string }>;
  makeAttrKey?: (attributeId: number, locale?: string | null, channel?: string | null) => string;
  isSettingsContext?: boolean;
  selectedLocale?: string;
  selectedChannel?: string;
}

const AttributeGroupTabs: React.FC<AttributeGroupTabsProps> = ({
  groups,
  attributes,
  attributeValues,
  editableAttributeIds,
  savingStates,
  isStaff,
  onAddAttributeClick,
  onEditAttribute,
  onCancelEdit,
  onSaveNewValue,
  onUpdateValue,
  onRemoveAttribute,
  onRemoveAttributeValue,
  availableLocales,
  availableChannels,
  makeAttrKey = makeAttributeKey,
  isSettingsContext = false,
  selectedLocale = "default",
  selectedChannel = "default"
}) => {
  // Only render if we have groups
  if (!groups || groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-enterprise-500">
          <p>No attribute groups defined yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Find the first group with items for default selection
  const firstGroupWithItems = groups.find(g => g.items && g.items.length > 0);
  const defaultTab = firstGroupWithItems?.id.toString() || groups[0].id.toString();

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <ScrollArea className="w-full">
        <TabsList className="mb-4 w-full h-auto flex flex-wrap gap-1 bg-transparent p-0 justify-start">
          {groups.map((group) => {
            // Count items with values in this group
            const filledItemsCount = group.items?.filter(item => {
              const key = makeAttributeKey(item.attribute, item.locale, item.channel);
              return attributeValues[key]?.value !== undefined && attributeValues[key]?.value !== null;
            }).length || 0;
            
            const totalItemsCount = group.items?.length || 0;
            const completionPercentage = totalItemsCount > 0 
              ? Math.round((filledItemsCount / totalItemsCount) * 100) 
              : 0;
            
            // Determine status color based on completion
            const statusColor = completionPercentage === 100 
              ? 'bg-success-100 text-success-700 border-success-200'
              : completionPercentage > 50 
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-danger-100 text-danger-700 border-danger-200';
            
            return (
              <TooltipProvider key={group.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={group.id.toString()}
                      className="relative border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 px-4 py-2 rounded-md"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span>{group.name}</span>
                      {totalItemsCount > 0 && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs rounded-full w-[18px] h-[18px] p-0 flex items-center justify-center ml-1 ${statusColor}`}
                        >
                          {filledItemsCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center" className="text-xs max-w-[200px]">
                    <p>{group.description || `${group.name} attributes group`}</p>
                    {totalItemsCount > 0 && (
                      <p className="mt-1">{filledItemsCount} of {totalItemsCount} attributes filled ({completionPercentage}%)</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </TabsList>
      </ScrollArea>
      
      {groups.map((group) => (
        <TabsContent 
          key={group.id} 
          value={group.id.toString()}
          className="space-y-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    {group.name}
                  </CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </div>
                
                {isStaff && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddAttributeClick(group.id)}
                          className="gap-1"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add Attribute
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Add a new attribute to this group
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!group.items || group.items.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground border border-dashed rounded-md bg-slate-50">
                  <Info className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p>No attributes added to this group yet.</p>
                  {isStaff && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onAddAttributeClick(group.id)} 
                      className="mt-2"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Attribute
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {group.items.map((item) => {
                    // Find the attribute definition for this item
                    const attribute = attributes.find(a => a.id === item.attribute);
                    if (!attribute) {
                      console.warn(`Could not find attribute definition for ID ${item.attribute}`);
                      return null;
                    }
                    
                    // Get the value for this attribute (may be null)
                    // Look up the value using the item's value_id if present
                    let value = null;
                    if (item.value_id && Object.values(attributeValues).length > 0) {
                      // First try to find by direct value ID
                      value = Object.values(attributeValues).find(v => 
                        v && v.id === item.value_id
                      ) || null;
                      
                      // If not found, try by attribute ID + locale + channel
                      if (!value) {
                        const key = makeAttributeKey(item.attribute, item.locale, item.channel);
                        value = attributeValues[key] || null;
                      }
                    }
                    
                    const isEditable = Boolean(editableAttributeIds[attribute.id]);
                    
                    return (
                      <AttributeValueRow
                        key={`${group.id}-${attribute.id}-${item.id}`}
                        attribute={attribute}
                        value={value}
                        isEditable={isEditable}
                        isNew={isEditable && !value}
                        onEdit={onEditAttribute}
                        onCancel={onCancelEdit}
                        onSaveNew={onSaveNewValue}
                        onUpdate={onUpdateValue}
                        savingState={savingStates[attribute.id] || 'idle'}
                        isStaff={isStaff}
                        availableLocales={availableLocales}
                        availableChannels={availableChannels}
                        isSettingsContext={isSettingsContext}
                        groupName={group.name}
                        selectedLocale={selectedLocale}
                        selectedChannel={selectedChannel}
                        onRemove={
                          // If there's a value with an ID, use attribute value removal
                          value && value.id 
                            ? () => onRemoveAttributeValue(value.id) 
                            // If we're in Settings context and have an item ID, allow removing from group
                            : isSettingsContext && item.id
                              ? () => onRemoveAttribute(item.id, group.id)
                              : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default AttributeGroupTabs; 