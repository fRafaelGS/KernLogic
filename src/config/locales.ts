export type LocaleCode = 
  | 'en_US'
  | 'fr_FR'
  | 'es_ES'
  | 'de_DE'
  | 'it_IT'
  | 'ja_JP'
  | 'ko_KR'
  | 'pt_BR'
  | 'ru_RU'
  | 'zh_CN'

export const LOCALES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'fr_FR', label: 'French' },
  { code: 'es_ES', label: 'Spanish' },
  { code: 'de_DE', label: 'German' },
  { code: 'it_IT', label: 'Italian' },
  { code: 'ja_JP', label: 'Japanese' },
  { code: 'ko_KR', label: 'Korean' },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'ru_RU', label: 'Russian' },
  { code: 'zh_CN', label: 'Chinese (Simplified)' }
] as const 