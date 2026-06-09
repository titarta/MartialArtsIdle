/**
 * Game-content (the `game` i18n namespace) resolver.
 *
 * Content names/descriptions live in the data modules (src/data/*) as the
 * English source of truth. en/game.json is generated from them by
 * scripts/gen_game_i18n.mjs and pushed to Polyglyph for translation; the
 * pulled <lang>/game.json files carry the translations. At render time a
 * component resolves an entity's text by id:
 *
 *   const gt = useGameText();
 *   gt('upgrades', upgrade.id, 'name', upgrade.name)   // <- data English is the fallback
 *
 * The data value is passed as `defaultValue`, so English never breaks even
 * before a key exists (mid-migration, or a freshly-added entity not yet
 * regenerated). Non-English languages get the pulled translation; anything
 * untranslated falls back to the English source automatically.
 */
import i18n from './index';
import { useTranslation } from 'react-i18next';

/**
 * Resolve one game-content string.
 * @param {string} section  game.json top-level section (e.g. 'upgrades', 'qiSparks')
 * @param {string} id        entity id / key
 * @param {string} field     field name (e.g. 'name', 'desc', 'description')
 * @param {string} fallback  English source value (used until translated)
 */
export function gameText(section, id, field, fallback) {
  return i18n.t(`${section}.${id}.${field}`, { ns: 'game', defaultValue: fallback ?? '' });
}

/**
 * Hook form — returns a resolver bound to the `game` namespace that
 * re-renders the component when the active language changes.
 * @returns {(section: string, id: string, field: string, fallback?: string) => string}
 */
export function useGameText() {
  const { t } = useTranslation('game');
  return (section, id, field, fallback) =>
    t(`${section}.${id}.${field}`, { defaultValue: fallback ?? '' });
}
