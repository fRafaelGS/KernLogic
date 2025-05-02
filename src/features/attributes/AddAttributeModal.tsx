import React, { useState, useEffect } from 'react';
import { Attribute, AttributeValue } from './AttributeValueRow';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Monitor } from 'lucide-react';

interface AddAttributeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableAttributes: Attribute[];
  onAddAttribute: (attribute: Attribute, locale?: string, channel?: string) => void;
  isPending: boolean;
  availableLocales?: Array<{ code: string, label: string }>;
  availableChannels?: Array<{ code: string, label: string }>;
  attributeValues?: Record<string, AttributeValue>;
  selectedLocale?: string;
  selectedChannel?: string;
  groupId?: number | null;
}

/**
 * Modal for adding attributes to a product
 */
const AddAttributeModal: React.FC<AddAttributeModalProps> = ({
  isOpen,
  onOpenChange,
  availableAttributes,
  onAddAttribute,
  isPending,
  availableLocales = [],
  availableChannels = [],
  attributeValues = {},
  selectedLocale: propSelectedLocale = '',
  selectedChannel: propSelectedChannel = '',
  groupId = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<string>(propSelectedLocale || 'default');
  const [selectedChannel, setSelectedChannel] = useState<string>(propSelectedChannel || 'default');
  
  // Initialize locale/channel from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLocale(propSelectedLocale || 'default');
      setSelectedChannel(propSelectedChannel || 'default');
    }
  }, [isOpen, propSelectedLocale, propSelectedChannel]);
  
  // Debug props
  React.useEffect(() => {
    if (isOpen) {
      console.log('AddAttributeModal opened with props:', { 
        attributesCount: availableAttributes?.length,
        localesCount: availableLocales?.length,
        channelsCount: availableChannels?.length,
        defaultLocale: propSelectedLocale,
        defaultChannel: propSelectedChannel,
        groupId
      });
    }
  }, [isOpen, availableAttributes, availableLocales, availableChannels, propSelectedLocale, propSelectedChannel, groupId]);
  
  // Reset state when modal opens or closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedAttribute(null);
      setSelectedLocale(propSelectedLocale || 'default');
      setSelectedChannel(propSelectedChannel || 'default');
      setSearchQuery('');
    }
  }, [isOpen, propSelectedLocale, propSelectedChannel]);
  
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
  
  const handleSelectAttribute = (attribute: Attribute) => {
    console.log('Selected attribute:', attribute);
    setSelectedAttribute(attribute);
  };
  
  const handleAddAttribute = () => {
    if (selectedAttribute) {
      console.log('Adding attribute with locale/channel:', {
        attribute: selectedAttribute,
        locale: selectedLocale === 'default' ? null : selectedLocale,
        channel: selectedChannel === 'default' ? null : selectedChannel
      });
      
      onAddAttribute(
        selectedAttribute,
        selectedLocale === 'default' ? null : selectedLocale,
        selectedChannel === 'default' ? null : selectedChannel
      );
    }
  };
  
  // Add validation for locale/channel requirements
  const isAddButtonDisabled = React.useMemo(() => {
    if (!selectedAttribute) return true;
    if (isPending) return true;
    
    // Check if locale is required but not selected
    if (selectedAttribute.is_localisable && selectedLocale === 'default') {
      return true;
    }
    
    // Check if channel is required but not selected
    if (selectedAttribute.is_scopable && selectedChannel === 'default') {
      return true;
    }
    
    return false;
  }, [selectedAttribute, selectedLocale, selectedChannel, isPending]);
  
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
          {selectedAttribute ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedAttribute.label}</h3>
                  <p className="text-sm text-gray-500">{selectedAttribute.code}</p>
                </div>
                <Badge variant="outline">{selectedAttribute.data_type}</Badge>
              </div>
              
              {/* Always show Locale Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  Locale
                </label>
                <Select
                  value={selectedLocale}
                  onValueChange={setSelectedLocale}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">All locales</SelectItem>
                    {availableLocales.map(locale => (
                      <SelectItem key={locale.code} value={locale.code}>
                        {locale.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Always show Channel Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5" />
                  Channel
                </label>
                <Select
                  value={selectedChannel}
                  onValueChange={setSelectedChannel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">All channels</SelectItem>
                    {availableChannels.map(channel => (
                      <SelectItem key={channel.code} value={channel.code}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedAttribute(null)}
                  size="sm"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleAddAttribute}
                  disabled={isAddButtonDisabled}
                  size="sm"
                >
                  {isPending ? (
                    <>
                      <span className="mr-2">Adding...</span>
                      <span className="animate-spin">⟳</span>
                    </>
                  ) : "Add Attribute"}
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                              onSelect={() => handleSelectAttribute(attribute)}
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
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(AddAttributeModal); 