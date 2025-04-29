import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { SaveIcon } from 'lucide-react';

interface StepMappingProps {
  sourceHeaders: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

// Available fields in the API
const API_FIELDS = [
  { id: 'name', label: 'Name', required: true },
  { id: 'sku', label: 'SKU', required: true },
  { id: 'price', label: 'Price', required: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'category', label: 'Category', required: false },
  { id: 'brand', label: 'Brand', required: false },
  { id: 'barcode', label: 'Barcode', required: false },
  { id: 'is_active', label: 'Is Active', required: false }
];

// Storage key for saved mapping templates
const MAPPING_STORAGE_KEY = 'kl_last_mapping';

const StepMapping: React.FC<StepMappingProps> = ({ sourceHeaders, onMappingComplete }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [requiredFieldsComplete, setRequiredFieldsComplete] = useState(false);

  // Auto-select fields where header matches API field (case-insensitive)
  useEffect(() => {
    // Try to load saved template first
    const savedMapping = localStorage.getItem(MAPPING_STORAGE_KEY);
    
    if (savedMapping) {
      try {
        const parsedMapping = JSON.parse(savedMapping);
        
        // Check if headers match saved mapping
        const savedHeaders = Object.keys(parsedMapping);
        const matchCount = savedHeaders.filter(h => sourceHeaders.includes(h)).length;
        const matchPercentage = (matchCount / savedHeaders.length) * 100;
        
        // If 70% or more of headers match, use saved mapping
        if (matchPercentage >= 70) {
          const filteredMapping: Record<string, string> = {};
          
          // Only include mappings for headers that exist in current file
          for (const [source, target] of Object.entries(parsedMapping)) {
            if (sourceHeaders.includes(source)) {
              filteredMapping[source] = target;
            }
          }
          
          setMapping(filteredMapping);
          toast({
            title: "Mapping template loaded",
            description: "Previous column mapping was applied.",
          });
          
          // Check if required fields are mapped
          checkRequiredFields(filteredMapping);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved mapping:", e);
      }
    }
    
    // Auto-map fields with similar names
    const autoMapping: Record<string, string> = {};
    
    sourceHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Try to find a matching API field
      const matchedField = API_FIELDS.find(field => 
        field.id.toLowerCase() === normalizedHeader || 
        field.label.toLowerCase() === normalizedHeader
      );
      
      if (matchedField) {
        autoMapping[header] = matchedField.id;
      }
    });
    
    setMapping(autoMapping);
    checkRequiredFields(autoMapping);
  }, [sourceHeaders]);

  // Check if all required fields are mapped
  const checkRequiredFields = (currentMapping: Record<string, string>) => {
    const mappedFields = Object.values(currentMapping);
    const requiredFields = API_FIELDS.filter(f => f.required).map(f => f.id);
    const allRequired = requiredFields.every(field => mappedFields.includes(field));
    setRequiredFieldsComplete(allRequired);
    return allRequired;
  };

  // Handle field mapping change
  const handleMappingChange = (source: string, target: string) => {
    const newMapping = { ...mapping, [source]: target };
    setMapping(newMapping);
    checkRequiredFields(newMapping);
  };

  // Save mapping template
  const saveTemplate = () => {
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
    toast({
      title: "Mapping template saved",
      description: "This mapping will be auto-applied to similar files.",
    });
  };

  // Handle completion
  const handleComplete = () => {
    if (!requiredFieldsComplete) {
      toast({
        title: "Required fields missing",
        description: "Please map all required fields before continuing.",
        variant: "destructive"
      });
      return;
    }
    
    // First save the template
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
    
    // Then call the callback
    onMappingComplete(mapping);
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">Column Mapping</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Map each column from your file to the corresponding field in our system.
        </p>
        <div className="flex flex-wrap gap-2">
          {API_FIELDS.filter(f => f.required).map(field => (
            <Badge key={field.id} variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {field.label} *
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Map Your Columns</h3>
        <Button variant="outline" size="sm" onClick={saveTemplate}>
          <SaveIcon className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source Column</TableHead>
              <TableHead>Map To Field</TableHead>
              <TableHead>Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sourceHeaders.map(header => (
              <TableRow key={header}>
                <TableCell className="font-medium">{header}</TableCell>
                <TableCell>
                  <Select
                    value={mapping[header] || ''}
                    onValueChange={(value) => handleMappingChange(header, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Do not import --</SelectItem>
                      {API_FIELDS.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}{field.required ? ' *' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {mapping[header] && (
                    <code className="bg-muted px-2 py-1 rounded">{mapping[header]}</code>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleComplete} disabled={!requiredFieldsComplete}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default StepMapping; 