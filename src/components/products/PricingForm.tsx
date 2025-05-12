import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { usePriceMetadata } from '@/hooks/usePriceMetadata'
import { useToast } from '@/components/ui/use-toast'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PriceType, SalesChannel, Currency } from './usePricingData'
import priceService from '@/services/priceService'

const priceFormSchema = z.object({
  priceType: z.string().min(1, { message: 'Price type is required' }),
  channel: z.string().min(1, { message: 'Channel is required' }),
  currencyCode: z.string().min(1, { message: 'Currency is required' }),
  value: z.coerce
    .number()
    .min(0, { message: 'Price must be a positive number' }),
})

export type PriceFormValues = z.infer<typeof priceFormSchema>

interface PricingFormProps {
  productId: number
  initialData?: {
    id?: number
    priceType: string
    channel: string
    currencyCode: string
    value: number
  }
  onSuccess: () => void
  onAdd?: (values: PriceFormValues) => Promise<boolean>
  onUpdate?: (id: number, values: PriceFormValues) => Promise<boolean>
}

export function PricingForm({
  productId,
  initialData,
  onSuccess,
  onAdd,
  onUpdate
}: PricingFormProps) {
  const { toast } = useToast()
  const metadataHook = usePriceMetadata()
  
  // Adapt metadata to our expected shape
  const priceTypes: PriceType[] = metadataHook.priceTypes?.map((pt: any) => ({
    id: pt.id || pt.value || `pricetype-${Math.random()}`,
    name: pt.name || pt.label || 'Unnamed Type',
  })) || []
  
  const channels: SalesChannel[] = metadataHook.channels?.map((ch: any) => ({
    id: ch.id || ch.value || `channel-${Math.random()}`,
    name: ch.name || ch.label || 'Unnamed Channel',
  })) || []
  
  const currencies: Currency[] = metadataHook.currencies?.map((cur: any) => ({
    id: cur.id || cur.value || cur.code || `currency-${Math.random()}`,
    code: cur.code || cur.value || `CUR${Math.floor(Math.random() * 1000)}`,
    name: cur.name || cur.label || 'Unnamed Currency',
    symbol: cur.symbol || '$',
  })) || []
  
  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: initialData || {
      priceType: '',
      channel: '',
      currencyCode: '',
      value: 0,
    },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(values: PriceFormValues) {
    try {
      if (initialData?.id) {
        if (onUpdate) {
          await onUpdate(initialData.id, values)
        } else {
          await priceService.updatePrice(productId, initialData.id, values)
        }
        toast({ title: 'Price updated successfully' })
      } else {
        if (onAdd) {
          await onAdd(values)
        } else {
          await priceService.createPrice(productId, values)
        }
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="priceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price Type</FormLabel>
              <Select
                disabled={isSubmitting}
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select price type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel</FormLabel>
              <Select
                disabled={isSubmitting}
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                disabled={isSubmitting}
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.code || currency.id}>
                      {currency.code || currency.id} ({currency.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData?.id ? 'Update Price' : 'Add Price'}
        </Button>
      </form>
    </Form>
  )
} 