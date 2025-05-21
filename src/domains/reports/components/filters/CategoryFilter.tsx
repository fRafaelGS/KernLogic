import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';
import { Category, normalizeCategory } from '@/types/categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { Skeleton } from '@/domains/core/components/ui/skeleton';

interface CategoryFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ value, onChange }) => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    // Fallback mock data when the API is not available yet
    placeholderData: [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Clothing' },
      { id: 3, name: 'Home Goods' },
      { id: 4, name: 'Sports' },
      { id: 5, name: 'Toys' },
    ]
  });

  // Map of category IDs to their names for display purposes
  const categoryNameMap = React.useMemo(() => {
    if (!categories) return {};
    
    return categories.reduce((acc, category) => {
      const normalized = normalizeCategory(category);
      acc[normalized.id] = normalized.name;
      return acc;
    }, {} as Record<number, string>);
  }, [categories]);

  // Find the category name for the selected value (for display purposes)
  const selectedCategoryName = React.useMemo(() => {
    if (value === 'all' || !value) return '';
    return categoryNameMap[parseInt(value, 10)] || '';
  }, [value, categoryNameMap]);

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="category-filter" className="text-sm font-medium">
        Category
      </label>
      <Select 
        value={value ?? 'all'} 
        onValueChange={onChange}
      >
        <SelectTrigger id="category-filter" className="w-[200px]">
          <SelectValue placeholder="All Categories">
            {value && value !== 'all' ? categoryNameMap[parseInt(value, 10)] || 'All Categories' : 'All Categories'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories?.map((category) => {
            // Normalize the category to ensure we get the name and id properties consistently
            const normalizedCategory = normalizeCategory(category);
            return (
              <SelectItem 
                key={normalizedCategory.id} 
                value={normalizedCategory.id.toString()}
              >
                {normalizedCategory.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategoryFilter; 