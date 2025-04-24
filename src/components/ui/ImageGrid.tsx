import React, { useState, useEffect } from 'react';
import { ProductImage } from '@/services/productService';
import { Card } from '@/components/ui/card';
import { ImageIcon, Star, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageGridProps {
  images: ProductImage[];
  onDelete: (imageId: number) => void;
  onSetPrimary: (imageId: number) => void;
  onReorder: (reorderedImageIds: number[]) => void;
  loadingImageId?: number | null;
}

// Sortable Item Component
const SortableImageItem = ({ id, image, loadingImageId, onDelete, onSetPrimary }: {
   id: number;
   image: ProductImage;
   loadingImageId?: number | null;
   onDelete: (id: number) => void;
   onSetPrimary: (id: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({id: id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  return (
     <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        key={image.id}
        className="overflow-hidden relative group border rounded-lg shadow-sm touch-none"
     >
         <div className="relative aspect-square bg-enterprise-50">
              {/* Loading Spinner Overlay */}
              {loadingImageId === image.id && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              )}
              {/* Drag Handle (applied to the whole card via listeners) */}
              <button {...listeners} className="absolute top-1 right-1 p-1 cursor-move text-white/50 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/20 rounded-full" title="Drag to reorder">
                 <GripVertical size={16} />
              </button>
              <img
                    src={image.url}
                    alt={`Product Image ${image.order + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { 
                      console.log(`Image load error for ${image.url}`);
                      // Don't clear the src attribute completely
                      // (e.target as HTMLImageElement).src = '';
                    }}
                />
              {/* Placeholder for broken image */}
              {!image.url && (
                 <div className="absolute inset-0 flex items-center justify-center bg-enterprise-100">
                     <ImageIcon className="h-8 w-8 text-enterprise-400" />
                 </div>
              )}
              {/* Primary Badge */}
              {image.is_primary && (
                 <Badge variant="default" className="absolute top-2 left-2 z-10 bg-primary-600 text-primary-foreground text-xs px-1.5 py-0.5">Primary</Badge>
              )}
              {/* Actions Overlay (shown on group-hover) */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="flex gap-2">
                      {/* Set Primary Button */}
                      {!image.is_primary && (
                          <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 bg-white/80 hover:bg-white text-primary-600 border-primary-200"
                              onClick={() => onSetPrimary(image.id)}
                              disabled={loadingImageId === image.id}
                              title="Set as primary image"
                          >
                              <Star className="h-4 w-4" />
                          </Button>
                      )}
                      {/* Delete Button */}
                       <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-white/80 hover:bg-white text-danger-600 border-danger-200"
                          onClick={() => onDelete(image.id)}
                          disabled={loadingImageId === image.id}
                          title="Delete image"
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
         </div>
     </Card>
  );
}

// Main ImageGrid Component
export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  onDelete,
  onSetPrimary,
  onReorder,
  loadingImageId,
}) => {
  // Use local state derived from props for drag-n-drop interaction
  const [localImages, setLocalImages] = useState<ProductImage[]>([]);

  useEffect(() => {
      // Sync local state when the images prop changes
      const sorted = [...images].sort((a, b) => a.order - b.order);
      setLocalImages(sorted);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        onReorder(reordered.map(img => img.id));
        return reordered;
      });
    }
  }

  if (!images || images.length === 0) {
    return (
      <div className="text-center text-sm text-enterprise-500 py-8 border border-dashed rounded-md">
        No images uploaded yet.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localImages.map(img => img.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {localImages.map((image) => (
            <SortableImageItem
              key={image.id}
              id={image.id}
              image={image}
              loadingImageId={loadingImageId}
              onDelete={onDelete}
              onSetPrimary={onSetPrimary}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}; 