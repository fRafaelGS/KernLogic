import React from 'react';
import { DatePickerWithRange } from '@/domains/core/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium">Date Range</label>
      <DatePickerWithRange
        date={value}
        setDate={onChange}
      />
    </div>
  );
};

export default DateRangeFilter; 