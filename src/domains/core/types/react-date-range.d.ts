declare module 'react-date-range' {
  import { Ref, ComponentProps } from 'react'

  export interface Range {
    startDate?: Date
    endDate?: Date
    key: string
    color?: string
    showDateDisplay?: boolean
    [key: string]: any
  }

  export interface DateRangeProps {
    ranges: Range[]
    onChange: (range: { [key: string]: Range }) => void
    months?: number
    showDateDisplay?: boolean
    showMonthAndYearPickers?: boolean
    showPreview?: boolean
    showSelectionPreview?: boolean
    direction?: 'horizontal' | 'vertical'
    moveRangeOnFirstSelection?: boolean
    editableDateInputs?: boolean
    preventSnapRefocus?: boolean
    calendarFocus?: 'backwards' | 'forwards'
    className?: string
    minDate?: Date
    maxDate?: Date
    modal?: boolean
  }

  export const DateRange: React.FC<DateRangeProps>
  
  export interface CalendarProps {
    date: Date
    onChange: (date: Date) => void
    color?: string
    className?: string
    minDate?: Date
    maxDate?: Date
  }
  
  export const Calendar: React.FC<CalendarProps>
} 