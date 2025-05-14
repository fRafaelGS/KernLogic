import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFamilies, useDeleteFamily } from '@/api/familyApi'
import { Family } from '@/types/family'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  SearchIcon 
} from 'lucide-react'
import { formatDate } from '@/utils/date'
import ErrorBoundary from '@/components/ErrorBoundary'

export function FamilyListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  
  const { data: families, isLoading, isError, error } = useFamilies()
  const deleteFamily = useDeleteFamily()
  
  const PAGE_SIZE = 25
  
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
          {t('common.error')}
        </h2>
        <p className="text-red-700">
          {error instanceof Error ? error.message : t('common.unknownError')}
        </p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('settings.families.title')}</h1>
          <Button onClick={() => navigate('/app/settings/families/new')}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('settings.families.create')}
          </Button>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="relative w-64">
            <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-enterprise-400" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {!isLoading && (
            <div className="text-sm text-enterprise-500">
              {totalPages > 0 ? (
                t('pagination.showing', {
                  start: (page - 1) * PAGE_SIZE + 1,
                  end: Math.min(page * PAGE_SIZE, filteredFamilies.length),
                  total: filteredFamilies.length
                })
              ) : (
                t('pagination.noResults')
              )}
            </div>
          )}
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.families.form.code')}</TableHead>
                <TableHead>{t('settings.families.form.label')}</TableHead>
                <TableHead>{t('settings.families.form.attributeGroups')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                    <TableCell>{formatDate(family.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/settings/families/${family.id}`)}
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="sr-only">{t('common.view')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/settings/families/${family.id}/edit`)}
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span className="sr-only">{t('common.edit')}</span>
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
                              <span className="sr-only">{t('common.delete')}</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('settings.families.messages.deleteConfirm', { code: family.code })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={handleDelete}
                              >
                                {t('common.delete')}
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
                      ? t('common.noSearchResults')
                      : t('settings.families.noFamilies')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={page === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="ml-1">{t('pagination.prev')}</span>
            </Button>
            <div className="text-sm text-enterprise-500">
              {t('pagination.page', { page, total: totalPages })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={page === totalPages}
            >
              <span className="mr-1">{t('pagination.next')}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
} 