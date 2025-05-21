import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/domains/core/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { Button } from '@/domains/core/components/ui/button';
import { Badge } from '@/domains/core/components/ui/badge';
import { toast } from '@/domains/core/components/ui/use-toast';
import { SaveIcon, InfoIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/domains/core/components/ui/alert';
import { useImportFieldSchema } from '@/domains/imports/hooks/useImportFieldSchema';
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import { Mapping } from '@/types/import';
import { ImportFieldSchemaEntry, getFamilyAttributes } from '@/services/importService';

interface StepMappingProps {
  sourceHeaders: string[];
  onMappingComplete: (mapping: Mapping) => void;
  fieldSchema?: ImportFieldSchemaEntry[] | null;
  previewData?: any[];
}

// Storage key for saved mapping templates
const MAPPING_STORAGE_KEY = 'kl_last_mapping';

// Field-specific tooltips and help text
const FIELD_TOOLTIPS: Record<string, string> = {
  category: 'Provide breadcrumb path, e.g. Paint > Clear Coats',
  gtin: 'Global Trade Item Number (Barcode/UPC/EAN/ISBN)',
  family: 'Product family for attribute inheritance',
  family_code: 'Product family for attribute inheritance and validation',
  attribute_group: 'Group that contains related attributes',
  attributes: 'JSON format for custom attributes: {"color":"red","size":"large"}',
  channel: 'Sales channel (e.g., web, store, marketplace)',
  locale: 'Language/region code (e.g., en-US, fr-FR)'
};

const StepMapping: React.FC<StepMappingProps> = ({ sourceHeaders, onMappingComplete, fieldSchema: propFieldSchema, previewData = [] }) => {
  const [mapping, setMapping] = useState<Mapping>({});
  const [requiredFieldsMapped, setRequiredFieldsMapped] = useState(false);
  const [nameFieldMapped, setNameFieldMapped] = useState(false);
  const [familyFieldMapped, setFamilyFieldMapped] = useState(false);
  const [attributeHeaderPattern, setAttributeHeaderPattern] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [familyAttributes, setFamilyAttributes] = useState<string[]>([]);
  const [loadingFamilyAttributes, setLoadingFamilyAttributes] = useState(false);
  const [invalidAttributeHeaders, setInvalidAttributeHeaders] = useState<string[]>([]);
  
  // Fetch the field schema if not provided via props
  const { 
    productFieldSchema: apiFieldSchema, 
    attributeHeaderPattern: apiHeaderPattern,
    isLoading, 
    isError 
  } = useImportFieldSchema();
  
  // Use prop schema if provided, otherwise fall back to API schema
  const fieldSchema = propFieldSchema || apiFieldSchema;

  // Track attribute header pattern from API
  useEffect(() => {
    if (apiHeaderPattern) {
      setAttributeHeaderPattern(apiHeaderPattern);
    }
  }, [apiHeaderPattern]);
  
  // Process the schema to sort fields (required first, then alphabetically)
  const sortedFields = React.useMemo(() => {
    if (!fieldSchema) return [];
    
    return [...fieldSchema].sort((a, b) => {
      // Required fields first
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      
      // Then alphabetically by label
      return a.label.localeCompare(b.label);
    });
  }, [fieldSchema]);

  // Check if a header matches the attribute header pattern
  const isAttributeHeader = (header: string): boolean => {
    if (!attributeHeaderPattern) return false;
    try {
      const regex = new RegExp(attributeHeaderPattern);
      return regex.test(header);
    } catch (e) {
      console.error("Invalid regex pattern:", e);
      return false;
    }
  };

  // Extract attribute name from header
  const getAttributeNameFromHeader = (header: string): string => {
    if (!isAttributeHeader(header)) return "";
    
    // Basic extraction - this might need customization based on your actual pattern
    // For example, if pattern is "attr_(.*)", extract the capture group
    const match = header.match(/attr_(.+)/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Fall back to the header itself if the pattern is more complex
    return header;
  };

  // Check if there are any attribute columns in the source headers
  const hasAttributeColumns = React.useMemo(() => {
    return sourceHeaders.some(header => isAttributeHeader(header));
  }, [sourceHeaders, attributeHeaderPattern]);

  // Fetch family attributes when family is selected
  useEffect(() => {
    if (selectedFamily) {
      setLoadingFamilyAttributes(true);
      getFamilyAttributes(selectedFamily)
        .then(response => {
          const attributes = response.data.map((attr: any) => attr.code || attr.name);
          setFamilyAttributes(attributes);
          
          // Check for invalid attribute headers
          const attributeHeaders = sourceHeaders.filter(header => isAttributeHeader(header));
          const invalid = attributeHeaders.filter(header => {
            const attrName = getAttributeNameFromHeader(header);
            return !attributes.includes(attrName);
          });
          
          setInvalidAttributeHeaders(invalid);
        })
        .catch(error => {
          console.error('Error fetching family attributes:', error);
        })
        .finally(() => {
          setLoadingFamilyAttributes(false);
        });
    } else {
      setFamilyAttributes([]);
      setInvalidAttributeHeaders([]);
    }
  }, [selectedFamily, sourceHeaders, attributeHeaderPattern]);

  // Auto-select fields where header matches API field (case-insensitive)
  useEffect(() => {
    if (!fieldSchema) return;
    
    // Try to load saved template first
    const savedMapping = localStorage.getItem(MAPPING_STORAGE_KEY);
    
    if (savedMapping) {
      try {
        const parsedMapping = JSON.parse(savedMapping) as Mapping;
        
        // Check if headers match saved mapping
        const savedHeaders = Object.keys(parsedMapping);
        const matchCount = savedHeaders.filter(h => sourceHeaders.includes(h)).length;
        const matchPercentage = savedHeaders.length > 0 ? (matchCount / savedHeaders.length) * 100 : 0;
        
        // If 70% or more of headers match, use saved mapping
        if (matchPercentage >= 70) {
          const filteredMapping: Mapping = {};
          
          // Only include mappings for headers that exist in current file
          for (const [source, target] of Object.entries(parsedMapping)) {
            if (sourceHeaders.includes(source)) {
              // Verify the target field still exists in the schema
              if (fieldSchema.some(field => field.id === target)) {
                filteredMapping[source] = target;
              }
            }
          }
          
          setMapping(filteredMapping);
          toast({
            title: "Mapping template loaded",
            description: "Previous column mapping was applied.",
          });
          
          // Check required fields and name field
          checkMappingValidity(filteredMapping, fieldSchema);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved mapping:", e);
      }
    }
    
    // Auto-map fields with similar names
    const autoMapping: Mapping = {};
    
    sourceHeaders.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Try to find a matching field by ID or label
      const matchedField = fieldSchema.find(field => {
        // Handle special case for GTIN/Barcode
        if (field.id === 'gtin' && 
            (normalizedHeader.includes('barcode') || 
             normalizedHeader.includes('upc') || 
             normalizedHeader.includes('ean'))) {
          return true;
        }
        
        // Handle special case for family/family_code
        if (field.id === 'family_code' && 
            (normalizedHeader.includes('family'))) {
          return true;
        }
        
        return field.id.toLowerCase() === normalizedHeader || 
               field.label.toLowerCase() === normalizedHeader;
      });
      
      if (matchedField) {
        autoMapping[header] = matchedField.id;
      }
    });
    
    setMapping(autoMapping);
    checkMappingValidity(autoMapping, fieldSchema);
  }, [sourceHeaders, fieldSchema]);

  // Check if required fields are mapped and if name and family are mapped
  const checkMappingValidity = (currentMapping: Mapping, schema: ImportFieldSchemaEntry[]) => {
    if (!schema) return { requiredMapped: false, nameMapped: false, familyMapped: false };
    
    const mappedFields = Object.values(currentMapping);
    
    // Check if all required fields are mapped
    const requiredFields = schema.filter(f => f.required).map(f => f.id);
    const allRequiredMapped = requiredFields.every(field => mappedFields.includes(field));
    setRequiredFieldsMapped(allRequiredMapped);
    
    // Check if name field is mapped (optional but recommended)
    const isNameMapped = mappedFields.includes('name');
    setNameFieldMapped(isNameMapped);
    
    // Check if family field is mapped (needed for attribute values)
    const isFamilyMapped = mappedFields.includes('family_code');
    setFamilyFieldMapped(isFamilyMapped);
    
    return { 
      requiredMapped: allRequiredMapped, 
      nameMapped: isNameMapped, 
      familyMapped: isFamilyMapped 
    };
  };

  // Handle field mapping change
  const handleMappingChange = (source: string, target: string) => {
    // If target is 'skip', it means "do not import" this field
    const newMapping = { ...mapping };
    
    if (target === 'skip') {
      // Remove the mapping if it exists
      delete newMapping[source];
    } else {
      // Add or update the mapping
      newMapping[source] = target;
      
      // If this is a family_code mapping, fetch the family attributes
      if (target === 'family_code') {
        const familyValue = previewData?.[0]?.[source];
        if (familyValue) {
          setSelectedFamily(familyValue);
        }
      }
    }
    
    setMapping(newMapping);
    if (fieldSchema) {
      checkMappingValidity(newMapping, fieldSchema);
    }
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
    if (!requiredFieldsMapped && fieldSchema) {
      const missingFields = fieldSchema
        .filter(f => f.required && !Object.values(mapping).includes(f.id))
        .map(f => f.label)
        .join(', ');
        
      toast({
        title: "Required fields missing",
        description: `Please map the following required fields: ${missingFields}`,
        variant: "destructive"
      });
      return;
    }
    
    // First save the template
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
    
    // Then call the callback
    onMappingComplete(mapping);
  };

  // If still loading the schema, show skeleton loaders
  if (isLoading && !propFieldSchema) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" data-testid="skeleton" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" data-testid="skeleton" />
          <Skeleton className="h-8 w-32" data-testid="skeleton" />
        </div>
        <Skeleton className="h-64 w-full" data-testid="skeleton" />
      </div>
    );
  }

  // If there was an error loading the schema
  if ((isError || !fieldSchema) && !propFieldSchema) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          <AlertCircleIcon className="h-5 w-5 inline mr-2" />
          Error Loading Schema
        </h3>
        <p className="text-red-700">
          Failed to load the field schema. Please try again later or contact support.
        </p>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">Column Mapping</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Map each column from your file to the corresponding field in our system.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {fieldSchema?.filter(f => f.required).map(field => (
            <Badge key={field.id} variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {field.label} *
            </Badge>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <h4 className="text-sm font-medium w-full">Available Fields:</h4>
          {sortedFields.map(field => (
            <TooltipProvider key={field.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`${
                      Object.values(mapping).includes(field.id) 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : field.id === 'family_code'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-50'
                    } cursor-help`}
                  >
                    {field.label}{field.required ? ' *' : ''} 
                    {field.id === 'family_code' && (
                      <span className="ml-1">👪</span>
                    )}
                    {FIELD_TOOLTIPS[field.id] && (
                      <InfoIcon className="h-3 w-3 ml-1 inline" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[200px] text-xs">
                    {FIELD_TOOLTIPS[field.id] || `Field type: ${field.type}`}
                    {field.id === 'family_code' && !familyFieldMapped && hasAttributeColumns && (
                      <span className="block mt-1 text-amber-600 font-medium">
                        Required for attribute columns!
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Show warnings */}
      <div className="space-y-3">
        {/* Name field warning */}
        {!nameFieldMapped && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircleIcon className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-700">
              We recommend mapping the "Name" field for better product identification.
            </AlertDescription>
          </Alert>
        )}

        {/* Family field warning if attribute columns are present */}
        {!familyFieldMapped && hasAttributeColumns && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircleIcon className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-700 font-medium">Family field not mapped</AlertTitle>
            <AlertDescription className="text-amber-700">
              Attribute columns will be ignored without a family. Please map a column to the "Family" field to use attribute values.
            </AlertDescription>
          </Alert>
        )}

        {/* Invalid attribute headers warning */}
        {familyFieldMapped && selectedFamily && invalidAttributeHeaders.length > 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircleIcon className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-700 font-medium">Unknown attributes detected</AlertTitle>
            <AlertDescription className="text-amber-700">
              The following attribute columns don't match any attributes in the "{selectedFamily}" family: 
              <code className="ml-1 bg-amber-100 px-1 rounded">
                {invalidAttributeHeaders.join(', ')}
              </code>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading family attributes indicator */}
        {loadingFamilyAttributes && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span>Checking family attributes...</span>
          </div>
        )}
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
            {sourceHeaders.map(header => {
              const isAttribute = isAttributeHeader(header);
              const isInvalidAttribute = isAttribute && invalidAttributeHeaders.includes(header);
              return (
                <TableRow key={header}>
                  <TableCell className="font-medium">
                    {header}
                    {isAttribute && (
                      <Badge className={`ml-2 ${isInvalidAttribute ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'} hover:bg-gray-200`}>
                        <CheckCircleIcon className={`h-3 w-3 mr-1 ${isInvalidAttribute ? 'text-amber-600' : 'text-green-600'}`} />
                        Attribute {isInvalidAttribute ? '⚠️' : '✓'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[header] || 'skip'}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">-- Do not import --</SelectItem>
                        {sortedFields.map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}{field.required ? ' *' : ''}
                            {field.id === 'family_code' && (
                              <span className="ml-1">👪</span>
                            )}
                            {FIELD_TOOLTIPS[field.id] && (
                              <InfoIcon className="h-3 w-3 ml-1 inline text-muted-foreground" />
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {mapping[header] && fieldSchema && (
                      <div>
                        <code className="bg-muted px-2 py-1 rounded">{mapping[header]}</code>
                        {FIELD_TOOLTIPS[mapping[header]] && (
                          <div className="text-xs mt-1 text-muted-foreground">
                            {FIELD_TOOLTIPS[mapping[header]]}
                          </div>
                        )}
                      </div>
                    )}
                    {isAttribute && !mapping[header] && (
                      <div className="text-xs text-green-600">
                        <p>Will be imported as product attribute</p>
                        {!familyFieldMapped && (
                          <p className="text-amber-600 mt-1">Requires Family to be mapped</p>
                        )}
                        {isInvalidAttribute && familyFieldMapped && (
                          <p className="text-amber-600 mt-1">Not found in family "{selectedFamily}"</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleComplete} disabled={!requiredFieldsMapped}>
          Next
        </Button>
      </div>
    </div>
  );
};

export default StepMapping; 