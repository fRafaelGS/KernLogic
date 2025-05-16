export type ChannelCode = 
  | 'ecommerce'
  | 'mobile'
  | 'retail'
  | 'marketplace'
  | 'wholesale'
  | 'other'

export const CHANNELS = [
  { code: 'ecommerce',   label: 'E-commerce' },
  { code: 'mobile',      label: 'Mobile App' },
  { code: 'retail',      label: 'Retail (POS)' },
  { code: 'marketplace', label: 'Marketplace' },
  { code: 'wholesale',   label: 'Wholesale' },
  { code: 'other',       label: 'Other' }
] as const 