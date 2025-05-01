import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Globe, Languages } from 'lucide-react';

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
  return (
    <div className="flex items-center space-x-1">
      <Select value={selectedLocale} onValueChange={onLocaleChange}>
        <SelectTrigger className="w-[140px]">
          <Globe className="w-3.5 h-3.5 mr-2" />
          <SelectValue placeholder="Select locale" />
        </SelectTrigger>
        <SelectContent>
          {availableLocales.map((locale) => (
            <SelectItem key={locale.code} value={locale.code}>
              {locale.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={selectedChannel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[160px]">
          <Languages className="w-3.5 h-3.5 mr-2" />
          <SelectValue placeholder="Select channel" />
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
  );
};

export default React.memo(LocaleChannelSelector); 