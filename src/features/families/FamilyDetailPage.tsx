import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFamily } from '@/api/familyApi'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, PencilIcon, CheckIcon, XIcon } from 'lucide-react'
import { formatDate } from '@/utils/date'
import ErrorBoundary from '@/components/ErrorBoundary'

export function FamilyDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const numericId = id ? parseInt(id, 10) : 0
  const { data: family, isLoading, isError, error } = useFamily(numericId)
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <div className="border rounded-md p-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }
  
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
  
  if (!family) {
    return (
      <div className="p-6 bg-yellow-50 rounded-md border border-yellow-200">
        <h2 className="text-lg font-medium text-yellow-800 mb-2">
          {t('common.notFound')}
        </h2>
        <p className="text-yellow-700">
          {t('settings.families.notFound')}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/app/settings/families')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.backToList')}
        </Button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/settings/families')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <h1 className="text-2xl font-bold">{family.label}</h1>
          </div>
          <Button
            onClick={() => navigate(`/app/settings/families/${family.id}/edit`)}
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium mb-2">{t('settings.families.details')}</h2>
              <div className="bg-enterprise-50 p-4 rounded-md">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium text-enterprise-600">{t('settings.families.form.code')}:</dt>
                    <dd>{family.code}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-enterprise-600">{t('settings.families.form.label')}:</dt>
                    <dd>{family.label}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-enterprise-600">{t('common.createdAt')}:</dt>
                    <dd>{formatDate(family.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-enterprise-600">{t('common.updatedAt')}:</dt>
                    <dd>{formatDate(family.updated_at)}</dd>
                  </div>
                </dl>
              </div>
            </div>
            {family.description && (
              <div>
                <h2 className="text-lg font-medium mb-2">{t('settings.families.form.description')}</h2>
                <div className="bg-enterprise-50 p-4 rounded-md">
                  <p className="whitespace-pre-wrap">{family.description}</p>
                </div>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">
              {t('settings.families.form.attributeGroups')}
            </h2>
            {family.attribute_groups?.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('settings.families.form.group')}</TableHead>
                      <TableHead>{t('settings.families.form.required')}</TableHead>
                      <TableHead>{t('settings.families.form.order')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {family.attribute_groups
                      .sort((a, b) => a.order - b.order)
                      .map(group => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">
                            {group.attribute_group_object?.name || `Group #${group.attribute_group}`}
                          </TableCell>
                          <TableCell>
                            {group.required ? (
                              <CheckIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <XIcon className="h-4 w-4 text-enterprise-400" />
                            )}
                          </TableCell>
                          <TableCell>{group.order}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border rounded-md p-8 text-center text-enterprise-400">
                {t('settings.families.noAttributeGroups')}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}