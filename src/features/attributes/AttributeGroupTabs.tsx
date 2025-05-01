import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, LayersIcon } from 'lucide-react';
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
  onSaveNewValue: (attributeId: number, value: any) => void;
  onUpdateValue: (valueId: number, value: any) => void;
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
  onUpdateValue
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
                <div className="p-6 text-center text-enterprise-500 border rounded-md bg-slate-50">
                  No attributes in this group yet.
                </div>
              ) : (
                group.items.map((item) => {
                  const attribute = findAttributeById(item.attribute);
                  if (!attribute) return null;
                  
                  const value = attributeValues[attribute.id];
                  const isEditable = Boolean(editableAttributeIds[attribute.id]);
                  const savingState = savingStates[attribute.id] || 'idle';
                  
                  return (
                    <AttributeValueRow
                      key={item.id}
                      attribute={attribute}
                      value={value || null}
                      isEditable={isEditable}
                      isNew={isEditable && !value}
                      onEdit={onEditAttribute}
                      onCancel={onCancelEdit}
                      onSaveNew={onSaveNewValue}
                      onUpdate={onUpdateValue}
                      savingState={savingState}
                      isStaff={isStaff}
                    />
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