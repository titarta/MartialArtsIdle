import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUi   from './locales/en/ui.json';
import enGame from './locales/en/game.json';

// ── Language preference ───────────────────────────────────────────────────────
// Stored separately from the save file so it survives a wipe.
export const LANG_KEY = 'mai_lang';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  // Uncomment and add locale files as translations become available:
  // { code: 'zh', label: '中文' },
  // { code: 'pt', label: 'Português' },
  // { code: 'es', label: 'Español' },
  // { code: 'fr', label: 'Français' },
  // { code: 'de', label: 'Deutsch' },
  // { code: 'ja', label: '日本語' },
  // { code: 'ko', label: '한국어' },
];

const savedLang = localStorage.getItem(LANG_KEY) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        ui:   enUi,
        game: enGame,
      },
      // Add new languages here as their locale files are ready:
      // zh: { ui: zhUi, game: zhGame },
    },
    lng:          savedLang,
    fallbackLng:  'en',
    ns:           ['ui', 'game'],
    defaultNS:    'ui',
    interpolation: {
      escapeValue: false, // React escapes by default
    },
  });

/**
 * Switch the active language and persist the choice.
 * Call this from the Settings screen language selector.
 */
export function setLanguage(code) {
  localStorage.setItem(LANG_KEY, code);
  i18n.changeLanguage(code);
}

export default i18n;
