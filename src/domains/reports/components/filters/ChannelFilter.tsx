import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/domains/core/components/ui/select';
import { Skeleton } from '@/domains/core/components/ui/skeleton';
import channelService, { Channel } from '@/domains/organization/services/channelService';

interface ChannelFilterProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const ChannelFilter: React.FC<ChannelFilterProps> = ({ value, onChange }) => {
  const { data: channels, isLoading, error } = useQuery<Channel[]>({
    queryKey: ['channels', 'analytics'],
    queryFn: channelService.getChannels,
  });

  // Map of channel codes to their descriptions for display purposes
  const channelNameMap = React.useMemo(() => {
    if (!channels) return {};
    
    return channels.reduce((acc: Record<string, string>, channel: Channel) => {
      acc[channel.code] = channel.name || channel.label || channel.description || channel.code;
      return acc;
    }, {} as Record<string, string>);
  }, [channels]);

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (error) {
    console.error('Error loading channels:', error);
  }

  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor="channel-filter" className="text-sm font-medium">
        Channel
      </label>
      <Select value={value ?? 'all'} onValueChange={onChange}>
        <SelectTrigger id="channel-filter" className="w-[200px]">
          <SelectValue placeholder="All Channels">
            {value && value !== 'all' ? channelNameMap[value] || 'All Channels' : 'All Channels'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          {channels && channels.length > 0 ? (
            channels.map((channel: Channel) => (
              <SelectItem key={channel.code} value={channel.code}>
                {channel.name || channel.label || channel.description || channel.code}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-channels" disabled>
              No channels available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChannelFilter; 