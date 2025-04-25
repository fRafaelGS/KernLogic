import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  id: string;
  placeholder?: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  id,
  placeholder = 'Add a tag...',
  tags,
  setTags,
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      if (tags.length < maxTags) {
        const newTag = inputValue.trim();
        if (!tags.includes(newTag)) {
          setTags([...tags, newTag]);
          setInputValue('');
        }
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove the last tag when backspace is pressed on an empty input
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[40px]">
      {tags.map((tag, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-enterprise-200 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </Badge>
      ))}
      <Input 
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] border-none p-0 px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}; 