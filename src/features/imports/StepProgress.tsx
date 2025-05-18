import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircleIcon, XCircleIcon, FileIcon, AlertTriangleIcon, DownloadIcon } from 'lucide-react';
import { getImport, ImportTask } from '@/services/importService';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

interface StepProgressProps {
  importId: number;
  onComplete?: () => void;
}

interface ErrorRow {
  row: string;
  sku: string;
  field: string;
  error: string;
}

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_ERROR_ROWS = 5; // Maximum number of error rows to display

// Add this helper function to group errors by type
const groupErrorsByType = (errors: ErrorRow[]): Record<string, ErrorRow[]> => {
  const groupedErrors: Record<string, ErrorRow[]> = {};
  
  errors.forEach(error => {
    // Extract the error type from the message
    let errorType = 'Unknown';
    
    if (error.error.includes('Locale') && error.error.includes('not found')) {
      errorType = 'Missing Locale';
    } else if (error.error.includes('Attribute') && error.error.includes('not found')) {
      errorType = 'Missing Attribute';
    } else if (error.error.includes('not in family')) {
      errorType = 'Family Attribute Mismatch';
    } else if (error.error.includes('Unexpected error')) {
      errorType = 'Processing Error';
    }
    
    if (!groupedErrors[errorType]) {
      groupedErrors[errorType] = [];
    }
    
    groupedErrors[errorType].push(error);
  });
  
  return groupedErrors;
}

const StepProgress: React.FC<StepProgressProps> = ({ importId, onComplete }) => {
  const [importTask, setImportTask] = useState<ImportTask | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorRows, setErrorRows] = useState<ErrorRow[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch error details when error_file_url is available
  useEffect(() => {
    if (importTask?.error_file_url && importTask.error_count && importTask.error_count > 0 && errorRows.length === 0) {
      setIsLoadingErrors(true);
      
      axios.get(importTask.error_file_url)
        .then(response => {
          // Parse CSV data
          const csvText = response.data;
          const rows = csvText.split('\n');
          
          if (rows.length > 1) { // At least header + one row
            const parsedRows: ErrorRow[] = [];
            
            // Skip header row (row 0) and parse up to MAX_ERROR_ROWS
            for (let i = 1; i < Math.min(rows.length, MAX_ERROR_ROWS + 1); i++) {
              if (rows[i].trim()) {
                const columns = rows[i].split(',');
                if (columns.length >= 4) {
                  parsedRows.push({
                    row: columns[0],
                    sku: columns[1],
                    field: columns[2],
                    error: columns[3]
                  });
                }
              }
            }
            
            setErrorRows(parsedRows);
          }
        })
        .catch(err => {
          console.error('Error fetching error details:', err);
        })
        .finally(() => {
          setIsLoadingErrors(false);
        });
    }
  }, [importTask]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchStatus = async () => {
      try {
        const response = await getImport(importId);
        const task = response.data;
        setImportTask(task);
        
        // Calculate progress
        if (task.total_rows) {
          const percentage = Math.min(100, Math.round((task.processed / task.total_rows) * 100));
          setProgress(percentage);
        }
        
        // Check if import has finished
        if (task.status !== 'queued' && task.status !== 'running') {
          // Clear interval if import is complete
          clearInterval(interval);
          
          // Show success or error message
          if (task.status === 'success') {
            toast({
              title: "Import completed successfully",
              description: `Imported ${task.processed} products.`,
            });
            
            // Call onComplete callback if provided
            if (onComplete) {
              onComplete();
            }
          } else if (task.status === 'error' || task.status === 'partial_success') {
            setError(task.status === 'error' 
              ? "Import failed. No rows were imported."
              : "Import completed with errors. Some rows were not imported.");
            
            toast({
              title: "Import completed with errors",
              description: task.error_count 
                ? `${task.error_count} rows could not be imported. See details for more information.`
                : "Some rows could not be imported. See details for more information.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error fetching import status:', error);
        setError('Failed to fetch import status. Please try again later.');
        
        // Clear interval if there's an error
        clearInterval(interval);
      }
    };
    
    // Initial fetch
    fetchStatus();
    
    // Set up polling
    interval = setInterval(fetchStatus, POLLING_INTERVAL);
    
    // Clean up on unmount
    return () => {
      clearInterval(interval);
    };
  }, [importId, toast, onComplete]);

  const handleViewProducts = () => {
    navigate('/products');
  };

  const handleDownloadErrors = () => {
    if (importTask?.error_file_url) {
      window.open(importTask.error_file_url, '_blank');
    }
  };

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/products');
    }
  };

  const renderErrorBadge = () => {
    if (!importTask?.error_count) return null;
    
    return (
      <Badge variant="destructive" className="text-sm">
        {importTask.error_count} {importTask.error_count === 1 ? 'row' : 'rows'} failed
      </Badge>
    );
  };

  // Group errors by type
  const groupedErrors = useMemo(() => {
    return groupErrorsByType(errorRows);
  }, [errorRows]);
  
  // Count unique error types
  const errorTypeCount = useMemo(() => {
    return Object.keys(groupedErrors).length;
  }, [groupedErrors]);

  return (
    <Card className="p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Import in Progress</h2>
        <p className="text-muted-foreground">
          Your data is being processed. This may take a few minutes.
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          {importTask?.processed || 0} of {importTask?.total_rows || '?'} rows processed
        </p>
        
        {importTask?.error_count && importTask.error_count > 0 && (
          <div className="flex items-center mt-2">
            <Badge variant="destructive" className="text-sm">
              {importTask.error_count} {importTask.error_count === 1 ? 'row' : 'rows'} failed
            </Badge>
            {importTask.error_file_url && (
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 h-7"
                onClick={handleDownloadErrors}
              >
                <DownloadIcon className="h-3 w-3 mr-1" />
                Download Errors
              </Button>
            )}
          </div>
        )}
      </div>
      
      {importTask?.status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">Import completed successfully</h3>
            <p className="text-sm text-green-700 mt-1">
              All {importTask.processed} rows were imported successfully.
            </p>
            <Button 
              className="mt-4"
              onClick={onComplete ? handleContinue : handleViewProducts}
            >
              {onComplete ? 'Continue to Product Import' : 'View Products'}
            </Button>
          </div>
        </div>
      )}
      
      {(importTask?.status === 'error' || importTask?.status === 'partial_success') && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex flex-col">
          <div className="flex items-start">
            <AlertTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-red-800">
                  {importTask.status === 'error' ? 'Import failed' : 'Import completed with errors'}
                </h3>
                {renderErrorBadge()}
              </div>
              <p className="text-sm text-red-700 mt-1">
                {importTask.status === 'error' 
                  ? 'The import process encountered errors and no rows were imported.'
                  : `${importTask.processed} rows were imported successfully, but ${importTask.error_count || 'some'} rows encountered errors.`
                }
              </p>
              {errorTypeCount > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Error Summary:</p>
                  <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                    {Object.entries(groupedErrors).map(([type, errors]) => (
                      <li key={type}>
                        <span className="font-medium">{type}:</span> {errors.length} issue{errors.length !== 1 ? 's' : ''}
                        {type === 'Missing Locale' && (
                          <span className="ml-1 text-xs">
                            (Try creating the required locales in Settings &gt; Locales)
                          </span>
                        )}
                        {type === 'Missing Attribute' && (
                          <span className="ml-1 text-xs">
                            (Try creating the attributes in Settings &gt; Attributes)
                          </span>
                        )}
                        {type === 'Family Attribute Mismatch' && (
                          <span className="ml-1 text-xs">
                            (Add these attributes to the product family in Settings &gt; Families)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Error details table */}
          {errorRows.length > 0 && (
            <div className="mt-4 border border-red-200 rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-red-100">
                  <TableRow>
                    <TableHead className="text-red-800">Row</TableHead>
                    <TableHead className="text-red-800">SKU</TableHead>
                    <TableHead className="text-red-800">Field</TableHead>
                    <TableHead className="text-red-800">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorRows.map((error, index) => (
                    <TableRow key={index} className="bg-white hover:bg-red-50">
                      <TableCell>{error.row}</TableCell>
                      <TableCell>{error.sku}</TableCell>
                      <TableCell>{error.field}</TableCell>
                      <TableCell>
                        {error.error}
                        {error.error.includes('Locale') && error.error.includes('not found') && (
                          <span className="block text-xs italic mt-1">
                            Tip: Check Settings &gt; Locales to ensure this locale exists
                          </span>
                        )}
                        {error.error.includes('Attribute') && error.error.includes('not found') && (
                          <span className="block text-xs italic mt-1">
                            Tip: Check Settings &gt; Attributes to ensure this attribute exists
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {importTask.error_count && importTask.error_count > MAX_ERROR_ROWS && (
                <div className="p-2 text-center text-sm text-red-700 bg-red-50">
                  Showing {errorRows.length} of {importTask.error_count} errors. Download the full error report for details.
                </div>
              )}
            </div>
          )}
          
          {isLoadingErrors && (
            <div className="text-center p-3 mt-4 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">Loading error details...</p>
            </div>
          )}
          
          <div className="flex gap-3 mt-4">
            {importTask.error_file_url && (
              <Button 
                variant="outline"
                onClick={handleDownloadErrors}
                className="flex items-center"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            )}
            <Button onClick={handleViewProducts}>
              {importTask.status === 'partial_success' ? 'View Imported Products' : 'Go to Products'}
            </Button>
          </div>
        </div>
      )}
      
      {error && !importTask?.status && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <XCircleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default StepProgress; 