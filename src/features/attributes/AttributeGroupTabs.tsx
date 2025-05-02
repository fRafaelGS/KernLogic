import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, LayersIcon, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import AttributeValueRow, { Attribute, AttributeValue, SavingState } from './AttributeValueRow';

export interface AttributeGroup {
  id: number;
  name: string;
  order: number;
  items: Array<{
    id: number;
    attribute: number;
    order: number;
    value?: any;
    value_id?: number;
    locale?: string;
    channel?: string;
  }>;
}

interface AttributeGroupTabsProps {
  groups: AttributeGroup[];
  attributes: Attribute[];
  attributeValues: Record<number, AttributeValue>;
  editableAttributeIds: Record<number, boolean>;
  savingStates: Record<number, SavingState>;
  isStaff: boolean;
  onAddAttributeClick: (groupId: number) => void;
  onEditAttribute: (attributeId: number) => void;
  onCancelEdit: (attributeId: number) => void;
  onSaveNewValue: (attributeId: number, value: any, locale?: string, channel?: string) => void;
  onUpdateValue: (valueId: number, value: any, locale?: string, channel?: string) => void;
  onRemoveAttribute?: (itemId: number, groupId: number) => void;
  availableLocales?: Array<{ code: string, label: string }>;
  availableChannels?: Array<{ code: string, label: string }>;
  makeAttrKey?: (aId: number, l?: string | null, c?: string | null) => string;
}

/**
 * Component for displaying attribute groups as tabs
 */
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
  availableLocales = [],
  availableChannels = [],
  makeAttrKey
}) => {
  // If no groups, show a placeholder
  if (groups.length === 0) {
    return (
      <div className="py-6 text-center text-enterprise-500">
        <LayersIcon className="mx-auto h-8 w-8 text-enterprise-300 mb-2" />
        <p>No attribute groups found.</p>
        <p className="text-sm mt-1">Contact your administrator to set up attribute groups.</p>
      </div>
    );
  }
  
  // Find attribute by ID helper
  const findAttributeById = (id: number): Attribute | undefined => {
    return attributes.find(attr => attr.id === id);
  };
  
  return (
    <Tabs 
      defaultValue={groups[0].id.toString()} 
      className="space-y-4"
    >
      <TabsList className="w-full justify-start">
        {groups.map((group) => (
          <TabsTrigger 
            key={group.id} 
            value={group.id.toString()}
            className="px-4 py-2"
          >
            {group.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {groups.map((group) => (
        <TabsContent key={group.id} value={group.id.toString()} className="pt-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{group.name}</h3>
              {isStaff && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onAddAttributeClick(group.id)}
                  className="h-8"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Add Attribute
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {group.items.length === 0 ? (
                <div className="text-center py-8 text-enterprise-500">
                  <p>No attributes in this group yet.</p>
                  {isStaff && (
                    <Button 
                      variant="link" 
                      onClick={() => onAddAttributeClick(group.id)}
                      className="mt-2"
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      Add your first attribute
                    </Button>
                  )}
                </div>
              ) : (
                group.items.map((item) => {
                  const attribute = findAttributeById(item.attribute);
                  if (!attribute) return null;
                  
                  const isEditable = editableAttributeIds[attribute.id] || false;
                  const attrKey = makeAttrKey ? makeAttrKey(attribute.id, item.locale, item.channel) : attribute.id.toString();
                  const attrValue = attributeValues[attrKey] || attributeValues[attribute.id];
                  
                  // Skip rendering this item if:
                  // 1. It has a specific locale/channel that doesn't match the current value in the parent
                  // 2. And it's not currently being edited
                  // This ensures we only show attributes in their correct locale/channel tab
                  if (!isEditable && attrValue) {
                    // If item has locale or channel that doesn't match the attributeValue
                    // and we're not in edit mode, don't show it
                    const valueLocale = attrValue.locale;
                    const valueChannel = attrValue.channel;
                    
                    // Check if this value should be visible in current context
                    const shouldHide = 
                      // If value has a specific locale that doesn't match item.locale, hide it
                      (valueLocale && item.locale && valueLocale !== item.locale) ||
                      // If value has a specific channel that doesn't match item.channel, hide it
                      (valueChannel && item.channel && valueChannel !== item.channel);
                    
                    // Skip rendering this item if it shouldn't be visible
                    if (shouldHide) {
                      console.log(`Hiding attribute ${attribute.label} with locale=${valueLocale} channel=${valueChannel} because it doesn't match item locale=${item.locale} channel=${item.channel}`);
                      return null;
                    }
                  }
                  
                  return (
                    <div key={makeAttrKey?.(attribute.id, item.locale, item.channel) || `${attribute.id}-${item.locale || 'null'}-${item.channel || 'null'}`} className="flex gap-2">
                      <div className="flex-1">
                        <AttributeValueRow
                          attribute={attribute}
                          value={attrValue}
                          isEditable={isEditable}
                          isNew={!attrValue}
                          onEdit={onEditAttribute}
                          onCancel={onCancelEdit}
                          onSaveNew={onSaveNewValue}
                          onUpdate={onUpdateValue}
                          savingState={savingStates[attribute.id] || 'idle'}
                          isStaff={isStaff}
                          availableLocales={availableLocales}
                          availableChannels={availableChannels}
                        />
                      </div>
                      {isStaff && !isEditable && onRemoveAttribute && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove"
                          onClick={() => onRemoveAttribute(item.id, group.id)}
                          className="mt-2.5 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default React.memo(AttributeGroupTabs); 