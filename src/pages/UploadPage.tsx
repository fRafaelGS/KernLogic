import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadCloud, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { productService, Product } from '@/services/productService';
import { API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';

// Define a consistent base URL for products API
const PRODUCTS_BASE_URL = `${API_URL}/products`;

// Expected headers in CSV file
const EXPECTED_HEADERS = ['name', 'sku', 'description', 'price', 'stock', 'category'];

type CsvRow = { [key: string]: string };
type RowError = { rowIndex: number; errors: string[] };

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [hasAttemptedUpload, setHasAttemptedUpload] = useState(false);
  const { addNotification } = useAuth();
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type !== 'text/csv') {
        toast.error('Invalid file type. Please upload a CSV file.');
        return;
      }
      setFile(selectedFile);
      setPreviewData([]);
      setHeaders([]);
      setRowErrors([]);
      setSuccessCount(0);
      setHasAttemptedUpload(false);
      parseCsvPreview(selectedFile);
    }
  }, []);

  const parseCsvPreview = (fileToParse: File) => {
    Papa.parse<CsvRow>(fileToParse, {
      header: true,
      skipEmptyLines: true,
      preview: 20, // Only parse first 20 rows for preview
      complete: (results) => {
        const detectedHeaders = results.meta.fields || [];
        setHeaders(detectedHeaders);
        setPreviewData(results.data);

        // Basic header validation
        const lowerCaseHeaders = detectedHeaders.map(h => h.toLowerCase());
        const missingHeaders = EXPECTED_HEADERS.filter(h => !lowerCaseHeaders.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV preview:', error);
        toast.error('Failed to parse CSV file preview.');
        setFile(null);
      }
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setRowErrors([]);
    setSuccessCount(0);
    setHasAttemptedUpload(true);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    if (!token) {
        toast.error('Authentication error. Please log in again.');
        setIsProcessing(false);
        return;
    }
    
    let progressInterval: NodeJS.Timeout | null = null;

    try {
        // Simulate progress
        progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const response = await fetch(`${PRODUCTS_BASE_URL}/bulk/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(100);

        const responseData = await response.json();

        if (response.ok) {
            const count = responseData.success_count || previewData.length;
            setSuccessCount(count);
            toast.success(`Successfully imported ${count} product(s).`);
            setRowErrors(responseData.errors || []);
            
            // Add In-App Notification
            addNotification({
                type: 'success',
                message: `CSV Import Successful`,
                description: `${count} product(s) imported.`
            });

            if (responseData.errors?.length > 0) {
              const errorCount = responseData.errors.length;
              toast('Some rows had issues', { description: 'See details below.'});
              // Add separate notification for errors
              addNotification({
                type: 'warning', // Use warning type
                message: 'CSV Import Issues',
                description: `${errorCount} row(s) had errors during import.`
              });
            }
        } else if (response.status === 400 || response.status === 422 || response.status === 207) {
            const successCount = responseData.success_count || 0;
            const errorCount = responseData.errors?.length || 'unknown';
            setSuccessCount(successCount);
            setRowErrors(responseData.errors || []);
            const errorMsg = responseData.detail || `Import failed with ${errorCount} errors.`;
            toast.error(errorMsg);
            
            // Add In-App Notification for failure/partial
            addNotification({
                type: 'error',
                message: 'CSV Import Failed/Partial',
                description: errorMsg
            });

            if (successCount > 0) {
              toast(`${successCount} product(s) were imported successfully.`);
               // Add separate notification for partial success
               addNotification({
                 type: 'info',
                 message: 'Partial CSV Import',
                 description: `${successCount} product(s) imported successfully, but errors occurred.`
               });
            }
        } else {
             const errorDetail = responseData.detail || `Server error: ${response.status}`;
             addNotification({
                type: 'error',
                message: 'CSV Upload Failed',
                description: errorDetail
            });
            throw new Error(errorDetail);
        }

    } catch (error: any) {
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(0);
        console.error('Error uploading CSV:', error);
        toast.error(error.message || 'Failed to upload CSV file.');
         // Add In-App Notification for catch block error
         addNotification({
            type: 'error',
            message: 'CSV Upload Error',
            description: error.message || 'An unexpected error occurred during upload.'
        });
    } finally {
        setIsProcessing(false);
    }
};

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-enterprise-900">Bulk Upload Products</h1>
      <p className="text-enterprise-600">
        Import multiple products at once using a CSV file. Ensure your file includes columns for: {EXPECTED_HEADERS.join(', ')}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>Drag and drop your file or click to select.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-enterprise-200 bg-white hover:border-enterprise-300'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`mx-auto h-12 w-12 ${isDragActive ? 'text-primary-600' : 'text-enterprise-400'}`} />
            {isDragActive ? (
              <p className="mt-4 font-medium text-primary-700">Drop the CSV file here...</p>
            ) : (
              <p className="mt-4 text-sm text-enterprise-600">
                Drag 'n' drop your CSV file here, or click to select file
              </p>
            )}
          </div>

          {file && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-md bg-enterprise-50">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-enterprise-500" />
                  <span className="text-sm font-medium text-enterprise-800">{file.name}</span>
                  <span className="text-xs text-enterprise-500">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setPreviewData([]); setHeaders([]); setHasAttemptedUpload(false); }} className="text-danger-600 hover:text-danger-700">
                  Remove
                </Button>
              </div>
              
              {isProcessing && (
                  <Progress value={uploadProgress} className="w-full h-2" />
              )}
              
              <Button onClick={handleUpload} disabled={isProcessing || previewData.length === 0} className="w-full md:w-auto">
                {isProcessing ? 'Processing...' : 'Upload and Import Products'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Results */}      
      {hasAttemptedUpload && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            {successCount > 0 && (
              <div className="flex items-center gap-2 text-success-600 mb-4 bg-success-50 p-3 rounded-md border border-success-200">
                  <CheckCircle className="h-5 w-5"/>
                  <p>{successCount} product(s) imported successfully.</p>
              </div>
            )}
            {rowErrors.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-danger-600 mb-2 bg-danger-50 p-3 rounded-md border border-danger-200">
                  <AlertCircle className="h-5 w-5"/> 
                  <p>{rowErrors.length} row(s) had errors:</p>
                </div>
                <div className="max-h-60 overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Row</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rowErrors.map((err) => (
                        <TableRow key={err.rowIndex}>
                          <TableCell>{err.rowIndex + 1}</TableCell> {/* Adjusting for 1-based index */} 
                          <TableCell>
                            <ul className="list-disc pl-4">
                              {err.errors.map((msg, i) => <li key={i} className="text-xs">{msg}</li>)}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : successCount === 0 ? (
               <div className="flex items-center gap-2 text-warning-600 bg-warning-50 p-3 rounded-md border border-warning-200">
                   <AlertCircle className="h-5 w-5"/>
                   <p>No products were imported. Check the file or errors.</p>
               </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}      
      {previewData.length > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>File Preview (First {previewData.length} Rows)</CardTitle>
            <CardDescription>Review your data before uploading.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`} className="text-sm">
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadPage;
