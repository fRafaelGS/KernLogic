import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircleIcon, XCircleIcon, FileIcon, AlertTriangleIcon } from 'lucide-react';
import { getImport, ImportTask } from '@/services/importService';
import { useNavigate } from 'react-router-dom';

interface StepProgressProps {
  importId: number;
}

const POLLING_INTERVAL = 3000; // 3 seconds

const StepProgress: React.FC<StepProgressProps> = ({ importId }) => {
  const [importTask, setImportTask] = useState<ImportTask | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
          } else if (task.status === 'error') {
            setError("Import encountered errors. Some rows may not have been imported.");
            toast({
              title: "Import completed with errors",
              description: "Some rows could not be imported. See details for more information.",
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
  }, [importId, toast]);

  const handleViewProducts = () => {
    navigate('/products');
  };

  const handleDownloadErrors = () => {
    if (importTask?.error_file) {
      window.open(importTask.error_file, '_blank');
    }
  };

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
              onClick={handleViewProducts}
            >
              View Products
            </Button>
          </div>
        </div>
      )}
      
      {importTask?.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Import completed with errors</h3>
            <p className="text-sm text-red-700 mt-1">
              {importTask.processed} rows were imported successfully, but some rows encountered errors.
            </p>
            <div className="flex gap-3 mt-4">
              {importTask.error_file && (
                <Button 
                  variant="outline"
                  onClick={handleDownloadErrors}
                  className="flex items-center"
                >
                  <FileIcon className="h-4 w-4 mr-2" />
                  Download Error Log
                </Button>
              )}
              <Button onClick={handleViewProducts}>
                View Products
              </Button>
            </div>
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