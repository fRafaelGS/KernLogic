import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaginationProps {
  pagination: { pageIndex: number; pageSize: number }
  onChange: (pagination: { pageIndex: number; pageSize: number }) => void
  pageCount: number
  pageSizeOptions: number[]
}

export function PaginationControls({
  pagination,
  onChange,
  pageCount,
  pageSizeOptions
}: PaginationProps) {
  const { pageIndex, pageSize } = pagination
  
  const handlePreviousPage = () => {
    if (pageIndex > 0) {
      onChange({ ...pagination, pageIndex: pageIndex - 1 })
      // Scroll to top for better UX
      window.scrollTo(0, 0)
    }
  }

  const handleNextPage = () => {
    if (pageIndex < pageCount - 1) {
      onChange({ ...pagination, pageIndex: pageIndex + 1 })
      // Scroll to top for better UX
      window.scrollTo(0, 0)
    }
  }

  const handlePageSizeChange = (value: string) => {
    onChange({
      pageIndex: 0, // Reset to first page when changing page size
      pageSize: parseInt(value, 10)
    })
  }

  // Calculate pagination information text
  const renderPaginationInfo = () => {
    const start = pageCount === 0 ? 0 : pageIndex * pageSize + 1
    const end = Math.min((pageIndex + 1) * pageSize, pageCount * pageSize)
    return `Page ${pageIndex + 1} of ${Math.max(1, pageCount)}`
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 h-12 bg-slate-100 border-t border-slate-300/40">
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          onClick={handlePreviousPage} 
          disabled={pageIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          onClick={handleNextPage} 
          disabled={pageIndex >= pageCount - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span className="text-sm text-slate-600">
        {renderPaginationInfo()}
      </span>

      <div className="flex items-center space-x-2">
        <span className="text-sm">Show</span>
        <Select
          value={pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 