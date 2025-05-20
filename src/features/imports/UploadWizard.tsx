import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import StepUpload from './StepUpload';
import StepMapping from './StepMapping';
import StepProgress from './StepProgress';
import StepImportMode, { ImportMode } from './StepImportMode';
import { 
  createImport, 
  createAttributeGroupImport, 
  createAttributeImport, 
  createFamilyImport,
  getImportFieldSchema,
  DuplicateStrategy,
  ImportOptions,
  ImportFieldSchemaEntry
} from '@/services/importService';
import { 
  useImportFieldSchema, 
} from './hooks/useImportFieldSchema';
import { Mapping } from '@/types/import';
import { config } from '@/config/config';

// Define a type for the current step of the wizard
type WizardStep = 'mode' | 'upload' | 'mapping' | 'progress';

// Define a type for the structure type to import
type StructureType = 'attribute_groups' | 'attributes' | 'families' | null;

const UploadWizard = () => {
  // State for tracking the current step in the wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>('mode');
  
  // Import mode selection
  const [importMode, setImportMode] = useState<ImportMode>('products');
  
  // For structure imports, we need to track which type we're importing
  const [structureType, setStructureType] = useState<StructureType>(null);
  
  // File and data states
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importId, setImportId] = useState<number | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>(
    config.imports.defaults.duplicateStrategy as DuplicateStrategy
  );
  const [attributeHeaderPattern, setAttributeHeaderPattern] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Fetch the schema data for different import types
  const { productFieldSchema, attributeGroupSchema, attributeSchema, familySchema } = useImportFieldSchema();
  
  // Fetch attribute header pattern
  useEffect(() => {
    if (importMode === 'products') {
      getImportFieldSchema(2)
        .then(response => {
          if (response.data.attribute_header_pattern) {
            setAttributeHeaderPattern(response.data.attribute_header_pattern);
          }
        })
        .catch(error => {
          console.error('Failed to fetch attribute header pattern:', error);
        });
    }
  }, [importMode]);
  
  // Handle import mode selection
  const handleModeSelected = (mode: ImportMode) => {
    setImportMode(mode);
    setCurrentStep('upload');
    
    // Reset other states when mode changes
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setMapping({});
    setImportId(null);
    
    // For structure imports, we need to select a structure type
    if (mode === 'structure') {
      setStructureType(null);
    }
  };
  
  // Handle structure type selection (for structure imports)
  const handleStructureTypeSelect = (type: StructureType) => {
    setStructureType(type);
    // Could add additional logic here if needed
  };

  // Get the appropriate field schema based on current mode and structure type
  const getCurrentFieldSchema = (): ImportFieldSchemaEntry[] | null => {
    if (importMode === 'products') {
      return productFieldSchema;
    } else if (importMode === 'structure') {
      // For structure imports, use the appropriate schema based on structure type
      switch (structureType) {
        case 'attribute_groups':
          return attributeGroupSchema;
        case 'attributes':
          return attributeSchema;
        case 'families':
          return familySchema;
        default:
          return null;
      }
    }
    return productFieldSchema;
  };

  const handleFileSelected = (file: File, headers: string[], previewData: any[]) => {
    setFile(file);
    setHeaders(headers);
    setPreviewData(previewData);
    setCurrentStep('mapping');
  };

  const handleMappingComplete = async (mappingData: Mapping) => {
    if (!file) {
      toast({
        title: config.imports.display.uploadErrors.noFileSelected || "No file selected",
        description: config.imports.display.uploadErrors.pleaseSelectFile || "Please select a file first.",
        variant: "destructive"
      });
      return;
    }
    
    // Store the mapping for reference
    setMapping(mappingData);

    try {
      let response: { data: { id: number } } | undefined;
      
      // Call the appropriate import API based on import mode and structure type
      if (importMode === 'products') {
        // Product import with duplicate strategy
        const options: ImportOptions = { overwrite_policy: duplicateStrategy };
        response = await createImport(file, mappingData, options);
      } else if (importMode === 'structure') {
        // Structure import based on type
        switch (structureType) {
          case 'attribute_groups':
            response = await createAttributeGroupImport(file, mappingData);
            break;
          case 'attributes':
            response = await createAttributeImport(file, mappingData);
            break;
          case 'families':
            response = await createFamilyImport(file, mappingData);
            break;
          default:
            throw new Error('Please select a structure type to import');
        }
      }
      
      if (response?.data?.id) {
        setImportId(response.data.id);
        setCurrentStep('progress');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error creating import:', error);
      toast({
        title: config.imports.display.uploadErrors.errorStartingImport || "Error starting import",
        description: config.imports.display.uploadErrors.errorStartingImportDesc || "There was an error starting the import process. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Get the title and description based on the current import mode
  const getImportTitle = () => {
    if (importMode === 'products') {
      return config.imports.display.titles.products;
    } else if (importMode === 'structure') {
      return config.imports.display.titles.structure;
    }
    return config.imports.display.titles.default;
  };

  const getImportDescription = () => {
    if (importMode === 'products') {
      return config.imports.display.descriptions.products;
    } else if (importMode === 'structure') {
      return config.imports.display.descriptions.structure;
    }
    return config.imports.display.descriptions.default;
  };

  // Handle duplicate strategy change
  const handleDuplicateStrategyChange = (strategy: DuplicateStrategy) => {
    setDuplicateStrategy(strategy);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{getImportTitle()}</CardTitle>
          <CardDescription>
            {getImportDescription()}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {currentStep === 'mode' ? (
            <StepImportMode onModeSelected={handleModeSelected} />
          ) : (
            <Tabs
              value={currentStep}
              onValueChange={(value) => {
                // Only allow going backwards
                if (
                  (currentStep === 'mapping' && value === 'upload') ||
                  (currentStep === 'progress' && (value === 'upload' || value === 'mapping'))
                ) {
                  setCurrentStep(value as WizardStep);
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                {config.imports.display.steps.map((step) => (
                  <TabsTrigger 
                    key={step.value} 
                    value={step.value}
                    disabled={
                      (step.value === 'mapping' && !file) || 
                      (step.value === 'progress' && !importId) ||
                      (step.value === 'upload' && currentStep === 'progress')
                    }
                  >
                    {step.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="mt-6">
                <TabsContent value="upload">
                  <StepUpload 
                    onFileSelected={handleFileSelected} 
                    importMode={importMode}
                    structureType={structureType}
                    onStructureTypeSelect={handleStructureTypeSelect}
                    duplicatePolicy={duplicateStrategy}
                    onDuplicatePolicyChange={handleDuplicateStrategyChange}
                  />
                </TabsContent>
                
                <TabsContent value="mapping">
                  {file && headers.length > 0 && (
                    <StepMapping 
                      sourceHeaders={headers} 
                      onMappingComplete={handleMappingComplete}
                      fieldSchema={getCurrentFieldSchema()}
                      previewData={previewData}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="progress">
                  {importId && (
                    <StepProgress 
                      importId={importId}
                    />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadWizard; 