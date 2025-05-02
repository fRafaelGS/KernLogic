import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface LocaleFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

interface Locale {
  code: string;
  description: string;
}

const LocaleFilter: React.FC<LocaleFilterProps> = ({ value, onChange }) => {
  const { data: locales, isLoading } = useQuery({
    queryKey: ['locales'],
    queryFn: () => axiosInstance.get<Locale[]>('/api/analytics/locales/').then(res => res.data),
    // Fallback mock data when the API is not available yet
    placeholderData: [
      { code: 'en_US', description: 'English (US)' },
      { code: 'fr_FR', description: 'French' },
      { code: 'es_ES', description: 'Spanish' },
      { code: 'de_DE', description: 'German' },
      { code: 'it_IT', description: 'Italian' },
      { code: 'ja_JP', description: 'Japanese' },
    ]
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="locale-filter" className="text-sm font-medium">
        Locale
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="locale-filter" className="w-[200px]">
          <SelectValue placeholder="All Locales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locales</SelectItem>
          {locales?.map((locale) => (
            <SelectItem key={locale.code} value={locale.code}>
              {locale.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LocaleFilter; 