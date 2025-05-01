import React, { useState } from 'react';
import { Attribute } from './AttributeValueRow';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";

interface AddAttributeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableAttributes: Attribute[];
  onAddAttribute: (attributeId: number) => void;
  isPending: boolean;
}

/**
 * Modal for adding attributes to a product
 */
const AddAttributeModal: React.FC<AddAttributeModalProps> = ({
  isOpen,
  onOpenChange,
  availableAttributes,
  onAddAttribute,
  isPending
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter attributes by search query
  const filterAttributesByQuery = (attrs: Attribute[], query: string) => {
    if (!query.trim()) return attrs;
    
    const lowerQuery = query.toLowerCase();
    return attrs.filter(attr => 
      attr.code.toLowerCase().includes(lowerQuery) || 
      attr.label.toLowerCase().includes(lowerQuery)
    );
  };
  
  const filteredAttributes = filterAttributesByQuery(availableAttributes, searchQuery);
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Attribute</DialogTitle>
          <DialogDescription>
            Add a new attribute to your product.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Search attributes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[300px]">
              <Command>
                <CommandInput
                  placeholder="Search attributes..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0"
                />
                <CommandList>
                  {filteredAttributes.length === 0 ? (
                    <CommandEmpty>No attributes found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredAttributes.map((attribute) => (
                        <CommandItem
                          key={attribute.id}
                          onSelect={() => onAddAttribute(attribute.id)}
                          className="flex items-center justify-between px-4 py-2 cursor-pointer"
                          disabled={isPending}
                        >
                          <div>
                            <div className="font-medium">{attribute.label}</div>
                            <div className="text-sm text-enterprise-500">{attribute.code}</div>
                          </div>
                          <Badge variant="outline">{attribute.data_type}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(AddAttributeModal); 