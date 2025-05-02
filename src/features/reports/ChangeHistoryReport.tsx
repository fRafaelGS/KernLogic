import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkChangeHistory } from '@/lib/queryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ChangeHistoryItem {
  id: number;
  date: string;
  username: string;
  entity_type: string;
  entity_id: number;
  action: string;
  details: string;
}

const ChangeHistoryReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const [page, setPage] = useState(1);
  
  const { data, isLoading, error } = useQuery({
    queryKey: qkChangeHistory({
      from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    }),
    queryFn: () => axiosInstance.get<ChangeHistoryItem[]>(
      paths.analytics.changeHistory({
        from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      })
    ).then(res => res.data),
    // Fallback mock data for development
    placeholderData: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      username: ['admin', 'john.doe', 'mary.smith'][Math.floor(Math.random() * 3)],
      entity_type: ['product', 'attribute_value', 'category'][Math.floor(Math.random() * 3)],
      entity_id: Math.floor(Math.random() * 1000) + 1,
      action: ['create', 'update', 'delete'][Math.floor(Math.random() * 3)],
      details: `Changed product ${Math.floor(Math.random() * 100)} details`
    }))
  });

  // Helper to format date and time
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Format entity type for display
  const formatEntityType = (type: string) => {
    if (type === 'attribute_value') return 'Attribute';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get action badge color
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge variant="success">Created</Badge>;
      case 'update':
        return <Badge variant="outline">Updated</Badge>;
      case 'delete':
        return <Badge variant="destructive">Deleted</Badge>;
      case 'attribute_update':
        return <Badge variant="outline">Attribute Updated</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  // Pagination settings
  const itemsPerPage = 10;
  const totalPages = data ? Math.ceil(data.length / itemsPerPage) : 0;
  
  // Get current page of data
  const currentItems = data 
    ? data.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-lg font-medium">Change History / Audit Log</h2>
        <DatePickerWithRange 
          date={dateRange} 
          setDate={setDateRange} 
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 border rounded">
          Error loading change history data. Please try again later.
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>
              {dateRange.from && dateRange.to 
                ? `Changes from ${format(dateRange.from, 'PP')} to ${format(dateRange.to, 'PP')}`
                : 'Recent changes to products and attributes'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.length > 0 ? currentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(item.date)}</TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>
                      {formatEntityType(item.entity_type)} #{item.entity_id}
                    </TableCell>
                    <TableCell>{getActionBadge(item.action)}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.details}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No change history records found for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      const pageNum = page <= 3 
                        ? i + 1 
                        : page >= totalPages - 2 
                          ? totalPages - 4 + i
                          : page - 2 + i;
                          
                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink 
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChangeHistoryReport; 