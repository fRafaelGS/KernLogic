import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Globe, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LocaleChannelSelectorProps {
  selectedLocale: string;
  selectedChannel: string;
  availableLocales: { code: string; label: string }[];
  availableChannels: { code: string; label: string }[];
  onLocaleChange: (locale: string) => void;
  onChannelChange: (channel: string) => void;
}

/**
 * Component for selecting locale and channel in the attributes tab
 */
const LocaleChannelSelector: React.FC<LocaleChannelSelectorProps> = ({
  selectedLocale,
  selectedChannel,
  availableLocales,
  availableChannels,
  onLocaleChange,
  onChannelChange
}) => {
  // Find the current locale and channel labels
  const localeLabel = availableLocales.find(l => l.code === selectedLocale)?.label || selectedLocale;
  const channelLabel = availableChannels.find(c => c.code === selectedChannel)?.label || selectedChannel;
  
  return (
    <div className="flex items-center space-x-4 border p-3 rounded-md bg-slate-50">
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs bg-blue-50 px-2">
          <Globe className="w-3.5 h-3.5 mr-1.5" />
          Locale
        </Badge>
        <Select value={selectedLocale} onValueChange={onLocaleChange}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Select locale">{localeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableLocales.map((locale) => (
              <SelectItem key={locale.code} value={locale.code}>
                {locale.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs bg-purple-50 px-2">
          <Monitor className="w-3.5 h-3.5 mr-1.5" />
          Channel
        </Badge>
        <Select value={selectedChannel} onValueChange={onChannelChange}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Select channel">{channelLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableChannels.map((channel) => (
              <SelectItem key={channel.code} value={channel.code}>
                {channel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default React.memo(LocaleChannelSelector); 