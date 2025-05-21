import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import organizationService, { Organization } from '@/services/organizationService'

/**
 * Hook for accessing organization data including default locale and channel settings
 */
export function useOrganization() {
  const { data: org, isLoading, error, refetch } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: organizationService.getOrganization,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  })

  // Use these to safely access organization defaults with fallbacks
  const defaultLocale = org?.default_locale || ''
  const defaultChannel = org?.default_channel?.code || ''

  return {
    organization: org,
    isLoading,
    error,
    refetch,
    defaultLocale,
    defaultChannel,
    defaultChannelId: org?.default_channel?.id
  }
}

export default useOrganization 