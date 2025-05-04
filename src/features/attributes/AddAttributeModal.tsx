import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Globe, Monitor, Loader2 } from 'lucide-react';
import { 
  makeAttributeKey, 
  normalizeLocaleOrChannel, 
  filterUnusedAttributes 
} from '@/lib/attributeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Info } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface AddAttributeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableAttributes: Attribute[];
  onAddAttribute: (attribute: Attribute, locale?: string | null, channel?: string | null) => Promise<any>;
  isPending: boolean;
  availableLocales: Array<{ code: string, label: string }>;
  availableChannels: Array<{ code: string, label: string }>;
  selectedLocale: string;
  selectedChannel: string;
  groupId?: number | null;
  attributeValues: Record<string, any>;
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
  availableLocales,
  availableChannels,
  selectedLocale,
  selectedChannel,
  groupId,
  attributeValues
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'advanced'>('standard');
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [attributeLocale, setAttributeLocale] = useState(selectedLocale);
  const [attributeChannel, setAttributeChannel] = useState(selectedChannel);
  const [filteredAttributes, setFilteredAttributes] = useState<Attribute[]>(availableAttributes);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Reset selected attribute and search query when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedAttribute(null);
      setSearchQuery('');
      setAttributeLocale(selectedLocale);
      setAttributeChannel(selectedChannel);
      setFilterType('all');
    }
  }, [isOpen, selectedLocale, selectedChannel]);

  // Update filtered attributes when availableAttributes changes or search query changes
  useEffect(() => {
    let filtered = [...availableAttributes];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(attr => 
        attr.label.toLowerCase().includes(query) ||
        attr.code.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(attr => attr.data_type === filterType);
    }
    
    setFilteredAttributes(filtered);
  }, [availableAttributes, searchQuery, filterType]);

  // Handle the attribute add action
  const handleAddAttribute = async () => {
    if (!selectedAttribute) return;
    
    // Get appropriate locale and channel values
    const locale = attributeLocale === 'default' ? null : attributeLocale;
    const channel = attributeChannel === 'default' ? null : attributeChannel;
    
    try {
      await onAddAttribute(selectedAttribute, locale, channel);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add attribute:', error);
    }
  };

  // Group attributes by type
  const getAttributesByType = () => {
    const grouped: Record<string, Attribute[]> = {
      text: [],
      number: [],
      boolean: [],
      date: []
    };
    
    filteredAttributes.forEach(attr => {
      if (grouped[attr.data_type]) {
        grouped[attr.data_type].push(attr);
      } else {
        grouped.text.push(attr);
      }
    });
    
    return grouped;
  };
  
  const groupedAttributes = getAttributesByType();
  
  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Text';
      case 'number': return 'Number';
      case 'boolean': return 'Boolean';
      case 'date': return 'Date';
      default: return type;
    }
  };
  
  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'number': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'boolean': return 'bg-green-50 text-green-700 border-green-200';
      case 'date': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Attribute</DialogTitle>
          <DialogDescription>
            Select an attribute to add to {groupId ? 'this group' : 'this product'}.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'standard' | 'advanced')}>
          <TabsList className="mb-4 grid grid-cols-2 w-[300px] mx-auto">
            <TabsTrigger value="standard">Standard View</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search attributes..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filteredAttributes.length === 0 ? (
                <div className="py-8 text-center border rounded-md border-dashed">
                  <Info className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
                  <p className="text-muted-foreground">No matching attributes found</p>
                  {searchQuery && (
                    <Button 
                      variant="link" 
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="p-4 space-y-4">
                    {Object.entries(groupedAttributes).map(([type, attrs]) => {
                      if (attrs.length === 0) return null;
                      
                      return (
                        <div key={type} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getTypeColor(type)}>
                              {getTypeLabel(type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{attrs.length} attributes</span>
                          </div>
                          
                          <div className="space-y-1">
                            {attrs.map(attr => (
                              <div 
                                key={attr.id} 
                                className={`p-3 rounded-md cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedAttribute?.id === attr.id ? 'bg-primary/10 border-primary border' : 'border'}`}
                                onClick={() => setSelectedAttribute(attr)}
                              >
                                <div>
                                  <h4 className="font-medium">{attr.label}</h4>
                                  <code className="text-xs text-muted-foreground">{attr.code}</code>
                                </div>
                                <div className="flex items-center gap-2">
                                  {attr.is_localisable && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">This attribute is localisable</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  
                                  {attr.is_scopable && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge variant="outline" className="flex items-center gap-1">
                                            <Monitor className="h-3 w-3" />
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">This attribute is channel-specific</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="advanced">
            <div className="space-y-4">
              <Label htmlFor="attribute-select">Select Attribute</Label>
              <Select 
                value={selectedAttribute ? selectedAttribute.id.toString() : ''} 
                onValueChange={(value) => {
                  const attribute = availableAttributes.find(attr => attr.id.toString() === value);
                  setSelectedAttribute(attribute || null);
                }}
              >
                <SelectTrigger id="attribute-select">
                  <SelectValue placeholder="Select an attribute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Attributes</SelectLabel>
                    {availableAttributes.map((attr) => (
                      <SelectItem key={attr.id} value={attr.id.toString()}>
                        {attr.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {selectedAttribute && (
                <>
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Selected Attribute</h3>
                        <p className="text-sm text-muted-foreground mb-2">{selectedAttribute.label}</p>
                      </div>
                      <Badge variant="outline" className={getTypeColor(selectedAttribute.data_type)}>
                        {getTypeLabel(selectedAttribute.data_type)}
                      </Badge>
                    </div>
                    
                    {selectedAttribute.is_localisable && (
                      <div className="space-y-2">
                        <Label htmlFor="locale-select">Locale</Label>
                        <Select 
                          value={attributeLocale} 
                          onValueChange={setAttributeLocale}
                          disabled={!selectedAttribute.is_localisable}
                        >
                          <SelectTrigger id="locale-select">
                            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Select locale" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">All locales</SelectItem>
                            {availableLocales.map((locale) => (
                              <SelectItem key={locale.code} value={locale.code}>
                                {locale.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {selectedAttribute.is_scopable && (
                      <div className="space-y-2">
                        <Label htmlFor="channel-select">Channel</Label>
                        <Select 
                          value={attributeChannel} 
                          onValueChange={setAttributeChannel}
                          disabled={!selectedAttribute.is_scopable}
                        >
                          <SelectTrigger id="channel-select">
                            <Monitor className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">All channels</SelectItem>
                            {availableChannels.map((channel) => (
                              <SelectItem key={channel.code} value={channel.code}>
                                {channel.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddAttribute}
            disabled={!selectedAttribute || isPending}
          >
            {isPending ? 'Adding...' : 'Add Attribute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAttributeModal; 