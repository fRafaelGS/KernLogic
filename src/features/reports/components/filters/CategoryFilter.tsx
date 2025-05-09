import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';
import { Category, normalizeCategory } from '@/types/categories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="category-filter" className="text-sm font-medium">
        Category
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="category-filter" className="w-[200px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories?.map((category) => {
            // Normalize the category to ensure we get the name property consistently
            const normalizedCategory = normalizeCategory(category);
            return (
              <SelectItem key={normalizedCategory.id} value={normalizedCategory.name}>
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