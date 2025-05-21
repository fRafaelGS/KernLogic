import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import { getFamilies } from '@/domains/families/services/familyService';
import { Family, normalizeFamily } from '@/domains/families/types/families';

interface FamilyFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const FamilyFilter: React.FC<FamilyFilterProps> = ({ value, onChange }) => {
  const { data: families, isLoading, error } = useQuery({
    queryKey: ['families'],
    queryFn: getFamilies,
    placeholderData: [
      { id: 1, name: 'Electronics' },
      { id: 2, name: 'Clothing' },
      { id: 3, name: 'Home Goods' },
      { id: 4, name: 'Accessories' }
    ]
  });

  // Map of family IDs to their names for display purposes
  const familyNameMap = React.useMemo(() => {
    if (!families) return {};
    
    return families.reduce((acc, family) => {
      const normalized = normalizeFamily(family);
      acc[normalized.id] = normalized.name;
      return acc;
    }, {} as Record<number, string>);
  }, [families]);

  // Find the family name for the selected value (for display purposes)
  const selectedFamilyName = React.useMemo(() => {
    if (value === 'all' || !value) return '';
    return familyNameMap[parseInt(value, 10)] || '';
  }, [value, familyNameMap]);

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
      <Select 
        value={value ?? 'all'} 
        onValueChange={onChange}
        defaultValue="all"
      >
        <SelectTrigger id="family-filter" className="w-[200px]">
          <SelectValue placeholder="All Families">
            {value && value !== 'all' ? familyNameMap[parseInt(value, 10)] || 'All Families' : 'All Families'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Families</SelectItem>
          {(families && families.length > 0) ? (
            families.map((family) => (
              <SelectItem key={family.id} value={family.id.toString()}>
                {family.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-families" disabled>
              No families available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FamilyFilter;
