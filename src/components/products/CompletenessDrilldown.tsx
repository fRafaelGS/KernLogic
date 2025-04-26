import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  fieldStatus: FieldStatus[];
}

export const CompletenessDrilldown: React.FC<CompletenessDrilldownProps> = ({
  open,
  onOpenChange,
  percentage,
  fieldStatus
}) => {
  // Group fields by completeness status
  const completeFields = fieldStatus.filter(field => field.complete);
  const incompleteFields = fieldStatus.filter(field => !field.complete);
  
  // Calculate total weight
  const totalWeight = fieldStatus.reduce((sum, field) => sum + field.weight, 0);
  
  // Get completeness level text
  const getCompletenessLevel = (pct: number) => {
    if (pct < 60) return { text: "Poor", color: "text-red-600" };
    if (pct < 80) return { text: "Fair", color: "text-amber-600" };
    if (pct < 95) return { text: "Good", color: "text-green-600" };
    return { text: "Excellent", color: "text-emerald-600" };
  };
  
  const completenessLevel = getCompletenessLevel(percentage);
  
  // Get the color for the progress bar
  const getProgressColor = (pct: number) => {
    if (pct < 60) return "bg-red-600";
    if (pct < 80) return "bg-amber-500";
    if (pct < 95) return "bg-green-500";
    return "bg-emerald-500";
  };
  
  // Sort fields by weight (highest first) then by completeness
  const sortedFields = [...fieldStatus].sort((a, b) => {
    // First by completeness (incomplete first)
    if (a.complete !== b.complete) {
      return a.complete ? 1 : -1;
    }
    // Then by weight (descending)
    return b.weight - a.weight;
  });
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] md:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Data Completeness Details</SheetTitle>
          <SheetDescription>
            Review the completeness of your product data fields
          </SheetDescription>
        </SheetHeader>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Completeness</span>
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
              <span>Poor</span>
              <span className="ml-[54%]">Fair</span>
              <span className="ml-[14%]">Good</span>
              <span>Excellent</span>
            </div>
          </div>
        </div>
        
        {/* Field Status Table */}
        <div className="mb-5">
          <h3 className="text-sm font-medium mb-2">Field Completeness</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFields.map(field => (
                <TableRow key={field.key}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell>
                    {field.complete ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>Complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Missing</span>
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
                              ? "Essential fields have higher weight (2×)" 
                              : field.weight >= 1.5 
                                ? "Important fields have medium weight (1.5×)"
                                : "Optional fields have base weight (1×)"}
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
        
        {/* Summary */}
        <div className="mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Complete fields:</span>
            <span>{completeFields.length} of {fieldStatus.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Missing fields:</span>
            <span className={incompleteFields.length > 0 ? "text-red-500 font-medium" : ""}>
              {incompleteFields.length}
            </span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 