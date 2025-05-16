import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface FamilyFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

interface Family {
  id: number;
  name: string;
}

const FamilyFilter: React.FC<FamilyFilterProps> = ({ value, onChange }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['families'],
    queryFn: () => axiosInstance.get<Family[]>('/api/attribute-families/').then(res => res.data),
    // Provide fallback mock data in case the API fails or is not implemented
    placeholderData: [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Clothing' },
      { id: 3, name: 'Home Goods' },
      { id: 4, name: 'Accessories' }
    ]
  });

  // Ensure families is always an array
  const families = Array.isArray(data) ? data : [];

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  // Handle error state
  if (error) {
    console.error('Error loading families:', error);
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="family-filter" className="text-sm font-medium">
        Family
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="family-filter" className="w-[200px]">
          <SelectValue placeholder="All Families" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Families</SelectItem>
          {families.map((family) => (
            <SelectItem key={family.id} value={family.id.toString()}>
              {family.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FamilyFilter; 