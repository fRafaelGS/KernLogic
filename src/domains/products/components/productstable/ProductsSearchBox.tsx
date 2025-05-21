import React, { useRef } from 'react';
import { Input } from "@/domains/core/components/ui/input";
import { SearchIcon } from "lucide-react";

interface ProductsSearchBoxProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

export function ProductsSearchBox({
  value,
  onChange,
  className = '',
  placeholder = 'Search products...'
}: ProductsSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          className={`pl-8 h-9 ${className}`}
        />
      </div>
    </div>
  );
} 