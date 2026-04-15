import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languagesJson from './languages.json';

// Auto-discover all locale files. Vite resolves these at build time so any
// file under locales/<code>/*.json is automatically bundled — adding a new
// language only requires adding the JSON files and an entry in languages.json.
const uiModules   = import.meta.glob('./locales/*/ui.json',   { eager: true });
const gameModules = import.meta.glob('./locales/*/game.json', { eager: true });

// Build the i18next resources map from discovered files.
const resources = {};
for (const lang of languagesJson) {
  const uiKey   = `./locales/${lang.code}/ui.json`;
  const gameKey = `./locales/${lang.code}/game.json`;
  resources[lang.code] = {
    ui:   (uiModules[uiKey]   ?? { default: {} }).default,
    game: (gameModules[gameKey] ?? { default: {} }).default,
  };
}

// ── Language preference ───────────────────────────────────────────────────────
// Stored separately from the save file so it survives a wipe.
export const LANG_KEY = 'mai_lang';

/** All supported languages, derived from languages.json. */
export const SUPPORTED_LANGUAGES = languagesJson;

const savedLang = localStorage.getItem(LANG_KEY) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
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
