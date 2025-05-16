import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { useRequiredAttributes, startAutoEnrich, startAttributeEnrich, RequiredAttribute } from '@/hooks/useRequiredAttributes'
import {
  Search,
  ArrowUpDown,
  RefreshCcw,
  Wand2,
  Filter,
  ExternalLink
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell
} from 'recharts'

// Mini sparkline component for the table
function MiniSparkline({ value }: { value: number }) {
  // Simulated historical data - in a real app this would come from the API
  const data = [
    { value: Math.max(0, value - 15 - Math.random() * 10) },
    { value: Math.max(0, value - 10 - Math.random() * 8) },
    { value: Math.max(0, value - 5 - Math.random() * 5) },
    { value: value }
  ]

  return (
    <div className="w-16 h-6">
      <BarChart width={60} height={20} data={data}>
        <Bar dataKey="value" fill="#2563eb">
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={index === data.length - 1 ? '#2563eb' : '#93c5fd'} 
            />
          ))}
        </Bar>
      </BarChart>
    </div>
  )
}

export function RequiredAttributesCard() {
  const navigate = useNavigate()
  const { 
    data: attributes, 
    isLoading, 
    isError, 
    refetch, 
    isFetching 
  } = useRequiredAttributes()

  // State for filtering, sorting and pagination
  const [search, setSearch] = useState('')
  const [highPriorityOnly, setHighPriorityOnly] = useState(false)
  const [lowCompletionOnly, setLowCompletionOnly] = useState(false)
  const [sortColumn, setSortColumn] = useState<keyof RequiredAttribute>('missingCount')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Handle auto-enrich for all attributes
  const handleAutoEnrich = async () => {
    try {
      const result = await startAutoEnrich()
      toast({
        title: 'Auto-enrichment started',
        description: result.message,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to start auto-enrichment',
        description: 'An error occurred while trying to start the auto-enrichment process.'
      })
    }
  }

  // Handle auto-enrich for a specific attribute
  const handleAttributeEnrich = async (attributeName: string) => {
    try {
      const result = await startAttributeEnrich(attributeName)
      toast({
        title: 'Attribute enrichment started',
        description: result.message,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to enrich attribute',
        description: `An error occurred while trying to enrich ${attributeName}.`
      })
    }
  }

  // Navigate to filtered products view
  const handleViewMissing = (attributeName: string) => {
    navigate(`/products?attribute=${attributeName}&missing=true`)
  }

  // Handle error state with a toast notification and retry button
  React.useEffect(() => {
    if (isError) {
      toast({
        variant: 'destructive',
        title: 'Failed to load required attributes',
        description: 'Could not fetch required attributes data. Please try again.'
      })
    }
  }, [isError])

  // Handle sorting logic
  const handleSort = (column: keyof RequiredAttribute) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc') // Default to descending for new column
    }
  }

  // Filter, sort and paginate attributes
  const filteredAttributes = useMemo(() => {
    if (!attributes) return []
    
    return attributes
      .filter(attr => {
        // Apply search filter
        if (search && !attr.name.toLowerCase().includes(search.toLowerCase())) {
          return false
        }
        
        // Apply high priority filter
        if (highPriorityOnly && attr.priority !== 'High') {
          return false
        }
        
        // Apply low completion filter
        if (lowCompletionOnly && attr.completePercent >= 50) {
          return false
        }
        
        return true
      })
      .sort((a, b) => {
        // Handle sorting
        if (sortColumn === 'name') {
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        }
        
        // For numeric columns
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]
        
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      })
  }, [attributes, search, highPriorityOnly, lowCompletionOnly, sortColumn, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(filteredAttributes.length / itemsPerPage)
  const paginatedAttributes = filteredAttributes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Render mobile view with accordion
  if (isMobile) {
    return (
      <Card>
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base uppercase tracking-wider">Required Attributes</CardTitle>
          
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button 
              size="sm" 
              onClick={() => navigate('/products?filter=missing-required')}
            >
              Bulk Edit Missing
            </Button>
            <Button
              size="sm"
              onClick={handleAutoEnrich}
              className="bg-primary/90 hover:bg-primary"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Auto-Enrich
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter attributes..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <Select
                value={highPriorityOnly ? "high" : "all"}
                onValueChange={(value) => setHighPriorityOnly(value === "high")}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {isLoading || isFetching ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded border p-3">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3 mb-1" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-destructive mb-2">Failed to load required attributes</p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => refetch()}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : filteredAttributes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No required attributes found
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAttributes.map((attr) => (
                  <details key={attr.name} className="rounded border p-3">
                    <summary className="flex items-center justify-between cursor-pointer">
                      <span className="font-medium">{attr.name}</span>
                      <Badge className={
                        attr.priority === 'High' ? 'bg-red-500' :
                        attr.priority === 'Medium' ? 'bg-amber-500' :
                        'bg-green-500'
                      }>
                        {attr.priority}
                      </Badge>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Missing: {attr.missingCount}</span>
                        <span>{attr.completePercent}% Complete</span>
                      </div>
                      <Progress value={attr.completePercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {attr.lastUpdated ? (
                          <span>Updated: {format(new Date(attr.lastUpdated), 'MMM d, yyyy')}</span>
                        ) : (
                          <span>Never updated</span>
                        )}
                      </div>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleViewMissing(attr.name)}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View Missing
                        </Button>
                        {attr.impactScore >= 8 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => handleAttributeEnrich(attr.name)}
                          >
                            <Wand2 className="mr-1 h-3 w-3" />
                            Auto-Fill
                          </Button>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
            
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="py-1 px-3 border rounded">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Desktop table view
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base uppercase tracking-wider">Required Attributes</CardTitle>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            onClick={() => navigate('/products?filter=missing-required')}
          >
            Bulk Edit Missing
          </Button>
          <Button
            size="sm"
            onClick={handleAutoEnrich}
            className="bg-primary/90 hover:bg-primary"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Auto-Enrich Suggestions
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center mb-4 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter attributes..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={highPriorityOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setHighPriorityOnly(!highPriorityOnly)}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-1" />
              High Priority
            </Button>
            
            <Button
              variant={lowCompletionOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() => setLowCompletionOnly(!lowCompletionOnly)}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-1" />
              Low Completion (&lt;50%)
            </Button>
          </div>
        </div>
        
        {isLoading || isFetching ? (
          <div className="space-y-3">
            <div className="flex items-center bg-muted/50 p-2 rounded-md">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/5 ml-12" />
              <Skeleton className="h-4 w-1/5 ml-14" />
              <Skeleton className="h-4 w-1/5 ml-16" />
              <Skeleton className="h-4 w-1/10 ml-auto" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="flex items-center p-2 rounded-md" key={i}>
                <Skeleton className="h-4 w-1/5" />
                <Skeleton className="h-4 w-1/10 ml-12" />
                <Skeleton className="h-4 w-1/4 ml-14" />
                <Skeleton className="h-4 w-1/5 ml-16" />
                <Skeleton className="h-8 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">Failed to load required attributes</p>
            <Button 
              variant="destructive" 
              onClick={() => refetch()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : filteredAttributes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No required attributes found matching your filters
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {sortColumn === 'name' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer w-24 text-right"
                      onClick={() => handleSort('missingCount')}
                    >
                      <div className="flex items-center justify-end">
                        Missing
                        {sortColumn === 'missingCount' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('completePercent')}
                    >
                      <div className="flex items-center">
                        % Complete
                        {sortColumn === 'completePercent' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('lastUpdated')}
                    >
                      <div className="flex items-center">
                        Last Updated
                        {sortColumn === 'lastUpdated' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center">
                        Priority
                        {sortColumn === 'priority' && (
                          <ArrowUpDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttributes.map((attr) => (
                    <TableRow key={attr.name}>
                      <TableCell className="font-medium">{attr.name}</TableCell>
                      <TableCell className="text-right">{attr.missingCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full max-w-[100px]">
                            <Progress value={attr.completePercent} className="h-2" />
                          </div>
                          <span className="text-sm">{attr.completePercent}%</span>
                          <MiniSparkline value={attr.completePercent} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {attr.lastUpdated 
                          ? format(new Date(attr.lastUpdated), 'MMM d, yyyy')
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          attr.priority === 'High' ? 'bg-red-500' :
                          attr.priority === 'Medium' ? 'bg-amber-500' :
                          'bg-green-500'
                        }>
                          {attr.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMissing(attr.name)}
                          >
                            View Missing
                          </Button>
                          
                          {attr.impactScore >= 8 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAttributeEnrich(attr.name)}
                            >
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    // Show first page, last page, current page, and pages around current
                    const pageNum = i + 1
                    const showPage = pageNum === 1 || 
                                    pageNum === totalPages || 
                                    Math.abs(pageNum - currentPage) <= 1
                    
                    if (!showPage) {
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={i} className="px-2">...</span>
                      }
                      return null
                    }
                    
                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0 mx-1"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Example usage in a dashboard layout
// import { RequiredAttributesCard } from '@/components/dashboard/RequiredAttributesCard'
// 
// export function DashboardPage() {
//   return (
//     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//       <div className="col-span-2">
//         <RequiredAttributesCard />
//       </div>
//       {/* Other dashboard cards */}
//     </div>
//   )
// } 