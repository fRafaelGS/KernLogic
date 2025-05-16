import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgSettings } from '@/hooks/useOrgSettings'
import { usePriceMetadata } from '@/hooks/usePriceMetadata'
import api from '@/services/api'
import { LOCALES } from '@/config/locales'

const orgSettingsSchema = z.object({
  name: z.string().min(1, { message: 'Organization name is required' }),
  default_locale: z.string().min(1, { message: 'Default locale is required' }),
  default_channel: z.string().optional()
})

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>

export function OrganizationSettingsForm() {
  const { user } = useAuth()
  const orgId = user?.organization_id
  const { orgSettings, isLoading, error, refetch } = useOrgSettings()
  const { channels, loading: channelsLoading } = usePriceMetadata()
  const queryClient = useQueryClient()

  const form = useForm<OrgSettingsFormValues>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: orgSettings?.name || '',
      default_locale: orgSettings?.default_locale || 'en_US',
      default_channel: orgSettings?.default_channel?.id?.toString() || 'none'
    }
  })

  // Update form values when orgSettings loads
  React.useEffect(() => {
    if (orgSettings) {
      form.reset({
        name: orgSettings.name,
        default_locale: orgSettings.default_locale,
        default_channel: orgSettings.default_channel?.id?.toString() || 'none'
      })
    }
  }, [orgSettings, form])

  const { mutate: updateOrgSettings, isPending } = useMutation({
    mutationFn: async (data: OrgSettingsFormValues) => {
      if (!orgId) throw new Error('No organization ID available')
      
      // Convert channel ID to number if provided and not 'none'
      const payload = {
        ...data,
        default_channel: data.default_channel && data.default_channel !== 'none' ? parseInt(data.default_channel) : null
      }
      
      const response = await api.patch(`/organizations/${orgId}/`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Organization settings updated successfully')
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
      refetch()
    },
    onError: (error) => {
      console.error('Failed to update organization settings:', error)
      toast.error('Failed to update organization settings')
    }
  })

  function onSubmit(data: OrgSettingsFormValues) {
    updateOrgSettings(data)
  }

  if (isLoading || channelsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-4 text-destructive">
            Error loading organization settings. Please try again later.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Configure your organization-wide settings and defaults
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="default_locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Locale</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default locale" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOCALES.map((locale) => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The default locale will be used when no locale is specified
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="default_channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Sales Channel</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default sales channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id.toString()}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The default channel will be used for prices and other channel-specific data
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 