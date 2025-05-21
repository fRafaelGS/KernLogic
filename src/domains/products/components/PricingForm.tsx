import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { usePriceMetadata } from '@/domains/products/components/hooks/usePriceMetadata'
import { useOrgSettings } from '@/domains/organization/hooks/useOrgSettings'
import { useToast } from '@/domains/core/components/ui/use-toast'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/domains/core/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/domains/core/components/ui/select'
import { Input } from '@/domains/core/components/ui/input'
import { Button } from '@/domains/core/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PriceType, SalesChannel, Currency } from '@/domains/products/components/hooks/usePriceMetadata'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const priceFormSchema = z.object({
  priceType: z.string().min(1, { message: 'Price type is required' }),
  currencyCode: z.string().min(1, { message: 'Currency is required' }),
  value: z.coerce
    .number()
    .min(0, { message: 'Price must be a positive number' }),
  validFrom: z.string().min(1, { message: 'Valid from is required' }),
  validTo: z.string().optional().nullable(),
})

export type PriceFormValues = z.infer<typeof priceFormSchema>

interface PricingFormProps {
  productId: number
  initialData?: {
    id?: number
    priceType: string
    channel?: string | null
    currencyCode: string
    value: number
    validFrom?: string
    validTo?: string | null
  }
  onSuccess: () => void
  onAdd: (values: PriceFormValues) => Promise<any>
  onUpdate: (id: number, values: PriceFormValues) => Promise<any>
}

export function PricingForm({
  productId,
  initialData,
  onSuccess,
  onAdd,
  onUpdate
}: PricingFormProps) {
  const { toast } = useToast()
  const { priceTypes, channels, currencies, loading: metaLoading, error: metaError } = usePriceMetadata()
  const { defaultChannelId } = useOrgSettings()
  const queryClient = useQueryClient()
  
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: initialData || {
      priceType: '',
      currencyCode: '',
      value: 0,
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: '',
    },
  })

  // Reset form when initialData changes (e.g., when editing a new price)
  useEffect(() => {
    if (initialData) {
      const formValues = {
        priceType: initialData.priceType,
        currencyCode: initialData.currencyCode,
        value: initialData.value,
        validFrom: initialData.validFrom || new Date().toISOString().slice(0, 10),
        validTo: initialData.validTo || '',
      }
      form.reset(formValues)
    }
  }, [initialData])

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: PriceFormValues) {
    try {
      // Step 1: Log values on submit
      console.log('Form submitted values:', values)
      console.log('Current initialData:', initialData)
      if (initialData?.id) {
        // Only send changed fields (diff)
        const diff: Record<string, any> = {}
        if (values.priceType !== initialData.priceType) diff.price_type = values.priceType
        if (values.currencyCode !== initialData.currencyCode) diff.currency = values.currencyCode
        if (values.value !== initialData.value) diff.amount = values.value
        if (values.validFrom !== initialData.validFrom) diff.valid_from = values.validFrom
        if (values.validTo !== initialData.validTo) diff.valid_to = values.validTo || null
        if (Object.keys(diff).length === 0) {
          toast({ title: 'No changes to update' })
          return
        }
        console.log('PATCH diff payload:', diff)
        await onUpdate(initialData.id, diff as any)
        await queryClient.invalidateQueries({ queryKey: ['product', productId] })
        await queryClient.refetchQueries({ queryKey: ['product', productId] })
        await queryClient.invalidateQueries({ queryKey: ['prices', productId] })
        toast({ title: 'Price updated successfully' })
      } else {
        // Use the organization's default channel ID
        const priceData = {
          ...values,
          channel_id: defaultChannelId
        }
        await onAdd(priceData as any)
        await queryClient.invalidateQueries({ queryKey: ['product', productId] })
        await queryClient.refetchQueries({ queryKey: ['product', productId] })
        await queryClient.invalidateQueries({ queryKey: ['prices', productId] })
        toast({ title: 'Price created successfully' })
      }
      form.reset()
      onSuccess()
    } catch (error) {
      toast({
        title: 'Failed to save price',
        variant: 'destructive',
      })
    }
  }

  // Show loading indicator if metadata is still loading
  if (metaLoading) {
    return (
      <div className='py-8 flex flex-col items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mb-2' />
        <p className='text-muted-foreground'>Loading price metadata...</p>
      </div>
    )
  }
  if (metaError) {
    return (
      <div className='py-8 flex flex-col items-center justify-center'>
        <p className='text-destructive mb-2'>Error loading price data</p>
        <p className='text-muted-foreground text-sm'>Please try again later</p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="priceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Type</FormLabel>
              <FormControl>
                <Select
                  disabled={isSubmitting}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select price type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(priceTypes) && priceTypes.map((pt: PriceType) => (
                      <SelectItem key={pt.id} value={pt.id.toString()}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="currencyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Select
                  disabled={isSubmitting}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(currencies) && currencies.map((c: Currency) => (
                      <SelectItem key={c.iso_code} value={c.iso_code}>
                        {c.iso_code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Value</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="validFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid From</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="validTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid To (optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  disabled={isSubmitting}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Never expires"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Update Price' : 'Add Price'}
        </Button>
      </form>
    </Form>
  )
} 