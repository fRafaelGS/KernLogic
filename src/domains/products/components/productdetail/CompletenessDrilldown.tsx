import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetClose
} from "@/domains/core/components/ui/sheet";
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/domains/core/components/ui/table";
import { Progress } from "@/domains/core/components/ui/progress";
import { Button } from "@/domains/core/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/domains/core/components/ui/tooltip";
import { FieldCompletenessEntry } from '@/services/dashboardService';
import { config } from '@/config/config';

// Temporary compatibility layer during migration
const completenessConfig = {
  title: 'Data Completeness Details',
  description: 'Review the completeness of your product data fields',
  labels: {
    overallCompleteness: 'Overall Completeness',
    fieldCompleteness: 'Field Completeness',
    attributeCompleteness: 'Attribute Completeness',
    field: 'Field',
    attribute: 'Attribute',
    status: 'Status',
    weight: 'Weight',
    completeFields: 'Complete fields:',
    missingFields: 'Missing fields:',
    completeAttributes: 'Complete attributes:',
    missingAttributes: 'Missing attributes:'
  },
  statuses: {
    complete: 'Complete',
    missing: 'Missing'
  },
  completenessLevels: {
    poor: { text: 'Poor', threshold: 60 },
    fair: { text: 'Fair', threshold: 80 },
    good: { text: 'Good', threshold: 95 },
    excellent: { text: 'Excellent' }
  },
  weightTooltips: {
    field: {
      high: 'Essential fields have higher weight (2×)',
      medium: 'Important fields have medium weight (1.5×)',
      low: 'Optional fields have base weight (1×)'
    },
    attribute: {
      high: 'Essential attributes have higher weight (2×)',
      medium: 'Important attributes have medium weight (1.5×)',
      low: 'Optional attributes have base weight (1×)'
    }
  },
  buttons: {
    close: 'Close'
  }
};

// Keep this for backward compatibility during transition
interface FieldStatus {
  key: string;
  label: string;
  weight: number;
  complete: boolean;
}

interface CompletenessDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  percentage: number;
  fieldStatus: FieldCompletenessEntry[] | FieldStatus[];
}

export const CompletenessDrilldown: React.FC<CompletenessDrilldownProps> = ({
  open,
  onOpenChange,
  percentage,
  fieldStatus
}) => {
  // Normalize field status entries to work with both old and new formats
  const normalizedFields = fieldStatus.map(field => {
    // Check if this is the new format (FieldCompletenessEntry from API)
    if ('field' in field) {
      return {
        key: `field_${field.attribute_id || field.field}`,
        label: field.field,
        weight: field.weight,
        complete: field.complete,
        attribute_id: field.attribute_id,
        attribute_code: field.attribute_code,
        attribute_type: field.attribute_type
      };
    }
    // Otherwise it's the old format (FieldStatus from client calculation)
    return field;
  });
  
  // Group fields by completeness status and type
  const completeFields = normalizedFields.filter(field => field.complete);
  const incompleteFields = normalizedFields.filter(field => !field.complete);
  
  // Separate standard fields from attribute fields
  const standardFields = normalizedFields.filter(field => {
    // For the old format
    if (!('attribute_id' in field)) {
      return !field.key.startsWith('attr_');
    }
    // For the new format
    return !field.attribute_id;
  });
  
  const attributeFields = normalizedFields.filter(field => {
    // For the old format
    if (!('attribute_id' in field)) {
      return field.key.startsWith('attr_');
    }
    // For the new format
    return !!field.attribute_id;
  });
  
  // Calculate total weight
  const totalWeight = normalizedFields.reduce((sum, field) => sum + field.weight, 0);
  
  // Get completeness level text
  const getCompletenessLevel = (pct: number) => {
    if (pct < config.completenessLevels.poor.threshold) 
      return { 
        text: config.completenessLevels.poor.text, 
        color: "text-red-600" 
      };
    if (pct < config.completenessLevels.fair.threshold) 
      return { 
        text: config.completenessLevels.fair.text, 
        color: "text-amber-600" 
      };
    if (pct < config.completenessLevels.good.threshold) 
      return { 
        text: config.completenessLevels.good.text, 
        color: "text-green-600" 
      };
    return { 
      text: config.completenessLevels.excellent.text, 
      color: "text-emerald-600" 
    };
  };
  
  const completenessLevel = getCompletenessLevel(percentage);
  
  // Get the color for the progress bar
  const getProgressColor = (pct: number) => {
    if (pct < config.completenessLevels.poor.threshold) return "bg-red-600";
    if (pct < config.completenessLevels.fair.threshold) return "bg-amber-500";
    if (pct < config.completenessLevels.good.threshold) return "bg-green-500";
    return "bg-emerald-500";
  };
  
  // Sort fields by weight (highest first) then by completeness
  const sortFieldsByWeight = (fields: typeof normalizedFields) => {
    return [...fields].sort((a, b) => {
      // First by completeness (incomplete first)
      if (a.complete !== b.complete) {
        return a.complete ? 1 : -1;
      }
      // Then by weight (descending)
      return b.weight - a.weight;
    });
  };
  
  const sortedStandardFields = sortFieldsByWeight(standardFields);
  const sortedAttributeFields = sortFieldsByWeight(attributeFields);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] md:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>{config.title}</SheetTitle>
          <SheetDescription>
            {config.description}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{config.labels.overallCompleteness}</span>
            <span className={`text-sm font-medium ${completenessLevel.color}`}>
              {percentage}% - {completenessLevel.text}
            </span>
          </div>
          
          <div className="relative">
            <Progress 
              value={percentage} 
              className={`h-3 ${getProgressColor(percentage)}`} 
            />
            
            {/* Threshold markers */}
            <div className="absolute top-0 left-[60%] h-3 border-r border-white/50"></div>
            <div className="absolute top-0 left-[80%] h-3 border-r border-white/50"></div>
            <div className="absolute top-0 left-[95%] h-3 border-r border-white/50"></div>
            
            {/* Threshold labels */}
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{config.completenessLevels.poor.text}</span>
              <span className="ml-[54%]">{config.completenessLevels.fair.text}</span>
              <span>{completenessConfig.completenessLevels.poor.text}</span>
              <span className="ml-[54%]">{completenessConfig.completenessLevels.fair.text}</span>
              <span className="ml-[14%]">{completenessConfig.completenessLevels.good.text}</span>
              <span>{completenessConfig.completenessLevels.excellent.text}</span>
            </div>
          </div>
        </div>
        
        {/* Field Status Table */}
        <div className="mb-5">
          <h3 className="text-sm font-medium mb-2">{completenessConfig.labels.fieldCompleteness}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{completenessConfig.labels.field}</TableHead>
                <TableHead>{completenessConfig.labels.status}</TableHead>
                <TableHead className="text-right">{completenessConfig.labels.weight}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandardFields.map(field => (
                <TableRow key={field.key}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell>
                    {field.complete ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>{completenessConfig.statuses.complete}</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>{completenessConfig.statuses.missing}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-end space-x-1 cursor-help">
                            <span>{field.weight}×</span>
                            <Info className="h-3 w-3 text-slate-400" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="text-xs">
                            Weight factor: <strong>{field.weight}×</strong>
                            <br />
                            {field.weight >= 2 
                              ? completenessConfig.weightTooltips.field.high
                              : field.weight >= 1.5 
                                ? completenessConfig.weightTooltips.field.medium
                                : completenessConfig.weightTooltips.field.low}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Attribute Fields Status Table */}
        {attributeFields.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-medium mb-2">{completenessConfig.labels.attributeCompleteness}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{completenessConfig.labels.attribute}</TableHead>
                  <TableHead>{completenessConfig.labels.status}</TableHead>
                  <TableHead className="text-right">{completenessConfig.labels.weight}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAttributeFields.map(field => (
                  <TableRow key={field.key}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>
                      {field.complete ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>{completenessConfig.statuses.complete}</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>{completenessConfig.statuses.missing}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-end space-x-1 cursor-help">
                              <span>{field.weight}×</span>
                              <Info className="h-3 w-3 text-slate-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p className="text-xs">
                              Weight factor: <strong>{field.weight}×</strong>
                              <br />
                              {field.weight >= 2 
                                ? completenessConfig.weightTooltips.attribute.high
                                : field.weight >= 1.5 
                                  ? completenessConfig.weightTooltips.attribute.medium
                                  : completenessConfig.weightTooltips.attribute.low}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Summary */}
        <div className="mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completenessConfig.labels.completeFields}</span>
            <span>{completeFields.length} of {fieldStatus.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{completenessConfig.labels.missingFields}</span>
            <span className={incompleteFields.length > 0 ? "text-red-500 font-medium" : ""}>
              {incompleteFields.length}
            </span>
          </div>
          {attributeFields.length > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>{completenessConfig.labels.completeAttributes}</span>
                <span>{attributeFields.filter(f => f.complete).length} of {attributeFields.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{completenessConfig.labels.missingAttributes}</span>
                <span className={attributeFields.filter(f => !f.complete).length > 0 ? "text-red-500 font-medium" : ""}>
                  {attributeFields.filter(f => !f.complete).length}
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end">
          <SheetClose asChild>
            <Button variant="outline">{completenessConfig.buttons.close}</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 