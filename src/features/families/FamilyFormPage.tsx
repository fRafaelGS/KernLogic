import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFamily, useCreateFamily, useUpdateFamily, useAddAttributeGroupToFamily, useRemoveAttributeGroupFromFamily } from '@/api/familyApi'
import { useAttributeGroups } from '@/api/attributeGroupApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  PlusIcon,
  Trash2Icon,
  GripVertical,
  SearchIcon,
  AlertTriangle
} from 'lucide-react'
import ErrorBoundary from '@/components/ErrorBoundary'
import { toast } from '@/components/ui/use-toast'

// Form validation schema
const FamilySchema = z.object({
  code: z.string().min(1, { message: 'Code is required' }),
  label: z.string().min(1, { message: 'Label is required' }),
  description: z.string().optional(),
  attributeGroups: z.array(
    z.object({
      id: z.number().optional(),
      attribute_group: z.number(),
      attribute_group_name: z.string().optional(),
      required: z.boolean().default(false),
      order: z.number().int().nonnegative()
    })
  ).min(1, { message: 'At least one attribute group is required' })
})

type FamilyFormValues = z.infer<typeof FamilySchema>

interface FamilyFormPageProps {
  mode: 'create' | 'edit'
}

// Sortable item component for attribute groups
function SortableGroupItem({ 
  id, 
  index, 
  item, 
  availableGroups, 
  onRemove 
}: { 
  id: string
  index: number
  item: any
  availableGroups: any[]
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  
  // Apply transform styles from DnD Kit
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center space-x-3 p-3 border rounded-md bg-white"
    >
      <div 
        className="cursor-grab hover:text-enterprise-800 text-enterprise-400" 
        {...attributes} 
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex flex-1 items-center space-x-4">
        <div className="w-full sm:w-64">
          <Label htmlFor={`attributeGroups.${index}.attribute_group`}>
            {t('families.form.group')}
          </Label>
          <div className="mt-1">
            <span className="block p-2 border border-enterprise-200 rounded-md bg-enterprise-50 text-enterprise-700 text-sm">
              {item.attribute_group_name || 
                availableGroups.find(g => g.id === item.attribute_group)?.name || 
                `Group #${item.attribute_group}`}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center h-full pt-5">
            <Checkbox
              id={`attributeGroups.${index}.required`}
              checked={item.required}
              onCheckedChange={(checked) => item.required = checked === true}
            />
            <Label htmlFor={`attributeGroups.${index}.required`} className="ml-2">
              {t('families.form.required')}
            </Label>
          </div>
        </div>
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2Icon className="h-4 w-4" />
        <span className="sr-only">{t('common.actions.remove')}</span>
      </Button>
    </div>
  )
}

export function FamilyFormPage({ mode }: FamilyFormPageProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const numericId = id ? parseInt(id, 10) : 0
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  
  // Get data from API
  const { data: family, isLoading: isFamilyLoading } = useFamily(numericId)
  const { data: groups, isLoading: isGroupsLoading } = useAttributeGroups()
  const createFamily = useCreateFamily()
  const updateFamily = useUpdateFamily(numericId)
  
  // Form setup
  const form = useForm<FamilyFormValues>({
    resolver: zodResolver(FamilySchema),
    defaultValues: {
      code: '',
      label: '',
      description: '',
      attributeGroups: []
    }
  })
  
  const { 
    control, 
    handleSubmit, 
    formState: { errors, isDirty, isSubmitting }, 
    reset,
    watch,
    getValues
  } = form
  
  // Setup attribute groups field array
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'attributeGroups'
  })
  
  // Load form data when editing
  useEffect(() => {
    if (mode === 'edit' && family) {
      reset({
        code: family.code,
        label: family.label,
        description: family.description || '',
        attributeGroups: family.attribute_groups?.map(group => ({
          id: group.id,
          attribute_group: group.attribute_group,
          attribute_group_name: group.attribute_group_object?.name,
          required: group.required,
          order: group.order
        })) || []
      })
    }
  }, [mode, family, reset])
  
  // DnD setup for sortable groups
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )
  
  // Track current location
  const location = useLocation();
  const prevLocationRef = useRef(location);

  // Handle browser navigation (refresh, close, etc)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle in-app navigation
  useEffect(() => {
    if (prevLocationRef.current !== location && isDirty) {
      // If location changed and there are unsaved changes
      setShowUnsavedDialog(true);
    }
    prevLocationRef.current = location;
  }, [location, isDirty]);

  // Handle form submission
  const onSubmit = async (data: FamilyFormValues) => {
    try {
      // build payload matching Django serializer
      const payload = {
        code: data.code,
        label: data.label,
        description: data.description,
        attribute_groups: data.attributeGroups.map((g) => ({
          attribute_group: g.attribute_group,
          required: g.required,
          order: g.order,
        })),
      }

      if (mode === 'create') {
        await createFamily.mutateAsync(payload)
        toast({
          title: t('families.messages.saveSuccess'),
          variant: 'default'
        })
      } else {
        await updateFamily.mutateAsync(payload)
        toast({
          title: t('families.messages.saveSuccess'),
          variant: 'default'
        })
      }
      navigate(settingsFamiliesUrl)
    } catch (err: any) {
      if (err?.message?.includes('attribute group')) {
        toast({
          title: t('families.messages.attributeGroupRace'),
          description: t('families.messages.attributeGroupRaceDesc'),
          variant: 'destructive'
        })
        // Optionally reload attribute groups
        // refetch attribute groups here if needed
      } else {
        toast({
          title: t('common.messages.error'),
          description: err?.message || t('common.messages.unknownError'),
          variant: 'destructive'
        })
      }
    }
  }
  
  // Filter groups based on search term
  const filteredGroups = groups?.filter(group =>
    group?.name && group.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []
  
  // Get already selected group IDs
  const selectedGroupIds = watch('attributeGroups').map(g => g.attribute_group)
  
  // Get available groups (groups not yet selected)
  const availableGroups = filteredGroups.filter(group => 
    !selectedGroupIds.includes(group.id)
  )
  
  // Check if form is loading
  const isLoading = (mode === 'edit' && isFamilyLoading) || isGroupsLoading
  
  // Add a new attribute group
  const addAttributeGroup = (groupId: number, groupName: string) => {
    append({
      attribute_group: groupId,
      attribute_group_name: groupName,
      required: false,
      order: fields.length
    })
  }

  // Settings page URL with families tab
  const settingsFamiliesUrl = '/app/settings?tab=families';

  // Update the function names to be clearer
  const handleStayOnPage = () => {
    setShowUnsavedDialog(false);
    // Just close the dialog, stay on current page
  };

  const handleDiscardAndNavigate = () => {
    setShowUnsavedDialog(false);
    // Reset the form and allow navigation
    reset();
    // Navigate to the families tab in settings
    navigate(settingsFamiliesUrl);
  };

  // Handle DnD end event
  const handleDragEnd = (event: any) => {
    const { active, over } = event
    
    if (active.id !== over.id) {
      const oldIndex = fields.findIndex(field => `group-${field.id || field.attribute_group}` === active.id)
      const newIndex = fields.findIndex(field => `group-${field.id || field.attribute_group}` === over.id)
      
      move(oldIndex, newIndex)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isDirty) {
                setShowUnsavedDialog(true);
              } else {
                navigate(settingsFamiliesUrl);
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('families.form.back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === 'create' 
              ? t('families.createNew') 
              : t('families.edit', { code: family?.code || '' })}
          </h1>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="space-y-3">
              <div className="h-5 w-32 bg-enterprise-200 rounded" />
              <div className="h-10 w-full bg-enterprise-200 rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-5 w-32 bg-enterprise-200 rounded" />
              <div className="h-10 w-full bg-enterprise-200 rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-5 w-32 bg-enterprise-200 rounded" />
              <div className="h-24 w-full bg-enterprise-200 rounded" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    {t('families.form.code')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        id="code" 
                        {...field} 
                        className={errors.code ? 'border-red-300' : ''}
                      />
                    )}
                  />
                  {errors.code && (
                    <p className="text-sm text-red-500">{errors.code.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="label">
                    {t('families.form.label')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Controller
                    name="label"
                    control={control}
                    render={({ field }) => (
                      <Input 
                        id="label" 
                        {...field} 
                        className={errors.label ? 'border-red-300' : ''}
                      />
                    )}
                  />
                  {errors.label && (
                    <p className="text-sm text-red-500">{errors.label.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t('families.form.description')}
                  </Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea 
                        id="description" 
                        {...field} 
                        rows={4}
                      />
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base">
                    {t('families.form.attributeGroups')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {t('families.form.addGroup')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4">
                      <div className="space-y-4">
                        <h4 className="font-medium">
                          {t('families.form.addGroup')}
                        </h4>
                        
                        <div className="relative">
                          <SearchIcon className="h-4 w-4 absolute left-3 top-3 text-enterprise-400" />
                          <Input
                            placeholder={t('families.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {availableGroups.length > 0 ? (
                            availableGroups.map(group => (
                              <Button
                                key={group.id}
                                type="button"
                                variant="ghost"
                                className="w-full justify-start text-left"
                                onClick={() => addAttributeGroup(group.id, group.name)}
                              >
                                {group.name}
                              </Button>
                            ))
                          ) : (
                            <p className="text-sm text-enterprise-400 p-2">
                              {searchTerm 
                                ? t('common.messages.noSearchResults') 
                                : t('families.noData')}
                            </p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {errors.attributeGroups && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm">{errors.attributeGroups.message}</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={fields.map(field => `group-${field.id || field.attribute_group}`)} 
                      strategy={verticalListSortingStrategy}
                    >
                      {fields.map((field, index) => (
                        <SortableGroupItem
                          key={`group-${field.id || field.attribute_group}`}
                          id={`group-${field.id || field.attribute_group}`}
                          index={index}
                          item={field}
                          availableGroups={groups || []}
                          onRemove={remove}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  
                  {fields.length === 0 && (
                    <div className="border border-dashed border-enterprise-300 rounded-md p-6 text-center">
                      <p className="text-enterprise-500">
                        {t('families.form.noGroups')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleStayOnPage}
              >
                {t('families.form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || form.formState.isSubmitting}
              >
                {t('families.form.save')}
              </Button>
            </div>
          </form>
        )}
      </div>
      
      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.dialogs.unsavedChanges')}</DialogTitle>
            <DialogDescription>
              {t('common.messages.unsavedChangesDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleStayOnPage}
            >
              {t('families.form.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardAndNavigate}
            >
              {t('common.actions.discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  )
} 