import React, { useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Globe, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  saveLastLocale, 
  getLastLocale, 
  saveLastChannel, 
  getLastChannel 
} from '@/lib/attributePreferences';
import { LOCALES, LocaleCode } from '@/config/locales'
import { CHANNELS, ChannelCode } from '@/config/channels'

interface LocaleChannelSelectorProps {
  selectedLocale: string;
  selectedChannel: string;
  onLocaleChange: (locale: string) => void;
  onChannelChange: (channel: string) => void;
  disableLocalePersistence?: boolean;
  disableChannelPersistence?: boolean;
}

/**
 * Component for selecting locale and channel in the attributes tab
 */
const LocaleChannelSelector: React.FC<LocaleChannelSelectorProps> = ({
  selectedLocale,
  selectedChannel,
  onLocaleChange,
  onChannelChange,
  disableLocalePersistence = false,
  disableChannelPersistence = false
}) => {
  // On component mount, check localStorage for saved preferences
  useEffect(() => {
    if (!disableLocalePersistence) {
      const savedLocale = getLastLocale();
      if (savedLocale && savedLocale !== selectedLocale) {
        onLocaleChange(savedLocale);
      }
    }
    
    if (!disableChannelPersistence) {
      const savedChannel = getLastChannel();
      if (savedChannel && savedChannel !== selectedChannel) {
        onChannelChange(savedChannel);
      }
    }
  }, [
    selectedLocale, 
    selectedChannel, 
    onLocaleChange, 
    onChannelChange, 
    disableLocalePersistence, 
    disableChannelPersistence
  ]);
  
  // Save preferences when they change
  const handleLocaleChange = (locale: string) => {
    onLocaleChange(locale);
    if (!disableLocalePersistence) {
      saveLastLocale(locale);
    }
  };
  
  const handleChannelChange = (channel: string) => {
    onChannelChange(channel);
    if (!disableChannelPersistence) {
      saveLastChannel(channel);
    }
  };
  
  // Find the current locale and channel labels
  const localeLabel = LOCALES.find(l => l.code === selectedLocale)?.label || selectedLocale;
  const channelLabel = CHANNELS.find(c => c.code === selectedChannel)?.label || selectedChannel;
  
  return (
    <div className="flex items-center space-x-4 border p-3 rounded-md bg-slate-50">
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs bg-blue-50 px-2">
          <Globe className="w-3.5 h-3.5 mr-1.5" />
          Locale
        </Badge>
        <Select value={selectedLocale} onValueChange={handleLocaleChange}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Select locale">{localeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Locales</SelectLabel>
              {LOCALES.map((locale) => (
                <SelectItem key={locale.code} value={locale.code}>
                  {locale.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-xs bg-purple-50 px-2">
          <Monitor className="w-3.5 h-3.5 mr-1.5" />
          Channel
        </Badge>
        <Select value={selectedChannel} onValueChange={handleChannelChange}>
          <SelectTrigger className="w-[150px] bg-white">
            <SelectValue placeholder="Select channel">{channelLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Channels</SelectLabel>
              {CHANNELS.map((channel) => (
                <SelectItem key={channel.code} value={channel.code}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default React.memo(LocaleChannelSelector); 