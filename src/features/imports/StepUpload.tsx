import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { UploadIcon, FileSpreadsheetIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'papaparse';

interface StepUploadProps {
  onFileSelected: (file: File, headers: string[], previewData: any[]) => void;
}

const StepUpload: React.FC<StepUploadProps> = ({ onFileSelected }) => {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      let data: any[] = [];
      let headers: string[] = [];
      
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const parsed = parseCsv(result as string, {
          header: true,
          skipEmptyLines: true,
          preview: 5 // Only read 5 rows for preview
        });
        
        data = parsed.data;
        // Get headers from first row
        headers = parsed.meta.fields || [];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extract headers from first row
        headers = data[0] as string[];
        // Remove header row from data
        data = data.slice(1, 6); // Get only first 5 rows for preview
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {isDragActive ? (
            <>
              <UploadIcon className="h-12 w-12 text-primary" />
              <p className="text-lg font-medium">Drop the file here</p>
            </>
          ) : (
            <>
              <FileSpreadsheetIcon className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drag & drop a file here</p>
                <p className="text-sm text-muted-foreground">or click to select a file</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports CSV and Excel files up to 10MB
              </p>
            </>
          )}
        </div>
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
              <h4 className="text-sm font-medium mb-2">Preview (First 5 rows)</h4>
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