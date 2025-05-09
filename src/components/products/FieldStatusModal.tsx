import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileIcon,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { FieldCompletenessEntry } from '@/services/dashboardService';
import { useDebounce } from '@/hooks/useDebounce';

interface FieldStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldCompleteness: FieldCompletenessEntry[];
  productId: number;
}

export const FieldStatusModal: React.FC<FieldStatusModalProps> = ({
  open,
  onOpenChange,
  fieldCompleteness,
  productId
}) => {
  // Local state for the modal
  const [fieldStatusSearchTerm, setFieldStatusSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(fieldStatusSearchTerm, 300);
  const [expandedSections, setExpandedSections] = useState<string[]>(['incomplete']);
  
  // Process field completeness data
  const filteredFields = useMemo(() => {
    if (!fieldCompleteness) return { complete: [], incomplete: [] };
    
    const normalizedSearchTerm = debouncedSearchTerm.toLowerCase().trim();
    
    const filtered = fieldCompleteness.filter(item => 
      !normalizedSearchTerm || item.field.toLowerCase().includes(normalizedSearchTerm)
    );
    
    // Group by complete/incomplete status
    return {
      complete: filtered.filter(item => item.complete),
      incomplete: filtered.filter(item => !item.complete)
    };
  }, [fieldCompleteness, debouncedSearchTerm]);

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpandedSections(current => 
      current.includes(section)
        ? current.filter(s => s !== section)
        : [...current, section]
    );
  };

  // Export field status as CSV
  const exportFieldStatusCSV = () => {
    if (!fieldCompleteness) return;
    
    // Create CSV content
    const headers = ['Field', 'Status', 'Weight'];
    const rows = fieldCompleteness.map(item => [
      item.field,
      item.complete ? 'Complete' : 'Incomplete',
      item.weight.toString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `product-${productId}-field-status.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-full max-h-[90vh] overflow-hidden flex flex-col" onSubmit={(e): void => { e.preventDefault(); }}>
        <form
          onSubmit={e => e.preventDefault()}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>Field Status Breakdown</DialogTitle>
            <DialogDescription>
              Complete overview of all product data fields and their completion status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between gap-4 my-2" role="search">
            <div className="relative flex-1">
              <Input 
                placeholder="Search fields..."
                value={fieldStatusSearchTerm}
                onChange={(e) => setFieldStatusSearchTerm(e.target.value)}
                className="pl-8"
                aria-label="Search fields"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                form=""
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              type="button"
              onClick={exportFieldStatusCSV}
              aria-label="Export field status as CSV"
            >
              <FileIcon className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 pr-2 mt-2 space-y-4" role="region" aria-label="Field status list">
            {/* Incomplete Fields Section */}
            {filteredFields.incomplete.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between p-3 text-left font-medium ${
                    expandedSections.includes('incomplete') ? 'bg-red-50 text-red-700' : 'bg-slate-50'
                  }`}
                  onClick={() => toggleSection('incomplete')}
                  aria-expanded={expandedSections.includes('incomplete')}
                  aria-controls="incomplete-fields-section"
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>Incomplete Fields ({filteredFields.incomplete.length})</span>
                  </div>
                  {expandedSections.includes('incomplete') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {expandedSections.includes('incomplete') && (
                  <div id="incomplete-fields-section" className="space-y-2 p-3">
                    {filteredFields.incomplete.map((item, index) => (
                      <div
                        key={`incomplete-${index}`}
                        className="p-3 border rounded-md bg-red-50 border-red-200 flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-red-700">{item.field}</span>
                          <span className="text-xs text-red-500">Weight: {item.weight}</span>
                        </div>
                        <Badge variant="destructive" className="bg-red-600/10 text-red-700 border-red-600/30">
                          <AlertCircle className="mr-1 h-3 w-3" /> Incomplete
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Complete Fields Section */}
            {filteredFields.complete.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between p-3 text-left font-medium ${
                    expandedSections.includes('complete') ? 'bg-green-50 text-green-700' : 'bg-slate-50'
                  }`}
                  onClick={() => toggleSection('complete')}
                  aria-expanded={expandedSections.includes('complete')}
                  aria-controls="complete-fields-section"
                >
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    <span>Complete Fields ({filteredFields.complete.length})</span>
                  </div>
                  {expandedSections.includes('complete') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                
                {expandedSections.includes('complete') && (
                  <div id="complete-fields-section" className="space-y-2 p-3">
                    {filteredFields.complete.map((item, index) => (
                      <div
                        key={`complete-${index}`}
                        className="p-3 border rounded-md bg-green-50 border-green-200 flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-green-700">{item.field}</span>
                          <span className="text-xs text-green-500">Weight: {item.weight}</span>
                        </div>
                        <Badge variant="outline" className="border-green-600 bg-green-100 text-green-700">
                          <Check className="mr-1 h-3 w-3" /> Complete
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* No Results */}
            {filteredFields.complete.length === 0 && filteredFields.incomplete.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-muted-foreground">No fields match your search criteria</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 