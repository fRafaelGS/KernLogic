import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFamilies, useDeleteFamily } from '@/domains/families/services/familyApi'
import { Family } from '@/domains/families/types/family'
import { Button } from '@/domains/core/components/ui/button'
import { Input } from '@/domains/core/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/domains/core/components/ui/table'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/domains/core/components/ui/alert-dialog'
import { Badge } from '@/domains/core/components/ui/badge'
import { Skeleton } from '@/domains/core/components/ui/skeleton'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  SearchIcon 
} from 'lucide-react'
import { formatDate } from '@/domains/core/utils/date'
import ErrorBoundary from '@/domains/core/components/ErrorBoundary'
import { config } from '@/config/config'

interface FamilyListPageProps {
  isEmbedded?: boolean;
}

export function FamilyListPage({ isEmbedded = false }: FamilyListPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  
  const { data: families, isLoading, isError, error } = useFamilies()
  const deleteFamily = useDeleteFamily()
  
  // Use configuration for pagination
  const PAGE_SIZE = config.settings.display.families.pagination.pageSize
  
  // Filter families based on search term
  const filteredFamilies = useMemo(() => {
    if (!families) return []
    
    if (!search) return families
    
    const searchLower = search.toLowerCase()
    return families.filter(family => 
      family.code.toLowerCase().includes(searchLower) || 
      family.label.toLowerCase().includes(searchLower)
    )
  }, [families, search])
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredFamilies.length / PAGE_SIZE)
  const paginatedFamilies = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    return filteredFamilies.slice(start, end)
  }, [filteredFamilies, page, PAGE_SIZE])
  
  // Handle delete
  const handleDelete = async () => {
    if (!selectedFamily) return
    
    try {
      await deleteFamily.mutateAsync(selectedFamily.id)
      setSelectedFamily(null)
    } catch (err) {
      console.error('Failed to delete family:', err)
    }
  }
  
  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }
  
  // Navigate to previous/next page
  const goToPrevPage = () => setPage(p => Math.max(1, p - 1))
  const goToNextPage = () => setPage(p => Math.min(totalPages, p + 1))
  
  if (isError) {
    return (
      <div className="p-6 bg-red-50 rounded-md border border-red-200">
        <h2 className="text-lg font-medium text-red-800 mb-2">
          {config.settings.display.families.messages.error}
        </h2>
        <p className="text-red-700">
          {error instanceof Error ? error.message : config.settings.display.families.messages.unknownError}
        </p>
      </div>
    )
  }

  // Get column configuration
  const columns = config.settings.display.families.table.columns

  const content = (
    <>
      <div className="flex justify-between items-center">
        {!isEmbedded && <h1 className="text-2xl font-bold">{isEmbedded ? config.settings.display.families.title : t('families.title')}</h1>}
        <Button onClick={() => navigate('/app/products/families/new')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {config.settings.display.families.actions.create}
        </Button>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <div className="relative w-64">
          <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-enterprise-400" />
          <Input
            placeholder={config.settings.display.families.table.searchPlaceholder}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {!isLoading && (
          <div className="text-sm text-enterprise-500">
            {totalPages > 0 ? (
              `${config.settings.display.families.table.paginationPrefix} ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredFamilies.length)} ${config.settings.display.families.table.paginationOf} ${filteredFamilies.length}`
            ) : (
              config.settings.display.families.table.emptyState.noResults
            )}
          </div>
        )}
      </div>
      
      <div className={isEmbedded ? "" : "border rounded-md mt-4"}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : ''}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: config.settings.display.families.pagination.skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : paginatedFamilies.length > 0 ? (
              paginatedFamilies.map(family => (
                <TableRow key={family.id}>
                  <TableCell className="font-medium">{family.code}</TableCell>
                  <TableCell>{family.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {family.attribute_groups?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>{family.created_at ? formatDate(family.created_at) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/products/families/${family.id}`)}
                      >
                        <EyeIcon className="h-4 w-4" />
                        <span className="sr-only">{config.settings.display.families.actions.view}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/products/families/${family.id}/edit`)}
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">{config.settings.display.families.actions.edit}</span>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => setSelectedFamily(family)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">{config.settings.display.families.actions.delete}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{config.settings.display.families.actions.delete}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {config.settings.display.families.messages.deleteConfirm.replace('{{code}}', family.code || '')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{config.settings.display.families.messages.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={handleDelete}
                            >
                              {config.settings.display.families.actions.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-enterprise-400">
                  {search 
                    ? config.settings.display.families.table.emptyState.noResults
                    : config.settings.display.families.table.emptyState.noData}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={page === 1}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="ml-1">{config.settings.display.families.table.previousButton}</span>
          </Button>
          <div className="text-sm text-enterprise-500">
            {config.settings.display.families.table.pageText} {page} {config.settings.display.families.table.paginationOf} {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={page === totalPages}
          >
            <span className="mr-1">{config.settings.display.families.table.nextButton}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )

  // If embedded, return content directly
  if (isEmbedded) {
    return content
  }

  // Otherwise wrap with the standard container
  return (
    <ErrorBoundary>
      <div className="space-y-6 py-4">
        {content}
      </div>
    </ErrorBoundary>
  )
} 