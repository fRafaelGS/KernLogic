import React, { useCallback, useState, useRef } from 'react';
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
          preview: 5
        });
        data = parsed.data;
        headers = parsed.meta.fields || [];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        headers = worksheet[0] as string[];
        data = worksheet.slice(1, 6);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg text-center">
        <UploadIcon className="h-12 w-12 text-muted-foreground mb-2" />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Select File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-lg mt-2">Choose a CSV or Excel file to import</p>
        <p className="text-sm text-muted-foreground mt-1">
          Supported formats: CSV, Excel (.xlsx, .xls)
        </p>
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