import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Locale } from '@/services/localeService'
import localeService from '@/services/localeService'
import { Channel } from '@/services/channelService'
import channelService from '@/services/channelService'
import { paths } from '@/lib/apiPaths'

interface OrgSettings {
  id: number
  name: string
  default_locale: string
  default_locale_ref?: Locale
  default_channel: Channel | null
}

export function useOrgSettings() {
  const { user } = useAuth()
  const orgId = user?.organization_id

  // Query organization settings
  const {
    data: orgSettings,
    isLoading: isOrgLoading,
    error: orgError,
    refetch: refetchOrgSettings
  } = useQuery<OrgSettings>({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization ID available')
      const response = await api.get(`/organizations/${orgId}/`)
      return response.data
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Query available locales
  const {
    data: locales = [],
    isLoading: isLocalesLoading,
    error: localesError,
    refetch: refetchLocales
  } = useQuery<Locale[]>({
    queryKey: ['locales'],
    queryFn: localeService.getLocales,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!orgId
  })

  // Query available channels
  const {
    data: channelsRaw = [],
    isLoading: isChannelsLoading,
    error: channelsError,
    refetch: refetchChannels
  } = useQuery<Channel[]>({
    queryKey: ['channels'],
    queryFn: channelService.getChannels,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!orgId
  })

  // Ensure channels have consistent properties
  const channels = channelsRaw.map(channel => ({
    ...channel,
    // Use name as label if label is missing, or code as label if both are missing
    label: channel.label || channel.name || channel.code
  }))

  // Find default locale object from the locales list
  const defaultLocaleObj = locales.find(locale => locale.code === orgSettings?.default_locale) || null

  // Find default channel object
  const defaultChannelObj = channels.find(channel => channel.id === orgSettings?.default_channel?.id) || null

  return {
    orgSettings,
    defaultLocale: orgSettings?.default_locale || 'en_US',
    defaultLocaleObj,
    locales,
    channels,
    defaultChannel: orgSettings?.default_channel || defaultChannelObj || null,
    defaultChannelId: orgSettings?.default_channel?.id || null,
    isLoading: isOrgLoading || isLocalesLoading || isChannelsLoading,
    isChannelsLoading,
    error: orgError || localesError || channelsError,
    refetch: () => {
      refetchOrgSettings()
      refetchLocales()
      refetchChannels()
    }
  }
} 