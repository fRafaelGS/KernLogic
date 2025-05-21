import React, { useState, KeyboardEvent, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/domains/core/components/ui/badge';
import { Input } from '@/domains/core/components/ui/input';
import { cn } from '@/domains/core/lib/utils';

interface TagInputProps {
  id: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  id,
  tags,
  setTags,
  placeholder = 'Add tag...',
  maxTags = 5,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  
  // Synchronize with parent when tags change externally
  useEffect(() => {
    console.log('TagInput: tags prop updated', tags);
  }, [tags]);
  
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    
    // Validate tag
    if (!trimmedTag || trimmedTag.length < 1) return;
    if (tags.includes(trimmedTag)) return;
    if (tags.length >= maxTags) return;
    
    console.log('Adding tag:', trimmedTag, 'Current tags:', tags);
    const newTags = [...tags, trimmedTag];
    console.log('New tags array:', newTags);
    setTags(newTags);
    setInputValue('');
  };
  
  const removeTag = (indexToRemove: number) => {
    console.log('Removing tag at index:', indexToRemove);
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Log key event
    console.log(`Key pressed: ${e.key}, input value: ${inputValue}`);
    
    // Add tag on Enter
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      console.log('Enter key pressed with input value, adding tag');
      addTag(inputValue);
      return;
    }
    
    // Remove last tag on Backspace when input is empty
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      console.log('Backspace pressed on empty input, removing last tag');
      removeTag(tags.length - 1);
      return;
    }
    
    // Add tag on comma
    if (e.key === ',') {
      e.preventDefault();
      if (inputValue) {
        console.log('Comma pressed, adding tag');
        addTag(inputValue);
        return;
      }
    }
  };
  
  return (
    <div 
      className={cn(
        "flex flex-wrap gap-1 min-h-9 p-1 border rounded-md focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary",
        disabled && "bg-muted opacity-50 cursor-not-allowed",
        className
      )}
    >
      {tags.map((tag, index) => (
        <Badge
          key={`${tag}-${index}`}
          variant="secondary"
          className="px-2 h-6 flex items-center gap-1 text-xs"
        >
          {tag}
          {!disabled && (
            <button 
              type="button" 
              onClick={() => removeTag(index)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      
      {tags.length < maxTags && !disabled && (
        <div className="flex-1 flex items-center min-w-[120px]">
          <Input
            id={id}
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              console.log('Input changed:', newValue);
              setInputValue(newValue);
            }}
            onKeyDown={handleKeyDown}
            placeholder=""
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-xs h-6"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                console.log('Add tag button clicked for:', inputValue);
                addTag(inputValue);
              }}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Add tag"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      
      {tags.length >= maxTags && !disabled && (
        <Badge variant="outline" className="text-xs px-2 py-0 h-6">
          Max {maxTags} tags
        </Badge>
      )}
    </div>
  );
} 