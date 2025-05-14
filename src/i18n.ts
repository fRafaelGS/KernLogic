import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enSettings from './locales/en/settings.json';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          ...enSettings
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n; 