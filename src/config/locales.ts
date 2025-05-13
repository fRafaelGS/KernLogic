export const LOCALES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'fr_FR', label: 'French'      },
  { code: 'es_ES', label: 'Spanish'     },
  { code: 'de_DE', label: 'German'      },
  { code: 'it_IT', label: 'Italian'     },
  { code: 'ja_JP', label: 'Japanese'    },
  { code: 'ko_KR', label: 'Korean'      },
  { code: 'pt_BR', label: 'Portuguese (Brazil)' },
  { code: 'ru_RU', label: 'Russian'     },
  { code: 'zh_CN', label: 'Chinese (Simplified)' },
] as const;

export type LocaleCode = typeof LOCALES[number]['code']; 