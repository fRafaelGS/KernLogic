import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, Link, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onFilesUpload: (files: File[]) => void; // Callback for file uploads
  onUrlUpload: (url: string) => void; // Callback for URL upload
  uploading: boolean; // Is an upload in progress?
  progress: number; // Upload progress percentage
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFormats?: string[]; // e.g., ['image/jpeg', 'image/png']
  currentImageCount?: number; // Add prop for current count
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onFilesUpload,
  onUrlUpload,
  uploading = false,
  progress = 0,
  maxFiles = 10, // Example defaults
  maxSizeMB = 5, // Example defaults
  acceptedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  currentImageCount = 0, // Default to 0
}) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setUrlError(null); // Clear error on change
  };

  const handleAddUrl = () => {
    if (!url.trim()) {
      setUrlError('Please enter a valid URL.');
      return;
    }
    // Basic URL validation (more robust validation is recommended)
    try {
      new URL(url);
      onUrlUpload(url);
      setUrl(''); // Clear input on success
    } catch (_err) {
      setUrlError('Invalid URL format.');
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const currentCount = currentImageCount; // Use prop value
      const availableSlots = maxFiles - currentCount;

      // Handle too many files selected at once, considering existing count
      if (acceptedFiles.length > availableSlots) {
        const message = `Cannot upload ${acceptedFiles.length} files. Only ${availableSlots > 0 ? availableSlots : 0} slot(s) remaining (max ${maxFiles}).`;
        console.error(message);
        alert(message); // Or use toast
        // Slice accepted files to fit available slots if desired, or reject all
        acceptedFiles = acceptedFiles.slice(0, availableSlots);
         if(acceptedFiles.length === 0) return; // Stop if no files fit
      }

      // Handle rejected files (size, type, maxFiles)
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejected: any) => {
          rejected.errors.forEach((err: any) => {
            let message = `File "${rejected.file.name}" error: `;
            if (err.code === 'file-too-large') {
              message += `Size exceeds ${maxSizeMB}MB limit.`;
            } else if (err.code === 'file-invalid-type') {
              message += `Invalid file type.`;
            } else if (err.code === 'too-many-files') {
              message = `Cannot upload more than ${maxFiles} files at once.`;
            } else {
              message += err.message;
            }
            // Consider using toast here instead of console
            console.error(message);
             alert(message); // Simple alert for now
          });
        });
      }

      if (acceptedFiles.length > 0) {
        onFilesUpload(acceptedFiles);
      }
    },
    [onFilesUpload, maxFiles, maxSizeMB, currentImageCount] // Add currentImageCount dependency
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, fmt) => ({ ...acc, [fmt]: [] }), {}),
    maxSize: maxSizeMB * 1024 * 1024, // Convert MB to bytes
    maxFiles: maxFiles,
    disabled: uploading || currentImageCount >= maxFiles,
  });

  const isLimitReached = currentImageCount >= maxFiles;

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}      
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors relative',
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-enterprise-200 bg-white hover:border-enterprise-300',
          (uploading || isLimitReached) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={cn(
            'mx-auto h-10 w-10 mb-3',
            isDragActive ? 'text-primary-600' : 'text-enterprise-400'
          )}
        />
        {isLimitReached ? (
            <p className="font-medium text-warning-600">Maximum number of images ({maxFiles}) reached.</p>
        ) : isDragActive ? (
          <p className="font-medium text-primary-700">Drop images here...</p>
        ) : (
          <p className="text-sm text-enterprise-600">
            Drag 'n' drop image files here, or click to select
            <span className="block text-xs text-enterprise-400 mt-1">
              (Max {maxFiles} files, {maxSizeMB}MB per file. Types: {acceptedFormats.map(f => f.split('/')[1]).join(', ').toUpperCase()})
            </span>
          </p>
        )}
        {/* Progress Overlay */}        
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
             <Progress value={progress} className="w-3/4 h-2 mb-2" />
             <p className="text-sm font-medium text-primary-700">Uploading... {progress}%</p>
          </div>
        )}
      </div>

      {/* URL Input Area */}      
      <div className="flex items-end gap-2">
        <div className="flex-grow space-y-1.5">
          <Label htmlFor="image-url" className="text-xs font-medium text-enterprise-700">Or add image from URL</Label>
          <Input
            id="image-url"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={handleUrlInputChange}
            disabled={uploading || isLimitReached}
            className={cn(urlError && "border-danger-500 focus-visible:ring-danger-500")}
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "url-error" : undefined}
          />
           {urlError && (
                <p id="url-error" role="alert" className="text-xs text-danger-600 flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" />{urlError}</p>
            )}
        </div>
        <Button 
            type="button" 
            variant="secondary" 
            onClick={handleAddUrl} 
            disabled={uploading || !url.trim() || isLimitReached}
        >
            <Link className="h-4 w-4 mr-1.5"/> Add URL
        </Button>
      </div>
    </div>
  );
}; 