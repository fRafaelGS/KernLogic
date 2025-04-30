import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { productService } from '@/services/productService';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface ProductsSearchBoxProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
}

interface Suggestion {
  sku?: string;
  brand?: string;
  id?: number;
}

export function ProductsSearchBox({
  value,
  onChange,
  className = '',
  placeholder = 'Search products...'
}: ProductsSearchBoxProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(value, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when search term changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await productService.suggestProducts(debouncedSearchTerm);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchTerm]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.sku) {
      // Set the search term to the SKU
      const syntheticEvent = {
        target: { value: suggestion.sku }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
      inputRef.current?.focus();
    }
    
    setShowSuggestions(false);
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Enter') {
      setShowSuggestions(false);
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
          onChange={(e) => {
            onChange(e);
            if (e.target.value.length >= 2) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className={`pl-8 h-9 ${className}`}
        />
        {loading && (
          <div className="absolute right-2.5 top-2.5">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div 
          ref={suggestionsRef}
          className="absolute left-0 w-full bg-white shadow-sm z-50 max-h-60 overflow-auto rounded-md mt-1 border border-gray-200"
        >
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li 
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.sku ? (
                  <span className="font-mono">{suggestion.sku}</span>
                ) : suggestion.brand ? (
                  <span>{suggestion.brand} <span className="text-gray-500">(brand)</span></span>
                ) : (
                  <span>Unknown suggestion type</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 