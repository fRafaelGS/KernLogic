import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/domains/core/lib/utils";
import { Button } from "@/domains/core/components/ui/button";
import { DateRange } from "react-day-picker";

// Import the styles for react-day-picker
import "react-day-picker/dist/style.css";
import { DayPicker } from "react-day-picker";
import "./date-range-picker.css";

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange) => void;
}

export function DatePickerWithRange({
  className,
  date,
  setDate
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  
  // Track if we're on mobile for responsive adjustments
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Handle screen resize for responsive display
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial value
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Format the date for display in the button
  const formatDisplayDate = () => {
    if (date?.from) {
      if (date.to) {
        return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
      }
      return format(date.from, "LLL dd, y");
    }
    return "Pick a date range";
  };
  
  // Handle clearing the date selection
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDate({ from: undefined, to: undefined });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal>
        <PopoverPrimitive.Trigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full",
              !date?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDisplayDate()}
          </Button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-50 bg-white shadow-lg border rounded-md p-4 w-auto"
            onPointerDownOutside={(event) => {
              if (
                calendarRef.current &&
                calendarRef.current.contains(event.target as Node)
              ) {
                event.preventDefault();
              }
            }}
            onFocusOutside={(event) => {
              if (
                calendarRef.current &&
                calendarRef.current.contains(event.target as Node)
              ) {
                event.preventDefault();
              }
            }}
          >
            <div
              ref={calendarRef}
              id="calendar-wrapper"
              className="date-picker-container"
            >
              <DayPicker
                mode="range"
                selected={date}
                onSelect={(selectedRange) => {
                  // Handle undefined or null by providing empty range
                  setDate(selectedRange || { from: undefined, to: undefined });
                }}
                numberOfMonths={isMobile ? 1 : 2}
                className="date-picker"
              />
              <div className="flex justify-end border-t pt-3 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
} 