import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

import DateRangeFilter from './DateRangeFilter';
import LocaleFilter from './LocaleFilter';
import CategoryFilter from './CategoryFilter';
import ChannelFilter from './ChannelFilter';

export interface ReportFiltersState {
  from?: string;
  to?: string;
  locale?: string;
  category?: string;
  channel?: string;
  brand?: string;
}

interface ReportFiltersProps {
  filters: ReportFiltersState;
  onFiltersChange: (filters: ReportFiltersState) => void;
  availableFilters?: ('date' | 'locale' | 'category' | 'channel')[];
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  availableFilters = ['date', 'locale', 'category', 'channel']
}) => {
  const handleDateRangeChange = (dateRange: DateRange) => {
    onFiltersChange({
      ...filters,
      from: dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined,
      to: dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined,
    });
  };

  const handleLocaleChange = (locale: string) => {
    onFiltersChange({ ...filters, locale: locale === 'all' ? undefined : locale });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category: category === 'all' ? undefined : category });
  };

  const handleChannelChange = (channel: string) => {
    onFiltersChange({ ...filters, channel: channel === 'all' ? undefined : channel });
  };

  const handleResetFilters = () => {
    onFiltersChange({});
  };

  // Convert from/to strings to DateRange object for the date picker
  const dateRange: DateRange = {
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters
            </h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8">
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableFilters.includes('date') && (
              <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
            )}
            
            {availableFilters.includes('locale') && (
              <LocaleFilter value={filters.locale} onChange={handleLocaleChange} />
            )}
            
            {availableFilters.includes('category') && (
              <CategoryFilter value={filters.category} onChange={handleCategoryChange} />
            )}
            
            {availableFilters.includes('channel') && (
              <ChannelFilter value={filters.channel} onChange={handleChannelChange} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilters; 