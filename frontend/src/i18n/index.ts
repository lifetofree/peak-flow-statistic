import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import th from './th.json';

i18n.use(initReactI18next).init({
  resources: {
    th: { translation: th },
  },
  lng: 'th',
  fallbackLng: 'th',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
