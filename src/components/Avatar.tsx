import React, { useState, useRef } from 'react';
import { AvatarBadge } from '@/components/AvatarBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/domains/core/components/ui/dialog';
import { Button } from '@/domains/core/components/ui/button';
import { Label } from '@/domains/core/components/ui/label';
import { toast } from 'sonner';
import { Camera, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/domains/app/providers/AuthContext';
import { Progress } from '@/domains/core/components/ui/progress';

interface AvatarProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  userId?: string | number;
  name?: string;
  avatarUrl?: string;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
}

export function Avatar({
  className,
  size = 'md',
  showUploadButton = false,
  userId,
  name,
  avatarUrl,
  onAvatarUpdated,
}: AvatarProps) {
  const { user, updateUserContext } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use user data from auth context if not provided as props
  const displayName = name || user?.name || 'User';
  const userAvatarUrl = avatarUrl; // Only use the prop, don't fall back to global user
  const displayUserId = userId || user?.id;
  
  // Fix ID comparison by converting both to strings
  // This handles cases where one ID might be a number and the other a string
  const isCurrentUser = user?.id !== undefined && displayUserId !== undefined && 
    String(user.id) === String(displayUserId);
  
  // Show upload button if specified by parent and this is the current user's avatar
  const shouldShowUploadButton = showUploadButton && isCurrentUser;
  
  const handleAvatarClick = () => {
    if (shouldShowUploadButton) {
      setIsModalOpen(true);
    }
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Only allow image files
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Upload the file
    await uploadAvatar(file);
  };
  
  const uploadAvatar = async (file: File) => {
    if (!displayUserId) {
      toast.error('User ID not found');
      return;
    }
    
    // Check if this is the current user
    if (!isCurrentUser) {
      toast.error('You can only update your own avatar');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Use the new dedicated avatar endpoint
      const orgId = user?.organization_id;
      
      if (!orgId) {
        toast.error('Organization ID is required');
        setIsUploading(false);
        return;
      }
      
      // Log endpoint for debugging
      const endpoint = `/api/orgs/${orgId}/memberships/${displayUserId}/avatar/`;
      console.log(`Using endpoint: ${endpoint}`);
      console.log(`Uploading avatar for user: ${displayUserId} in org: ${orgId}`);
      
      // Upload with progress tracking
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      
      // Log response for debugging
      console.log('API Response:', response.data);
      
      // Get the avatar URL from the response
      const avatarUrl = response.data?.avatar_url;
      
      // Update the avatar URL in the context
      if (avatarUrl) {
        if (onAvatarUpdated) {
          onAvatarUpdated(avatarUrl);
        }
        
        // Only update user context if this is the current logged-in user's avatar
        if (isCurrentUser && user?.id === displayUserId) {
          updateUserContext({ avatar_url: avatarUrl });
        }
        
        toast.success('Avatar updated successfully');
        setIsModalOpen(false);
      } else {
        // If no avatar URL in response, show a warning but don't treat as error
        toast.warning('Avatar updated but URL not returned. Refresh may be required.');
        setIsModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      console.error('Error response:', error.response?.data);
      
      // More specific error message based on response
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to upload avatar';
      
      toast.error(`Failed to upload avatar: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeAvatar = async () => {
    if (!displayUserId) {
      toast.error('User ID not found');
      return;
    }
    
    // Check if this is the current user
    if (!isCurrentUser) {
      toast.error('You can only update your own avatar');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Use the new dedicated avatar endpoint
      const orgId = user?.organization_id;
      
      if (!orgId) {
        toast.error('Organization ID is required');
        setIsUploading(false);
        return;
      }
      
      // Log endpoint for debugging
      const endpoint = `/api/orgs/${orgId}/memberships/${displayUserId}/avatar/`;
      console.log(`Using endpoint for removal: ${endpoint}`);
      
      // Use the new specific avatar endpoint with DELETE method
      await api.delete(endpoint);
      
      // Update the avatar URL in the context
      if (onAvatarUpdated) {
        onAvatarUpdated('');
      }
      
      // Only update user context if this is the current logged-in user's avatar
      if (isCurrentUser && user?.id === displayUserId) {
        updateUserContext({ avatar_url: '' });
      }
      
      toast.success('Avatar removed successfully');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      console.error('Error response:', error.response?.data);
      
      // More specific error message based on response
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to remove avatar';
      
      toast.error(`Failed to remove avatar: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <>
      <div className={className} onClick={handleAvatarClick}>
        <AvatarBadge
          src={userAvatarUrl}
          name={displayName}
          size={size}
        />
        {shouldShowUploadButton && (
          <div className="absolute bottom-0 right-0 rounded-full bg-primary-500 p-1 cursor-pointer border-2 border-white">
            <Camera className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update profile picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture or remove your current one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <AvatarBadge
              src={userAvatarUrl}
              name={displayName}
              size="lg"
            />
            
            {isUploading && (
              <div className="w-full space-y-2">
                <Progress value={uploadProgress} className="w-full h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={removeAvatar}
              disabled={isUploading || !userAvatarUrl}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Photo'
              )}
            </Button>
            <Button
              type="button"
              onClick={handleFileSelect}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload New Photo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Avatar; 