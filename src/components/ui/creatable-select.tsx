import React, { useState } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface CreatableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onCreateOption: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
}

export function CreatableSelect({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = "Select an option",
  className,
  name,
  disabled = false
}: CreatableSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateOption = async () => {
    if (!newOption.trim()) return;
    
    setIsLoading(true);
    try {
      await onCreateOption(newOption.trim());
      onChange(newOption.trim());
      setNewOption("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create option:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {!isCreating ? (
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          name={name}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <Button
              variant="ghost"
              className="w-full flex items-center justify-start pl-2 mt-2"
              onClick={(e) => {
                e.preventDefault();
                setIsCreating(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create new option</span>
            </Button>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center space-x-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Type new option..."
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateOption();
              } else if (e.key === 'Escape') {
                setIsCreating(false);
                setNewOption("");
              }
            }}
          />
          <Button 
            onClick={handleCreateOption}
            disabled={!newOption.trim() || isLoading}
            size="sm"
          >
            {isLoading ? "Creating..." : "Add"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setIsCreating(false);
              setNewOption("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
} 