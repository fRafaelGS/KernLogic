import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

interface Category {
  id: number;
  name: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ value, onChange }) => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axiosInstance.get<Category[]>('/api/analytics/categories/').then(res => res.data),
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
          {categories?.map((category) => (
            <SelectItem key={category.id} value={category.name}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategoryFilter; 