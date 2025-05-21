import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import localeService, { Locale } from '@/services/localeService';

interface LocaleFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const LocaleFilter: React.FC<LocaleFilterProps> = ({ value, onChange }) => {
  const { data: locales, isLoading, error } = useQuery<Locale[]>({
    queryKey: ['locales', 'analytics'],
    queryFn: localeService.getLocales,
  });

  // Create a lookup map for locale display names
  const localeNameMap = React.useMemo(() => {
    if (!locales) return {};
    
    return locales.reduce((acc: Record<string, string>, locale: Locale) => {
      acc[locale.code] = locale.label || locale.description || locale.code;
      return acc;
    }, {} as Record<string, string>);
  }, [locales]);

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (error) {
    console.error('Error loading locales:', error);
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="locale-filter" className="text-sm font-medium">
        Locale
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="locale-filter" className="w-[200px]">
          <SelectValue placeholder="All Locales">
            {value && value !== 'all' ? localeNameMap[value] || 'All Locales' : 'All Locales'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locales</SelectItem>
          {locales && locales.length > 0 ? (
            locales.map((locale: Locale) => (
              <SelectItem key={locale.code} value={locale.code}>
                {locale.label || locale.description || locale.code}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-locales" disabled>
              No locales available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LocaleFilter; 