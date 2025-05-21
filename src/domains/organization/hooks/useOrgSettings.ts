import { useAuth } from '@/domains/app/providers/AuthContext'
import { useQuery } from '@tanstack/react-query'
import axiosInstance from '@/domains/core/lib/axiosInstance'
import { toast } from 'sonner'
import { Organization } from '@/domains/organization/services/organizationService'
import { Locale } from '@/domains/organization/services/localeService'
import localeService from '@/domains/organization/services/localeService'
import { Channel } from '@/domains/organization/services/channelService'
import channelService from '@/domains/organization/services/channelService'
import { API_PATHS } from '@/config/config'
import useOrganization from '@/domains/organization/hooks/useOrganization'

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
  const { organization: orgFromHook, defaultLocale: orgDefaultLocale, defaultChannel: orgDefaultChannelCode } = useOrganization()

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
      const response = await axiosInstance.get(API_PATHS.organizations.byId(Number(orgId)))
      return response.data
    },
    enabled: !!orgId && !orgFromHook, // Only fetch if not already loaded by useOrganization
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

  // Use organization from either source (prefer the one from useOrganization hook)
  const consolidatedOrgSettings = orgFromHook || orgSettings

  // Find default locale object from the locales list
  const defaultLocaleObj = locales.find(locale => locale.code === consolidatedOrgSettings?.default_locale) || null

  // Find default channel object (either from org.default_channel or by code)
  const defaultChannelObj = channels.find(channel => 
    (consolidatedOrgSettings?.default_channel?.id && channel.id === consolidatedOrgSettings.default_channel.id) || 
    (!consolidatedOrgSettings?.default_channel?.id && orgDefaultChannelCode && channel.code === orgDefaultChannelCode)
  ) || null
  
  return {
    orgSettings: consolidatedOrgSettings,
    defaultLocale: consolidatedOrgSettings?.default_locale || orgDefaultLocale || 'en_US',
    defaultLocaleObj,
    locales,
    channels,
    defaultChannel: consolidatedOrgSettings?.default_channel || defaultChannelObj || null,
    defaultChannelId: consolidatedOrgSettings?.default_channel?.id || defaultChannelObj?.id || null,
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