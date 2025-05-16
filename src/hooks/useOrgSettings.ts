import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Locale } from '@/services/localeService'
import localeService from '@/services/localeService'
import { paths } from '@/lib/apiPaths'

interface Channel {
  id: number
  code: string
  name: string
}

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

  // Find default locale object from the locales list
  const defaultLocaleObj = locales.find(locale => locale.code === orgSettings?.default_locale) || null

  return {
    orgSettings,
    defaultLocale: orgSettings?.default_locale || 'en_US',
    defaultLocaleObj,
    locales,
    defaultChannel: orgSettings?.default_channel || null,
    defaultChannelId: orgSettings?.default_channel?.id || null,
    isLoading: isOrgLoading || isLocalesLoading,
    error: orgError || localesError,
    refetch: () => {
      refetchOrgSettings()
      refetchLocales()
    }
  }
} 