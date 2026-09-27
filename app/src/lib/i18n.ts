import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ur from '@/locales/ur.json';

/**
 * Keys are the English sentences themselves (e.g. t('Car Out')), so English
 * needs no dictionary and a missing Urdu translation falls back to English.
 * Urdu: fill locales/ur.json with { "Car Out": "…" } (Phase 2).
 */
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: localStorage.getItem('lang') ?? 'en',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function setLanguage(lang: 'en' | 'ur') {
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  return i18n.changeLanguage(lang);
}

document.documentElement.dir = i18n.language === 'ur' ? 'rtl' : 'ltr';

export default i18n;
