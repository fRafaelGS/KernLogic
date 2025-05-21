import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/domains/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/domains/core/components/ui/card";
import { UploadIcon, FileIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/domains/core/components/ui/progress";

export function FileUpload() {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check file type - for demo, we'll accept CSV, Excel files
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = ['csv', 'xlsx', 'xls'];
    
    if (!acceptedTypes.includes(fileType || '')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file.",
      });
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        toast({
          title: "File uploaded successfully",
          description: `${file.name} has been uploaded.`,
        });
      }
    }, 200);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Product Data</CardTitle>
        <CardDescription>
          Upload your CSV or Excel files containing product data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploadedFile ? (
          <div className="rounded-md border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <FileIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {Math.round(uploadedFile.size / 1024)} KB
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={removeFile}
                disabled={isUploading}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            {isUploading && (
              <div className="mt-4 space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-right text-muted-foreground">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-md border border-dashed p-10 transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <UploadIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 text-sm font-medium">
              Drag files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Support for CSV and Excel files
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              Select File
            </Button>
          </div>
        )}
      </CardContent>
      {uploadedFile && !isUploading && (
        <CardFooter className="flex justify-end space-x-2">
          <Button
            variant="primary"
          >
            Start Processing
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
