import React, { useCallback, useState, useRef } from 'react';
import { Button } from '@/domains/core/components/ui/button';
import { Card } from '@/domains/core/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/domains/core/components/ui/table';
import { UploadIcon, InfoIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'papaparse';
import { RadioGroup, RadioGroupItem } from '@/domains/core/components/ui/radio-group';
import { Label } from '@/domains/core/components/ui/label';
import { ImportMode } from '@/domains/imports/components/StepImportMode';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/domains/core/components/ui/tooltip';
import { DuplicateStrategy } from '@/domains/imports/services/importService';
import { config } from '@/config/config';

// Define the structure type
type StructureType = 'attribute_groups' | 'attributes' | 'families' | null;

interface StepUploadProps {
  onFileSelected: (file: File, headers: string[], previewData: any[]) => void;
  importMode?: ImportMode;
  structureType?: StructureType;
  onStructureTypeSelect?: (type: StructureType) => void;
  duplicatePolicy?: DuplicateStrategy;
  onDuplicatePolicyChange?: (policy: DuplicateStrategy) => void;
}

const StepUpload: React.FC<StepUploadProps> = ({ 
  onFileSelected, 
  importMode = 'products',
  structureType = null,
  onStructureTypeSelect,
  duplicatePolicy = config.imports.defaults.duplicateStrategy as DuplicateStrategy,
  onDuplicatePolicyChange
}) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      let data: any[] = [];
      let headers: string[] = [];
      if (file.name.endsWith('.csv')) {
        const parsed = parseCsv(result as string, {
          header: true,
          skipEmptyLines: true,
          preview: config.imports.defaults.previewRows
        });
        data = parsed.data;
        headers = parsed.meta.fields || [];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        headers = worksheet[0] as string[];
        data = worksheet.slice(1, config.imports.defaults.previewRows + 1);
      }
      setPreviewData(data);
      setHeaders(headers);
      setSelectedFile(file);
      onFileSelected(file, headers, data);
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, [onFileSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      parseFile(file);
    }
  };

  // Show structure type selection if we're in a structure import mode
  const showStructureTypeSelector = importMode === 'structure';

  // Show duplicate policy only for product imports
  const showDuplicatePolicy = importMode === 'products' && onDuplicatePolicyChange;

  return (
    <div className="space-y-6">
      {showStructureTypeSelector && (
        <div className="bg-muted p-4 rounded-md mb-4">
          <h3 className="font-medium mb-2">Select Structure Type</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the type of structure you want to import
          </p>

          <RadioGroup
            value={structureType || ''}
            onValueChange={(value) => onStructureTypeSelect?.(value as StructureType)}
            className="space-y-4"
          >
            {config.imports.display.structureTypes.map((type) => (
              <div key={type.value} className="flex items-start space-x-2 p-4 rounded-md border border-gray-200 hover:bg-gray-50">
                <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor={type.value} className="font-medium">{type.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {showDuplicatePolicy && (
        <div className="bg-muted p-4 rounded-md mb-4">
          <div className="flex items-center mb-2">
            <h3 className="font-medium">Duplicate SKU Handling</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[300px] text-xs">
                    Choose how to handle cases where a SKU in your import file matches a SKU that already exists in your catalog.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select how to handle duplicate SKUs during import
          </p>

          <RadioGroup
            value={duplicatePolicy}
            onValueChange={(value) => onDuplicatePolicyChange?.(value as DuplicateStrategy)}
            className="space-y-3"
          >
            {config.imports.display.duplicateStrategies.map((strategy) => (
              <div key={strategy.value} className="flex items-start space-x-2 p-3 rounded-md border border-gray-200 hover:bg-gray-50">
                <RadioGroupItem value={strategy.value} id={strategy.value} className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor={strategy.value} className="font-medium">{strategy.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {strategy.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg text-center">
        <UploadIcon className="h-12 w-12 text-muted-foreground mb-2" />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={showStructureTypeSelector && !structureType}
        >
          {config.imports.display.uploadInstructions.selectButtonLabel}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={config.imports.defaults.acceptedFileTypes.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-lg mt-2">{config.imports.display.uploadInstructions.title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {config.imports.display.uploadInstructions.subtitle}
        </p>
        {showStructureTypeSelector && !structureType && (
          <p className="text-sm text-amber-600 mt-2">
            {config.imports.display.uploadInstructions.structureTypeRequired}
          </p>
        )}
      </div>
      
      {selectedFile && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-medium">{selectedFile.name}</h3>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                setPreviewData([]);
                setHeaders([]);
              }}
            >
              Remove
            </Button>
          </div>
          {previewData.length > 0 && (
            <div className="overflow-x-auto">
              <h4 className="text-sm font-medium mb-2">Preview (First {config.imports.defaults.previewRows} rows)</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header, index) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {row[header] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default StepUpload; 