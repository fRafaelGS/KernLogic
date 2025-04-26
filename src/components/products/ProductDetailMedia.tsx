import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  ImagePlus, 
  Upload, 
  X, 
  Trash2, 
  ExternalLink, 
  Check, 
  GripVertical, 
  ZoomIn,
  Eye,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { Product } from '@/services/productService';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  featured: boolean;
  order: number;
}

// Sample product media for demonstration
const sampleImages: ProductImage[] = [
  {
    id: 'img1',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
    alt: 'Product front view',
    featured: true,
    order: 0
  },
  {
    id: 'img2',
    url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    alt: 'Product side view',
    featured: false,
    order: 1
  },
  {
    id: 'img3',
    url: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f',
    alt: 'Product back view',
    featured: false,
    order: 2
  }
];

interface ProductDetailMediaProps {
  product: Product;
  onSave?: (images: ProductImage[]) => Promise<void>;
  readOnly?: boolean;
}

export function ProductDetailMedia({ product, onSave, readOnly = false }: ProductDetailMediaProps) {
  const [images, setImages] = useState<ProductImage[]>(sampleImages);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isZoomDialogOpen, setIsZoomDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ProductImage | null>(null);
  const [imageToAdd, setImageToAdd] = useState<{url: string, alt: string}>({ url: '', alt: '' });
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedFilePreview, setDraggedFilePreview] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  // Handle image selection
  const handleSelectImage = (image: ProductImage) => {
    setSelectedImage(image);
  };
  
  // Save featured image
  const setFeaturedImage = (imageId: string) => {
    if (readOnly) return;
    
    const updatedImages = images.map(img => ({
      ...img,
      featured: img.id === imageId
    }));
    
    setImages(updatedImages);
    
    if (onSave) {
      onSave(updatedImages)
        .then(() => {
          toast.success('Featured image updated');
        })
        .catch(() => {
          setImages(images); // Rollback on error
          toast.error('Failed to update featured image');
        });
    } else {
      toast.success('Featured image updated');
    }
  };
  
  // Handle image reordering via drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination || readOnly) return;
    
    const reorderedImages = Array.from(images);
    const [movedImage] = reorderedImages.splice(result.source.index, 1);
    reorderedImages.splice(result.destination.index, 0, movedImage);
    
    // Update order property
    const updatedImages = reorderedImages.map((img, index) => ({
      ...img,
      order: index
    }));
    
    setImages(updatedImages);
    
    if (onSave) {
      onSave(updatedImages)
        .then(() => {
          toast.success('Image order updated');
        })
        .catch(() => {
          setImages(images); // Rollback on error
          toast.error('Failed to update image order');
        });
    } else {
      toast.success('Image order updated');
    }
  };
  
  // Delete image
  const handleDeleteImage = (imageId: string) => {
    if (readOnly) return;
    
    const imageToDelete = images.find(img => img.id === imageId);
    if (!imageToDelete) return;
    
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // If the deleted image was featured, make the first image featured
    if (imageToDelete.featured && updatedImages.length > 0) {
      updatedImages[0].featured = true;
    }
    
    setImages(updatedImages);
    
    // Close dialogs if the deleted image was selected
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
      setIsZoomDialogOpen(false);
    }
    
    if (editingImage?.id === imageId) {
      setEditingImage(null);
      setIsEditDialogOpen(false);
    }
    
    toast.success(`Image deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          setImages(images);
          toast.info('Deletion undone');
        }
      }
    });
    
    if (onSave) {
      onSave(updatedImages).catch(() => {
        setImages(images); // Rollback on error
        toast.error('Failed to delete image');
      });
    }
  };
  
  // Edit image details
  const openEditDialog = (image: ProductImage) => {
    if (readOnly) return;
    
    setEditingImage(image);
    setIsEditDialogOpen(true);
  };
  
  // Save edited image details
  const saveImageEdit = () => {
    if (!editingImage) return;
    
    const updatedImages = images.map(img => 
      img.id === editingImage.id ? editingImage : img
    );
    
    setImages(updatedImages);
    setIsEditDialogOpen(false);
    
    if (onSave) {
      onSave(updatedImages)
        .then(() => {
          toast.success('Image updated');
        })
        .catch(() => {
          setImages(images); // Rollback on error
          toast.error('Failed to update image');
        });
    } else {
      toast.success('Image updated');
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    simulateUpload(files[0]);
  };
  
  // Simulate file upload
  const simulateUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Create object URL for preview
    const previewUrl = URL.createObjectURL(file);
    setDraggedFilePreview(previewUrl);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Complete upload simulation
          setTimeout(() => {
            const newImage: ProductImage = {
              id: `img${Date.now()}`,
              url: previewUrl,
              alt: file.name.replace(/\.[^/.]+$/, ""),  // Use filename without extension as alt
              featured: images.length === 0, // First image is featured by default
              order: images.length
            };
            
            const updatedImages = [...images, newImage];
            setImages(updatedImages);
            
            // Reset upload state
            setIsUploading(false);
            setUploadProgress(0);
            setDraggedFilePreview(null);
            setIsUploadDialogOpen(false);
            
            if (onSave) {
              onSave(updatedImages).catch(() => {
                toast.error('Failed to save uploaded image');
              });
            }
            
            toast.success('Image uploaded successfully');
          }, 500);
          
          return 100;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 250);
  };
  
  // Handle URL image add
  const handleAddImageUrl = () => {
    if (!imageToAdd.url) {
      toast.error('Please enter an image URL');
      return;
    }
    
    // Validate URL
    try {
      new URL(imageToAdd.url);
    } catch (e) {
      toast.error('Please enter a valid URL');
      return;
    }
    
    const newImage: ProductImage = {
      id: `img${Date.now()}`,
      url: imageToAdd.url,
      alt: imageToAdd.alt || product.name || 'Product image',
      featured: images.length === 0, // First image is featured by default
      order: images.length
    };
    
    const updatedImages = [...images, newImage];
    setImages(updatedImages);
    
    // Reset form and close dialog
    setImageToAdd({ url: '', alt: '' });
    setIsUploadDialogOpen(false);
    
    if (onSave) {
      onSave(updatedImages)
        .then(() => {
          toast.success('Image added');
        })
        .catch(() => {
          setImages(images); // Rollback on error
          toast.error('Failed to add image');
        });
    } else {
      toast.success('Image added');
    }
  };
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) {
      setIsDraggingOver(true);
    }
  };
  
  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (readOnly) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Check if file is an image
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setIsUploadDialogOpen(true);
        simulateUpload(file);
      } else {
        toast.error('Please upload an image file');
      }
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Main image display */}
      <div 
        className={cn(
          "relative border rounded-lg overflow-hidden bg-slate-50 transition-all",
          isDraggingOver && "border-dashed border-primary-500 bg-primary-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary-50 bg-opacity-80 flex flex-col items-center justify-center z-10">
            <Upload className="h-12 w-12 text-primary-500 mb-2" />
            <p className="text-primary-700 font-medium">Drop image to upload</p>
          </div>
        )}
        
        {selectedImage || images.length > 0 ? (
          <div className="relative">
            <AspectRatio ratio={1}>
              <Image
                src={selectedImage?.url || images.find(img => img.featured)?.url || images[0].url}
                alt={selectedImage?.alt || images.find(img => img.featured)?.alt || images[0].alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </AspectRatio>
            
            <div className="absolute bottom-2 right-2 flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="bg-white/80 backdrop-blur-sm hover:bg-white"
                      onClick={() => {
                        setSelectedImage(selectedImage || images.find(img => img.featured) || images[0]);
                        setIsZoomDialogOpen(true);
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {!readOnly && selectedImage && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white"
                        onClick={() => openEditDialog(selectedImage)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit image details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {!readOnly && selectedImage && !selectedImage.featured && (
              <div className="absolute top-2 right-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/80 backdrop-blur-sm hover:bg-white"
                        onClick={() => setFeaturedImage(selectedImage.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Set as main
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Set as main product image</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <ImagePlus className="h-12 w-12 mb-2" />
            <p className="text-sm">No product images</p>
            {!readOnly && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add images
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Thumbnail gallery */}
      {images.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="thumbnails" direction="horizontal">
            {(provided) => (
              <div
                className="flex gap-2 overflow-x-auto pt-2 pb-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {images.map((image, index) => (
                  <Draggable 
                    key={image.id} 
                    draggableId={image.id} 
                    index={index}
                    isDragDisabled={readOnly}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "relative cursor-pointer flex-shrink-0 w-20 h-20 border rounded-md overflow-hidden",
                          image.featured && "ring-2 ring-primary-500",
                          selectedImage?.id === image.id && !image.featured && "ring-2 ring-slate-400"
                        )}
                        onClick={() => handleSelectImage(image)}
                      >
                        <Image
                          src={image.url}
                          alt={image.alt}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                        
                        {!readOnly && (
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/40 to-transparent flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-3 w-3 text-white" />
                          </div>
                        )}
                        
                        {image.featured && (
                          <div className="absolute bottom-0 left-0 right-0 bg-primary-500 text-white text-[10px] text-center py-0.5">
                            Main
                          </div>
                        )}
                        
                        {!readOnly && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-5 w-5 absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity bg-black/70 hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {!readOnly && (
                  <button
                    className="flex-shrink-0 w-20 h-20 border border-dashed rounded-md flex flex-col items-center justify-center text-slate-400 hover:text-primary-500 hover:border-primary-500 transition-colors"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <ImagePlus className="h-5 w-5 mb-1" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      
      {/* Image count indicator */}
      <div className="flex justify-between items-center text-sm text-slate-500">
        <div>
          {images.length} {images.length === 1 ? 'image' : 'images'}
          {images.length === 0 && !readOnly && (
            <Button
              variant="link"
              className="px-1 h-auto text-primary-500"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              Add first image
            </Button>
          )}
        </div>
        
        {!readOnly && images.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Upload className="h-3 w-3 mr-1" />
            Add image
          </Button>
        )}
      </div>
      
      {/* Zoom dialog */}
      <Dialog open={isZoomDialogOpen} onOpenChange={setIsZoomDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.alt || 'Product image'}</DialogTitle>
          </DialogHeader>
          
          <div className="relative mx-auto">
            {selectedImage && (
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt}
                width={800}
                height={800}
                className="object-contain max-h-[70vh]"
              />
            )}
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                window.open(selectedImage?.url, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open full size
            </Button>
            
            {!readOnly && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsZoomDialogOpen(false);
                    if (selectedImage) {
                      openEditDialog(selectedImage);
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Edit details
                </Button>
                
                {!selectedImage?.featured && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      if (selectedImage) {
                        setFeaturedImage(selectedImage.id);
                        setIsZoomDialogOpen(false);
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Set as main
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          
          {editingImage && (
            <div className="grid gap-4 py-4">
              <div className="mx-auto mb-4 relative w-24 h-24 border rounded-md overflow-hidden">
                <Image
                  src={editingImage.url}
                  alt={editingImage.alt}
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageAlt" className="text-right">
                  Alt Text
                </Label>
                <Input
                  id="imageAlt"
                  value={editingImage.alt}
                  onChange={(e) => setEditingImage({ ...editingImage, alt: e.target.value })}
                  className="col-span-3"
                  placeholder="Describe the image for accessibility"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="imageUrl" className="text-right">
                  URL
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="imageUrl"
                    value={editingImage.url}
                    onChange={(e) => setEditingImage({ ...editingImage, url: e.target.value })}
                    placeholder="Image URL"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => window.open(editingImage.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right">
                  <Label>Options</Label>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="featured"
                      checked={editingImage.featured} 
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditingImage({ ...editingImage, featured: true });
                        }
                      }}
                      disabled={editingImage.featured} // Cannot unset featured
                    />
                    <Label htmlFor="featured">Main product image</Label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                if (editingImage) {
                  handleDeleteImage(editingImage.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveImageEdit}>
                Save changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upload dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
        setIsUploadDialogOpen(open);
        if (!open) {
          setImageToAdd({ url: '', alt: '' });
          setDraggedFilePreview(null);
          setIsUploading(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Image</DialogTitle>
          </DialogHeader>
          
          <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" disabled={isUploading}>
                Upload File
              </TabsTrigger>
              <TabsTrigger value="url" disabled={isUploading}>
                Image URL
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="pt-4">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="mx-auto relative w-40 h-40 border rounded-md overflow-hidden bg-slate-50">
                    {draggedFilePreview && (
                      <Image
                        src={draggedFilePreview}
                        alt="Upload preview"
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-center text-sm text-slate-500">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:border-primary-500 hover:text-primary-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary-500', 'text-primary-500');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-primary-500', 'text-primary-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-primary-500', 'text-primary-500');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      if (file.type.startsWith('image/')) {
                        simulateUpload(file);
                      } else {
                        toast.error('Please upload an image file');
                      }
                    }
                  }}
                >
                  <Upload className="h-10 w-10 mb-2" />
                  <p className="mb-1 font-medium">Click or drag file to upload</p>
                  <p className="text-sm text-slate-400 mb-4">SVG, PNG, JPG or WEBP (max. 5MB)</p>
                  <Button variant="outline" size="sm">
                    Select file
                  </Button>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="imageUrl" className="text-right">
                    Image URL
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="imageUrl"
                      value={imageToAdd.url}
                      onChange={(e) => setImageToAdd({ ...imageToAdd, url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button
                      variant={imageToAdd.url ? "outline" : "ghost"}
                      size="icon"
                      className="flex-shrink-0"
                      disabled={!imageToAdd.url}
                      onClick={() => {
                        if (imageToAdd.url) {
                          window.open(imageToAdd.url, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="imageAlt" className="text-right">
                    Alt Text
                  </Label>
                  <Input
                    id="imageAlt"
                    value={imageToAdd.alt}
                    onChange={(e) => setImageToAdd({ ...imageToAdd, alt: e.target.value })}
                    className="col-span-3"
                    placeholder="Describe the image for accessibility"
                  />
                </div>
                
                {imageToAdd.url && (
                  <div className="mt-4 border rounded-md p-2 bg-slate-50">
                    <p className="text-sm text-slate-500 mb-2">Preview:</p>
                    <div className="relative h-40 bg-slate-200 rounded overflow-hidden">
                      <Image
                        src={imageToAdd.url}
                        alt={imageToAdd.alt || "Preview"}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <div className="flex gap-2 w-full justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsUploadDialogOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              
              {uploadTab === 'url' && (
                <Button 
                  disabled={!imageToAdd.url} 
                  onClick={handleAddImageUrl}
                >
                  Add Image
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Image optimization notice */}
      {images.length > 0 && (
        <Card className="bg-slate-50">
          <CardContent className="p-3">
            <div className="flex gap-2 items-center text-xs text-slate-500">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <p>
                Images are automatically optimized for web and mobile.
                For best results, upload high-resolution product images with a white background.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 