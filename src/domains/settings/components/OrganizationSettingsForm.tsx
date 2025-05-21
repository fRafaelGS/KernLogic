import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/domains/core/components/ui/button'
import { Input } from '@/domains/core/components/ui/input'
import { Label } from '@/domains/core/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/domains/core/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/domains/core/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/domains/app/providers/AuthContext'
import { useOrgSettings } from '@/domains/organization/hooks/useOrgSettings'
import api from '@/services/api'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/domains/core/components/ui/dialog'
import channelService from '@/services/channelService'
import { AddLocaleModal } from '@/domains/settings/components/AddLocaleModal'
import { config } from '@/config/config'

const orgSettingsSchema = z.object({
  name: z.string().min(1, { message: 'Organization name is required' }),
  default_locale: z.string().min(1, { message: 'Default locale is required' }),
  default_channel: z.string().optional()
})

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>

export function OrganizationSettingsForm() {
  const { user } = useAuth()
  const orgId = user?.organization_id
  const { orgSettings, isLoading, error, refetch, locales, channels, isChannelsLoading } = useOrgSettings()
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
      // Find the locale object by code
      const selectedLocaleObj = locales.find(l => l.code === data.default_locale)
      // Convert channel ID to number if provided and not 'none'
      const payload: any = {
        name: data.name,
        default_locale: selectedLocaleObj ? selectedLocaleObj.code : '',
      }
      if (data.default_channel && data.default_channel !== 'none') {
        payload.default_channel_id = parseInt(data.default_channel)
      } else {
        payload.default_channel_id = null
      }
      const response = await api.patch(`/api/organizations/${orgId}/`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success(config.settings.display.organization.successMessage)
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
      refetch()
    },
    onError: (error) => {
      console.error('Failed to update organization settings:', error)
      toast.error(config.settings.errors.loadOrganization)
    }
  })

  function onSubmit(data: OrgSettingsFormValues) {
    updateOrgSettings(data)
  }

  // Modal state
  const [isLocaleModalOpen, setLocaleModalOpen] = React.useState(false)
  const [isChannelModalOpen, setChannelModalOpen] = React.useState(false)
  const [localeLoading, setLocaleLoading] = React.useState(false)
  const [channelLoading, setChannelLoading] = React.useState(false)
  const [localeError, setLocaleError] = React.useState<string | null>(null)
  const [channelError, setChannelError] = React.useState<string | null>(null)

  // Channel modal form state
  const channelForm = useForm<{ code: string, name: string, description: string }>({
    defaultValues: { code: '', name: '', description: '' }
  })

  if (isLoading || isChannelsLoading) {
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
            {config.settings.errors.loadOrganization}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.settings.display.organization.title}</CardTitle>
        <CardDescription>
          {config.settings.display.organization.description}
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
                  <FormLabel>{config.settings.display.organization.nameLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Default Locale Dropdown + Add New */}
            <FormField
              control={form.control}
              name="default_locale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{config.settings.display.organization.defaultLocaleLabel}</FormLabel>
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
                      {locales.map((locale) => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setLocaleModalOpen(true)}>
                      {config.settings.display.organization.addNewButton}
                    </Button>
                  </div>
                  <FormDescription>
                    {config.settings.display.organization.localeDescription}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Default Channel Dropdown + Add New */}
            <FormField
              control={form.control}
              name="default_channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{config.settings.display.organization.defaultChannelLabel}</FormLabel>
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
                      {channels && channels.length > 0 && channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id.toString()}>
                          {channel.name || channel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setChannelModalOpen(true)}>
                      {config.settings.display.organization.addNewButton}
                    </Button>
                  </div>
                  <FormDescription>
                    {config.settings.display.organization.channelDescription}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? config.settings.display.organization.savingLabel : config.settings.display.organization.updateButton}
            </Button>
          </CardFooter>
        </form>
      </Form>
      {/* AddLocaleModal integration */}
      <AddLocaleModal
        open={isLocaleModalOpen}
        onClose={() => setLocaleModalOpen(false)}
        onSuccess={locale => {
          refetch()
          form.setValue('default_locale', locale.code)
        }}
        existingLocales={locales.map(l => l.code)}
      />
      {/* Channel Modal */}
      <Dialog open={isChannelModalOpen} onOpenChange={setChannelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.settings.display.addChannelModal.title}</DialogTitle>
            <DialogDescription>{config.settings.display.addChannelModal.description}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={channelForm.handleSubmit(async (data) => {
              setChannelLoading(true)
              setChannelError(null)
              try {
                const newChannel = await channelService.createChannel(data.code, data.name)
                await refetch()
                // Find the new channel by code or name (API returns id)
                const created = channels.find(c => c.code === newChannel.code) || newChannel
                form.setValue('default_channel', created.id.toString())
                setChannelModalOpen(false)
                channelForm.reset()
              } catch (err: any) {
                setChannelError(err?.response?.data?.detail || config.settings.errors.channelCreate)
              } finally {
                setChannelLoading(false)
              }
            })}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="channel-code">{config.settings.display.addChannelModal.codeLabel}</Label>
              <Input id="channel-code" {...channelForm.register('code', { required: true })} disabled={channelLoading} />
              {channelForm.formState.errors.code && (
                <span className="text-destructive text-xs">Code is required</span>
              )}
            </div>
            <div>
              <Label htmlFor="channel-name">{config.settings.display.addChannelModal.nameLabel}</Label>
              <Input id="channel-name" {...channelForm.register('name', { required: true })} disabled={channelLoading} />
              {channelForm.formState.errors.name && (
                <span className="text-destructive text-xs">Name is required</span>
              )}
            </div>
            <div>
              <Label htmlFor="channel-description">{config.settings.display.addChannelModal.descriptionLabel}</Label>
              <Input id="channel-description" {...channelForm.register('description')} disabled={channelLoading} />
            </div>
            {channelError && <div className="text-destructive text-xs">{channelError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChannelModalOpen(false)} disabled={channelLoading}>
                {config.settings.display.addChannelModal.cancelButton}
              </Button>
              <Button type="submit" disabled={channelLoading}>
                {channelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {channelLoading ? config.settings.display.addChannelModal.savingLabel : config.settings.display.addChannelModal.addButton}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 