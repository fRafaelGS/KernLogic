import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import StepUpload from './StepUpload';
import StepMapping from './StepMapping';
import StepProgress from './StepProgress';
import { createImport } from '@/services/importService';
import { useImportFieldSchema } from './hooks/useImportFieldSchema';
import { Mapping } from '@/types/import';

const UploadWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'progress'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importId, setImportId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Fetch the field schema
  const { data: fieldSchema } = useImportFieldSchema();

  const handleFileSelected = (file: File, headers: string[], previewData: any[]) => {
    // Debug log: check file type
    console.log('File selected in wizard:', file, 'Type:', typeof file, 'Instanceof File:', file instanceof File)
    setFile(file);
    setHeaders(headers);
    setPreviewData(previewData);
    setCurrentStep('mapping');
  };

  const handleMappingComplete = async (mappingData: Mapping) => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file first.",
        variant: "destructive"
      });
      return;
    }
    
    // Store the mapping for reference
    setMapping(mappingData);

    try {
      // Submit to API - the backend will handle field validation
      const response = await createImport(file, mappingData);
      setImportId(response.data.id);
      setCurrentStep('progress');
    } catch (error) {
      console.error('Error creating import:', error);
      toast({
        title: "Error starting import",
        description: "There was an error starting the import process. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Import Products</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file to import products in bulk.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={currentStep}
            onValueChange={(value) => {
              // Only allow going backwards
              if (
                (currentStep === 'mapping' && value === 'upload') ||
                (currentStep === 'progress' && (value === 'upload' || value === 'mapping'))
              ) {
                setCurrentStep(value as any);
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" disabled={currentStep === 'progress'}>
                1. Upload File
              </TabsTrigger>
              <TabsTrigger value="mapping" disabled={!file || currentStep === 'progress'}>
                2. Map Columns
              </TabsTrigger>
              <TabsTrigger value="progress" disabled={!importId}>
                3. Import Progress
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="upload">
                <StepUpload onFileSelected={handleFileSelected} />
              </TabsContent>
              
              <TabsContent value="mapping">
                {file && headers.length > 0 && (
                  <StepMapping 
                    sourceHeaders={headers} 
                    onMappingComplete={handleMappingComplete} 
                  />
                )}
              </TabsContent>
              
              <TabsContent value="progress">
                {importId && <StepProgress importId={importId} />}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadWizard; 