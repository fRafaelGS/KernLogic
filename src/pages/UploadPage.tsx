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
import { UploadCloud, FileText, AlertCircle, CheckCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { toast } from "sonner";
import { productService, Product } from '@/services/productService';
import { API_URL } from "@/config";
import { APP_VERSION } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define a consistent base URL for products API
const PRODUCTS_BASE_URL = `${API_URL}${APP_VERSION.API_VERSION}/products`;

// Expected headers in CSV file
const EXPECTED_HEADERS = ['name', 'sku', 'description', 'price', 'category', 'brand', 'barcode', 'tags'];

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
  'tags': 'Tags',
  'is_active': 'Active Status',
  'stock': 'Stock Level',
  'ignore': '-- Ignore This Column --'
};

// Header descriptions for tooltips
const HEADER_DESCRIPTIONS: Record<string, string> = {
  'sku': 'A unique identifier for your product. Required.',
  'name': 'The product name or title',
  'description': 'Full description of the product',
  'price': 'Selling price in your currency',
  'category': 'Product category or department',
  'brand': 'Manufacturer or brand name',
  'barcode': 'UPC, EAN, ISBN or other standard barcode',
  'tags': 'Keywords or tags for the product (comma separated)',
  'is_active': 'Whether the product is active (yes/no, true/false, 1/0)',
  'stock': 'Current inventory quantity',
  'ignore': 'Select this to skip importing this column'
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
  const [fileType, setFileType] = useState<string | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<string>('skip');
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'processing'>('upload');
  const { addNotification } = useAuth();
  const navigate = useNavigate();

  // Reset mapping when headers change
  useEffect(() => {
    if (headers.length > 0) {
      // Initialize with automatic mapping
      const initialMapping: ColumnMapping = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        // Try to automatically map columns with similar names
        if (EXPECTED_HEADERS.includes(lowerHeader)) {
          initialMapping[header] = lowerHeader;
        } else {
          // Try partial matching (e.g., "Product Name" -> "name")
          const possibleMatch = EXPECTED_HEADERS.find(expectedHeader => 
            lowerHeader.includes(expectedHeader) || 
            expectedHeader.includes(lowerHeader)
          );
          
          if (possibleMatch) {
            initialMapping[header] = possibleMatch;
          } else {
            // Default to "ignore" for unmapped fields
            initialMapping[header] = "ignore";
          }
        }
      });
      
      setColumnMapping(initialMapping);
      
      if (headers.length > 0) {
        setCurrentStep('mapping');
      }
    }
  }, [headers]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      
      // Check if file is CSV or Excel
      if (fileExt !== 'csv' && fileExt !== 'xlsx' && fileExt !== 'xls') {
        toast.error('Invalid file type. Please upload a CSV or Excel file.');
        return;
      }
      
      setFile(selectedFile);
      setFileType(fileExt); // Store the file type for later use
      setPreviewData([]);
      setHeaders([]);
      setRowErrors([]);
      setSuccessCount(0);
      setHasAttemptedUpload(false);
      setCurrentStep('upload');
      
      if (fileExt === 'csv') {
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
    // Check if this value is already mapped to another header to prevent duplicates
    const headerWithSameMapping = Object.entries(columnMapping).find(
      ([key, value]) => key !== headerName && value === mappedTo && mappedTo !== 'ignore'
    );
    
    if (headerWithSameMapping && mappedTo !== 'ignore') {
      // If we're trying to set a duplicate mapping, warn the user
      toast.warning(`"${mappedTo}" is already mapped to column "${headerWithSameMapping[0]}". Using the same field multiple times may cause unexpected results.`);
    }
    
    setColumnMapping(prev => ({
      ...prev,
      [headerName]: mappedTo
    }));
  };

  const validateMapping = () => {
    // Check if all required fields are mapped
    const mappedFields = Object.values(columnMapping)
      .filter(value => value !== "ignore"); // Exclude "ignore" values
    
    const missingRequiredFields = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
    
    if (missingRequiredFields.length > 0) {
      toast.error(`Missing required mappings: ${missingRequiredFields.map(field => HEADER_DISPLAY_NAMES[field] || field).join(', ')}`);
      return false;
    }
    
    return true;
  };

  const proceedToPreview = () => {
    if (!validateMapping()) {
      return;
    }
    
    setCurrentStep('preview');
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
    setCurrentStep('processing');

    const formData = new FormData();
    
    // Append the file with the appropriate key name expected by the backend
    formData.append('csv_file', file);

    // Prepare proper mapping format
    const correctMapping: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([header, field]) => {
      if (field !== 'ignore') {
        correctMapping[header] = field.toLowerCase().trim();
      }
    });
    
    console.log("Column mapping for upload:", correctMapping);
    
    // Verify that the SKU field is targeted by at least one column
    const targetedFields = Object.values(correctMapping);
    const missingFields = REQUIRED_FIELDS.filter(field => !targetedFields.includes(field));
    
    if (missingFields.length > 0) {
      toast.error(`Missing required SKU field mapping. SKU is the only required field.`);
      console.error("Missing required field:", missingFields);
      setIsProcessing(false);
      setCurrentStep('mapping');
      return;
    }
    
    // Always continue on error to maximize imports
    formData.append('continue_on_error', 'true');
    
    // Add the column mapping
    formData.append('mapping', JSON.stringify(correctMapping));
    
    // Set the duplicate handling strategy
    formData.append('duplicate_strategy', duplicateStrategy);

    const token = localStorage.getItem('access_token');
    if (!token) {
        toast.error('Authentication error. Please log in again.');
        setIsProcessing(false);
        setCurrentStep('mapping');
        return;
    }
    
    let progressInterval: NodeJS.Timeout | null = null;

    try {
        // Simulate progress while waiting for server
        progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 5, 90));
        }, 500);

        // Make the API request with appropriate headers
        const response = await fetch(`${API_URL}/api/imports/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(100);

        // Handle different response formats
        let responseData;
        const contentType = response.headers.get('content-type');
        
        // Check if response is JSON
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // Handle non-JSON response
            const textResponse = await response.text();
            console.error('Received non-JSON response:', textResponse);
            throw new Error('Server returned an invalid response format');
        }

        console.log('Import API response:', responseData);

        if (response.ok) {
            // Check import task status
            if (responseData.id) {
                console.log('Import task created with ID:', responseData.id);
                await pollImportStatus(responseData.id);
            } else {
                const count = responseData.success_count || previewData.length;
                setSuccessCount(count);
                
                // Store errors but don't show them prominently
                if (responseData.errors?.length > 0) {
                  setRowErrors(responseData.errors);
                  console.log(`${responseData.errors.length} rows had issues but ${count} were imported successfully`);
                }
                
                // Just show the success message focusing on what was imported
                toast.success(`Successfully imported ${count} product(s).`);
                
                // Add In-App Notification
                addNotification({
                    type: 'success',
                    message: `Import Successful`,
                    description: `${count} product(s) imported.`
                });
            }
        } else if (response.status === 400 || response.status === 422 || response.status === 207) {
            // Even for error responses, focus on what was successful
            const successCount = responseData.success_count || 0;
            setSuccessCount(successCount);
            
            // Store errors in state but don't show them prominently
            if (responseData.errors) {
              setRowErrors(responseData.errors);
            }
            
            if (successCount > 0) {
              // Focus on what was successful
              toast.success(`${successCount} product(s) were imported successfully.`);
              addNotification({
                type: 'success',
                message: 'Import Complete',
                description: `${successCount} product(s) imported successfully.`
              });
              
              // Mention issues in the console only
              console.log(`Some rows had issues but ${successCount} were imported successfully`);
            } else {
              // Only show error when nothing was imported
              toast.error('Import failed. No products were imported.');
            }
        } else {
             const errorDetail = responseData.detail || `Server error: ${response.status}`;
             console.error('Import error:', errorDetail);
             
             // Show error only if it's a critical server error
             toast.error('Server error occurred during import');
        }

    } catch (error: any) {
        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(0);
        console.error('Error uploading file:', error);
        toast.error(`Upload failed: ${error.message || 'Failed to upload file.'}`);
    } finally {
        setIsProcessing(false);
    }
};

// Update the pollImportStatus function to focus on successful imports
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
                if (data.status === 'completed' || data.status === 'partial_success' || data.status === 'success') {
                    setUploadProgress(100);
                    setSuccessCount(data.processed);
                    
                    // Focus on what was successful, not the errors
                    toast.success(`Successfully imported ${data.processed} product(s).`);
                    
                    addNotification({
                        type: 'success',
                        message: 'Import Successful',
                        description: `${data.processed} product(s) imported.`
                    });
                    
                    return true; // Polling complete
                }
                else if (data.status === 'error') {
                    // Even for "error" status, check if anything was successfully processed
                    if (data.processed > 0) {
                        setUploadProgress(100);
                        setSuccessCount(data.processed);
                        
                        toast.success(`Successfully imported ${data.processed} product(s).`);
                        
                        addNotification({
                            type: 'success',
                            message: 'Import Successful',
                            description: `${data.processed} product(s) imported.`
                        });
                        
                        return true; // Polling complete
                    }
                    else {
                        // Only show error toast if nothing was imported
                        setUploadProgress(0);
                        toast.error('Import failed. Please check the file format.');
                        return true; // Polling complete
                    }
                }
                else if (data.status === 'processing' && retries < maxRetries) {
                    // Continue polling
                    retries++;
                    return false;
                }
                else {
                    // Timeout or unknown status
                    if (data.processed > 0) {
                        toast.success(`Successfully imported ${data.processed} product(s).`);
                    } else {
                        toast.warning('Import process taking longer than expected');
                    }
                    
                    return true; // Stop polling due to timeout
                }
            } else {
                // Error checking status
                console.error('Error checking import status');
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
                  setCurrentStep('upload');
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

      {/* Preview Table */}      
      {currentStep === 'preview' && previewData.length > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>File Preview</CardTitle>
            <CardDescription>
              Verify your data before importing. This shows the first {previewData.length} rows from your file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Duplicate Handling Strategy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${duplicateStrategy === 'skip' ? 'border-primary bg-primary/10' : 'border-gray-200'}`}
                  onClick={() => setDuplicateStrategy('skip')}
                >
                  <h4 className="font-semibold">Skip</h4>
                  <p className="text-sm text-muted-foreground">Skip importing products with SKUs that already exist in your catalog.</p>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${duplicateStrategy === 'overwrite' ? 'border-primary bg-primary/10' : 'border-gray-200'}`}
                  onClick={() => setDuplicateStrategy('overwrite')}
                >
                  <h4 className="font-semibold">Overwrite</h4>
                  <p className="text-sm text-muted-foreground">Update existing products with the data from your import file.</p>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer ${duplicateStrategy === 'abort' ? 'border-primary bg-primary/10' : 'border-gray-200'}`}
                  onClick={() => setDuplicateStrategy('abort')}
                >
                  <h4 className="font-semibold">Abort</h4>
                  <p className="text-sm text-muted-foreground">Cancel the import if any duplicate SKUs are found.</p>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-2">Data Preview</h3>
            <div className="overflow-x-auto max-h-96 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    {headers.map((header) => (
                      <TableHead key={header}>
                        <div className="flex items-center">
                          {header}
                          {columnMapping[header] !== 'ignore' && (
                            <Badge variant="outline" className="ml-2">
                              {HEADER_DISPLAY_NAMES[columnMapping[header]] || columnMapping[header]}
                            </Badge>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                      {headers.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h3 className="text-md font-medium mb-2">Your Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(columnMapping)
                  .filter(([_, target]) => target !== 'ignore')
                  .map(([header, target]) => (
                    <div key={header} className="flex items-center">
                      <span className="font-medium">{header}</span>
                      <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                      <span>{HEADER_DISPLAY_NAMES[target] || target}</span>
                      {REQUIRED_FIELDS.includes(target) && (
                        <Badge className="ml-2" variant="destructive">Required</Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('mapping')}
              disabled={isProcessing}
            >
              Back to Mapping
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm and Import Products'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Column Mapping Step */}
      {currentStep === 'mapping' && headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>
              Map your file columns to product fields. SKU is required. 
              Unmapped columns won't be imported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <h3 className="text-lg font-medium">Available Fields</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(HEADER_DISPLAY_NAMES)
                  .filter(([key]) => key !== 'ignore')
                  .map(([field, displayName]) => (
                    <TooltipProvider key={field}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Badge 
                              variant={REQUIRED_FIELDS.includes(field) ? "default" : "outline"}
                              className="cursor-help"
                            >
                              {displayName}
                              {REQUIRED_FIELDS.includes(field) && " *"}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{HEADER_DESCRIPTIONS[field] || field}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Column in Your File</TableHead>
                    <TableHead className="w-1/3">Map To Field</TableHead>
                    <TableHead className="w-1/3">Sample Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">
                        {header}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={columnMapping[header] || 'ignore'}
                          onValueChange={(value) => handleMappingChange(header, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* First show required fields that aren't yet mapped */}
                            {REQUIRED_FIELDS
                              .filter(field => !Object.values(columnMapping).includes(field) || columnMapping[header] === field)
                              .map(field => (
                                <SelectItem key={field} value={field}>
                                  <span className="font-semibold">{HEADER_DISPLAY_NAMES[field] || field}</span> (Required)
                                </SelectItem>
                              ))
                            }
                            
                            {/* Then show all other fields */}
                            {Object.keys(HEADER_DISPLAY_NAMES)
                              .filter(field => !REQUIRED_FIELDS.includes(field))
                              .map(field => (
                                <SelectItem key={field} value={field}>
                                  {HEADER_DISPLAY_NAMES[field] || field}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {previewData[0] && 
                          <div className="max-w-xs truncate">
                            {String(previewData[0][header] || '')}
                          </div>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Required Field Warning */}
            {REQUIRED_FIELDS.some(field => !Object.values(columnMapping).includes(field)) && (
              <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md text-red-700">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">Missing required fields</p>
                    <p className="text-sm">
                      Please map these required fields: {
                        REQUIRED_FIELDS
                          .filter(field => !Object.values(columnMapping).includes(field))
                          .map(field => HEADER_DISPLAY_NAMES[field] || field)
                          .join(', ')
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mapping Info Card */}
            <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
              <div className="flex">
                <HelpCircle className="h-5 w-5 mr-2 text-blue-700" />
                <div className="text-blue-700">
                  <p className="font-medium">Mapping Tips</p>
                  <ul className="text-sm list-disc pl-5 mt-1">
                    <li>The SKU field is required for all products</li>
                    <li>Select "Ignore This Column" for any data you don't want to import</li>
                    <li>Excel date/time fields might require reformatting before import</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreviewData([]);
                setHeaders([]);
                setColumnMapping({});
                setCurrentStep('upload');
              }}
              disabled={isProcessing}
            >
              Start Over
            </Button>
            <Button 
              onClick={proceedToPreview} 
              disabled={isProcessing || REQUIRED_FIELDS.some(field => !Object.values(columnMapping).includes(field))}
              className="w-full md:w-auto"
            >
              {isProcessing ? 'Processing...' : 'Proceed to Preview'}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Processing Step */}
      {currentStep === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Your Products</CardTitle>
            <CardDescription>
              Please wait while we import your products. This may take a few minutes for large files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {uploadProgress < 100 
                  ? `Processing... ${uploadProgress}%` 
                  : "Import completed!"}
              </p>
              
              {/* Show success message if any products were imported */}
              {uploadProgress === 100 && successCount > 0 && (
                <div className="mt-4 border border-green-200 rounded-md overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                    <h3 className="font-medium text-green-700">Import Summary</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm">
                      Successfully imported {successCount} products to your catalog.
                    </p>
                    {rowErrors.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {rowErrors.length} rows were skipped due to missing or invalid data.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            {uploadProgress === 100 && (
              <div className="flex space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setHeaders([]);
                    setColumnMapping({});
                    setUploadProgress(0);
                    setRowErrors([]);
                    setSuccessCount(0);
                    setHasAttemptedUpload(false);
                    setCurrentStep('upload');
                  }}
                >
                  Upload Another File
                </Button>
                <Button 
                  onClick={() => navigate('/products')}
                >
                  View Products
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default UploadPage;
