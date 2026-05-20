import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

const languages = [
  'en', // English
  'es', // Spanish
  'zh', // Mandarin Chinese
  'hi', // Hindi
  'ar', // Arabic
  'pt', // Portuguese
  'bn', // Bengali
  'ru', // Russian
  'ja', // Japanese
  'pa', // Punjabi
  'mr', // Marathi
  'de', // German
  'fr', // French
  'it', // Italian
  'tr', // Turkish
  'vi', // Vietnamese
  'ur', // Urdu
  'el', // Greek
  'pl', // Polish
  'id', // Indonesian
];

const namespacesObject = ['common', 'auth', 'chat', 'settings', 'memory'];

i18next
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    fallbackLng: 'en',
    debug: false,
    ns: namespacesObject,
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
