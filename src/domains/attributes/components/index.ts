// Components
export { default as AttributeValueRow } from './AttributeValueRow';
export { default as LocaleChannelSelector } from './LocaleChannelSelector';
export { default as AddAttributeModal } from './AddAttributeModal';
export { default as AttributeGroupTabs } from './AttributeGroupTabs';

// Types
export type { 
  Attribute, 
  AttributeValue, 
  SavingState 
} from './AttributeValueRow';

export interface AttributeGroup {
  id: number;
  name: string;
  description?: string;
  items: Array<{
    id: number;
    attribute: number;
    value?: any;
    value_id?: number;
    locale?: string | null;
    channel?: string | null;
  }>;
} 