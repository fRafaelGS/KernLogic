import React, { ReactNode, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
  QueryFunctionContext
} from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { useAuth } from '@/contexts/AuthContext';

type QueryKeyStringArray = string[];

/**
 * Factory that returns a default QueryFunction which:
 * 1. Joins the queryKey array into a URL path
 * 2. Injects `organization_id` as a query param if present
 */
const createDefaultQueryFn =
  (organizationId?: string) =>
  async ({ queryKey }: QueryFunctionContext<QueryKeyStringArray>) => {
    // Build URL from key segments:
    // e.g. ['api', 'orgs', '123', 'memberships'] -> '/api/orgs/123/memberships'
    const url = '/' + (queryKey as string[]).join('/');

    // Append org if provided
    const finalUrl = organizationId
      ? url + (url.includes('?') ? '&' : '?') + `organization_id=${organizationId}`
      : url;

    console.log(`[Query] Fetching ${finalUrl} (org=${organizationId || 'none'})`);
    const response = await axiosInstance.get(finalUrl);
    return response.data;
  };

interface QueryClientProviderProps {
  children: ReactNode;
}

/**
 * A wrapper over TanStack's QueryClientProvider that:
 * - Waits for auth to finish before enabling any queries
 * - Rebuilds the QueryClient whenever the org changes
 * - Automatically includes `organization_id` in every request
 */
export const QueryClientProvider: React.FC<QueryClientProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const organizationId = user?.organization_id;

  // Recreate the QueryClient whenever authLoading or organizationId changes
  const queryClient = useMemo(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          // Only enable once auth is done and we have an org
          enabled: !authLoading && Boolean(organizationId),
          retry: 1,
          staleTime: 5 * 60 * 1000,
          queryFn: createDefaultQueryFn(organizationId),
        },
      },
    });
  }, [authLoading, organizationId]);

  // While auth is loading, disable every query to avoid empty-fetch races
  if (authLoading) {
    const loadingClient = new QueryClient({
      defaultOptions: {
        queries: {
          enabled: false,
          retry: false,
        },
      },
    });
    return (
      <TanstackQueryClientProvider client={loadingClient}>
        {children}
      </TanstackQueryClientProvider>
    );
  }

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
};

export default QueryClientProvider;
