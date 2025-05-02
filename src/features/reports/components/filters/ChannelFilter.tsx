import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ChannelFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

interface Channel {
  code: string;
  description: string;
}

const ChannelFilter: React.FC<ChannelFilterProps> = ({ value, onChange }) => {
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => axiosInstance.get<Channel[]>('/api/analytics/channels/').then(res => res.data),
    // Fallback mock data when the API is not available yet
    placeholderData: [
      { code: 'website', description: 'Website' },
      { code: 'amazon', description: 'Amazon' },
      { code: 'shopify', description: 'Shopify' },
      { code: 'ebay', description: 'eBay' },
      { code: 'walmart', description: 'Walmart' },
    ]
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="channel-filter" className="text-sm font-medium">
        Channel
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="channel-filter" className="w-[200px]">
          <SelectValue placeholder="All Channels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          {channels?.map((channel) => (
            <SelectItem key={channel.code} value={channel.code}>
              {channel.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChannelFilter; 