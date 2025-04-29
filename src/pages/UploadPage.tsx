import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from "sonner";
import { productService, Product } from '@/services/productService';
import { API_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

// Define a consistent base URL for products API
const PRODUCTS_BASE_URL = `${API_URL}/api/products`;

// Expected headers in CSV file
const EXPECTED_HEADERS = ['name', 'sku', 'description', 'price', 'category'];

// Required fields that must be mapped
const REQUIRED_FIELDS = ['sku'];

// Display names for expected headers
const HEADER_DISPLAY_NAMES: Record<string, string> = {
  'name': 'Product Name',
  'sku': 'SKU / Product Code',
  'description': 'Description',
  'price': 'Price',
  'category': 'Category',
  'barcode': 'Barcode / UPC',
  'brand': 'Brand',
  'tags': 'Tags'
};

type CsvRow = { [key: string]: string };
type RowError = { rowIndex: number; errors: string[] };
type ColumnMapping = Record<string, string>;

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [hasAttemptedUpload, setHasAttemptedUpload] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingStep, setShowMappingStep] = useState(false);
  const { addNotification } = useAuth();
  const navigate = useNavigate();

  // Reset mapping when headers change
  useEffect(() => {
    // Initialize with automatic mapping
    const initialMapping: ColumnMapping = {};
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      // Try to automatically map columns with similar names
      if (EXPECTED_HEADERS.includes(lowerHeader)) {
        initialMapping[header] = lowerHeader;
      }
    });
    setColumnMapping(initialMapping);
    
    if (headers.length > 0) {
      setShowMappingStep(true);
    }
  }, [headers]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      
      // Check if file is CSV or Excel
      if (fileType !== 'csv' && fileType !== 'xlsx' && fileType !== 'xls') {
        toast.error('Invalid file type. Please upload a CSV or Excel file.');
        return;
      }
      
      setFile(selectedFile);
      setPreviewData([]);
      setHeaders([]);
      setRowErrors([]);
      setSuccessCount(0);
      setHasAttemptedUpload(false);
      setShowMappingStep(false);
      
      if (fileType === 'csv') {
        parseCsvPreview(selectedFile);
      } else {
        parseExcelPreview(selectedFile);
      }
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
      },
      error: (error) => {
        console.error('Error parsing CSV preview:', error);
        toast.error('Failed to parse CSV file preview.');
        setFile(null);
      }
    });
  };
  
  const parseExcelPreview = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<CsvRow>(worksheet);
        
        // Get headers from first row
        const headers = Object.keys(jsonData[0] || {});
        
        setHeaders(headers);
        setPreviewData(jsonData.slice(0, 20)); // Get only first 20 rows for preview
      } catch (error) {
        console.error('Error parsing Excel preview:', error);
        toast.error('Failed to parse Excel file preview.');
        setFile(null);
      }
    };
    
    reader.readAsBinaryString(fileToParse);
  };

  const handleMappingChange = (headerName: string, mappedTo: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [headerName]: mappedTo
    }));
  };

  const validateMapping = () => {
    // Check if all required fields are mapped
    const mappedFields = Object.values(columnMapping)
      .filter(value => value !== "ignore"); // Exclude "ignore" values
    
    const missingRequiredFields = EXPECTED_HEADERS.filter(field => !mappedFields.includes(field));
    
    if (missingRequiredFields.length > 0) {
      toast.error(`Missing required mappings: ${missingRequiredFields.map(field => HEADER_DISPLAY_NAMES[field] || field).join(', ')}`);
      return false;
    }
    
    return true;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    if (!validateMapping()) {
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setRowErrors([]);
    setSuccessCount(0);
    setHasAttemptedUpload(true);

    const formData = new FormData();
    formData.append('csv_file', file);
    
    // Prepare proper mapping format
    // According to the backend model: mapping = models.JSONField() # {"SKU": "sku", "Name": "name", ...}
    // This means the CSV column should be the key, and the field name should be the value
    
    const correctMapping: Record<string, string> = {};
    
    // First pass: Get direct mapping from CSV headers to field names
    Object.entries(columnMapping).forEach(([header, field]) => {
      if (field !== 'ignore') {
        // CSV header -> field name (lowercase for consistency)
        correctMapping[header] = field.toLowerCase().trim();
      }
    });
    
    console.log("Direct column -> field mapping:", correctMapping);
    
    // Verify all required fields are targeted by at least one column
    const targetedFields = Object.values(correctMapping);
    const missingFields = REQUIRED_FIELDS.filter(field => !targetedFields.includes(field));
    
    if (missingFields.length > 0) {
      toast.error(`Missing required SKU field mapping. SKU is the only required field.`);
      console.error("Missing required field:", missingFields);
      console.error("Current mapping:", correctMapping);
      setIsProcessing(false);
      return;
    }
    
    console.log("Sending mapping to backend:", correctMapping);
    
    // Add continue_on_error to the FormData to tell backend to skip invalid rows
    formData.append('continue_on_error', 'true');
    
    // Add the column mapping - format {"CSV Header": "field_name", ...}
    formData.append('mapping', JSON.stringify(correctMapping));

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

        const response = await fetch(`${API_URL}/api/imports/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(100);

        const responseData = await response.json();
        console.log('Import API response:', responseData); // Log the response for debugging

        if (response.ok) {
            // Check import task status
            if (responseData.id) {
                console.log('Import task created with ID:', responseData.id);
                await pollImportStatus(responseData.id);
            } else {
                const count = responseData.success_count || previewData.length;
                setSuccessCount(count);
                toast.success(`Successfully imported ${count} product(s).`);
                setRowErrors(responseData.errors || []);
                
                // Add In-App Notification
                addNotification({
                    type: 'success',
                    message: `Import Successful`,
                    description: `${count} product(s) imported.`
                });

                if (responseData.errors?.length > 0) {
                  const errorCount = responseData.errors.length;
                  toast('Some rows had issues', { description: 'See details below.'});
                  // Add separate notification for errors
                  addNotification({
                    type: 'warning', // Use warning type
                    message: 'Import Issues',
                    description: `${errorCount} row(s) had errors during import.`
                  });
                } else {
                  // If import was completely successful with no errors, navigate to products page
                  // Add a slight delay to allow the user to see the success message
                  setTimeout(() => {
                    navigate('/app/products');
                    toast.info('Redirecting to products list...');
                  }, 1500);
                }
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
                message: 'Import Failed/Partial',
                description: errorMsg
            });

            if (successCount > 0) {
              toast(`${successCount} product(s) were imported successfully.`);
               // Add separate notification for partial success
               addNotification({
                 type: 'info',
                 message: 'Partial Import',
                 description: `${successCount} product(s) imported successfully, but errors occurred.`
               });
            }
        } else {
             const errorDetail = responseData.detail || `Server error: ${response.status}`;
             addNotification({
                type: 'error',
                message: 'Upload Failed',
                description: errorDetail
            });
            throw new Error(errorDetail);
        }

    } catch (error: any) {
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(0);
        console.error('Error uploading file:', error);
        toast.error(error.message || 'Failed to upload file.');
         // Add In-App Notification for catch block error
         addNotification({
            type: 'error',
            message: 'Upload Error',
            description: error.message || 'An unexpected error occurred during upload.'
        });
    } finally {
        setIsProcessing(false);
    }
};

// Add a new function to poll the import task status
const pollImportStatus = async (taskId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    let retries = 0;
    const maxRetries = 20; // Max 30 seconds of polling (20 * 1.5s)
    
    const checkStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/api/imports/${taskId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update progress based on task status
                if (data.total_rows) {
                    const progress = Math.floor((data.processed / data.total_rows) * 100);
                    setUploadProgress(Math.min(progress, 99)); // Cap at 99% until complete
                }
                
                // Check task status
                if (data.status === 'completed' || data.status === 'partial_success') {
                    setUploadProgress(100);
                    setSuccessCount(data.processed);
                    
                    // Create a more user-friendly message for partial success
                    if (data.status === 'partial_success' && data.error_file) {
                        toast.success(`Successfully imported ${data.processed} product(s) with some skipped rows.`, {
                            description: "Some rows were skipped due to missing required fields."
                        });
                    } else {
                        toast.success(`Successfully imported ${data.processed} product(s).`);
                    }
                    
                    addNotification({
                        type: 'success',
                        message: 'Import Successful',
                        description: `${data.processed} product(s) imported. ${data.error_file ? 'Some rows were skipped.' : ''}`
                    });
                    
                    // Navigate to products page
                    setTimeout(() => {
                        navigate('/app/products');
                        toast.info('Redirecting to products list...');
                    }, 1500);
                    
                    return true; // Polling complete
                }
                else if (data.status === 'error') {
                    setUploadProgress(0);
                    
                    // Format the error display better - count error types
                    let errorSummary = "";
                    if (data.error_file) {
                        // Fetch and display a summary of errors
                        try {
                            const errorResponse = await fetch(data.error_file, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (errorResponse.ok) {
                                const errorText = await errorResponse.text();
                                const errorLines = errorText.split('\n').filter(line => line.trim());
                                
                                // Count common error types - focus on duplicate SKUs now that only SKU is required
                                const duplicateSkuCount = errorLines.filter(line => line.includes('Duplicate SKU:')).length;
                                const missingSkuCount = errorLines.filter(line => line.includes('sku: This field')).length;
                                
                                errorSummary = `${errorLines.length} rows had issues: `;
                                if (duplicateSkuCount > 0) errorSummary += `${duplicateSkuCount} duplicate SKUs, `;
                                if (missingSkuCount > 0) errorSummary += `${missingSkuCount} missing SKUs, `;
                                errorSummary = errorSummary.replace(/, $/, '');
                            }
                        } catch (e) {
                            console.error("Failed to fetch error details", e);
                        }
                    }
                    
                    // Extract more detailed error information if available
                    console.error('Import process failed:', data);
                    
                    // Display more informative error message
                    toast.error('Import failed during processing', {
                      description: errorSummary || `Please check the format of your file. Some rows had missing required fields. (ID: ${taskId})`
                    });
                    
                    // Add more detailed notification
                    addNotification({
                        type: 'error',
                        message: 'Import Failed',
                        description: `The import encountered errors. Rows with missing required fields were skipped.`
                    });
                    
                    // If error_file is available, provide download link
                    if (data.error_file) {
                      toast('Error details available', {
                        description: 'Click to view the detailed error report with all affected rows.',
                        action: {
                          label: 'View',
                          onClick: () => window.open(data.error_file, '_blank')
                        }
                      });
                    }
                    
                    return true; // Polling complete due to error
                }
                else if (data.status === 'processing' && retries < maxRetries) {
                    // Continue polling
                    retries++;
                    return false;
                }
                else {
                    // Timeout or unknown status
                    toast.warning('Import process taking longer than expected');
                    
                    addNotification({
                        type: 'warning',
                        message: 'Import Pending',
                        description: 'The import is still being processed in the background.'
                    });
                    
                    return true; // Stop polling due to timeout
                }
            } else {
                // Error checking status
                toast.error('Error checking import status');
                return true; // Stop polling due to error
            }
        } catch (error) {
            console.error('Error polling import status:', error);
            return true; // Stop polling due to error
        }
    };
    
    // Start polling loop
    const poll = async () => {
        const isDone = await checkStatus();
        if (!isDone) {
            setTimeout(poll, 1500); // Check every 1.5 seconds
        }
    };
    
    await poll();
};

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-enterprise-900">Bulk Upload Products</h1>
      <p className="text-enterprise-600">
        Import multiple products at once using a CSV or Excel file. Ensure your file includes columns for: {EXPECTED_HEADERS.join(', ')}.
      </p>

      {!file && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV or Excel File</CardTitle>
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
                <p className="mt-4 font-medium text-primary-700">Drop the file here...</p>
              ) : (
                <p className="mt-4 text-sm text-enterprise-600">
                  Drag 'n' drop your CSV or Excel file here, or click to select file
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {file && (
        <Card>
          <CardHeader>
            <CardTitle>Selected File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-md bg-enterprise-50">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-enterprise-500" />
                <span className="text-sm font-medium text-enterprise-800">{file.name}</span>
                <span className="text-xs text-enterprise-500">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { 
                  setFile(null); 
                  setPreviewData([]); 
                  setHeaders([]); 
                  setHasAttemptedUpload(false);
                  setShowMappingStep(false);
                }} 
                className="text-danger-600 hover:text-danger-700"
              >
                Remove
              </Button>
            </div>
            
            {isProcessing && (
              <Progress value={uploadProgress} className="w-full h-2 mt-4" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Mapping Step */}
      {showMappingStep && headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Map Your Columns</CardTitle>
            <CardDescription>
              Match your file columns to the required product fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 py-2 font-semibold border-b">
                <div>Your Column</div>
                <div></div>
                <div>Maps To</div>
              </div>
              
              {headers.map(header => (
                <div key={header} className="grid grid-cols-3 gap-4 items-center">
                  <div className="truncate font-medium">{header}</div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Select
                    value={columnMapping[header] || ""}
                    onValueChange={(value) => handleMappingChange(header, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ignore">-- Ignore Column --</SelectItem>
                      {Object.entries(HEADER_DISPLAY_NAMES).map(([value, label]) => (
                        <SelectItem 
                          key={value} 
                          value={value}
                          // Disable options already mapped to other columns
                          disabled={Object.values(columnMapping).includes(value) && columnMapping[header] !== value}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              
              <div className="text-sm text-muted-foreground mt-2">
                <p>* Required fields: name, sku, price, category, description</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              onClick={handleUpload} 
              disabled={isProcessing}
              className="w-full md:w-auto"
            >
              {isProcessing ? 'Processing...' : 'Upload and Import Products'}
            </Button>
          </CardFooter>
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
                      <TableHead key={header}>
                        {header}
                        {columnMapping[header] && (
                          <span className="block text-xs text-muted-foreground">
                            ↳ {HEADER_DISPLAY_NAMES[columnMapping[header]] || columnMapping[header]}
                          </span>
                        )}
                      </TableHead>
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
    </div>
  );
};

export default UploadPage;
