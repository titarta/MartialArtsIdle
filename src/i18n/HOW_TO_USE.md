# How to use the i18n system

## Hook (components/screens)

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('ui');   // 'ui' or 'game'
  return <h1>{t('settings.title')}</h1>;
}
```

## Two namespaces

| Namespace | File                        | Contains                                      |
|-----------|-----------------------------|-----------------------------------------------|
| `ui`      | locales/en/ui.json          | Nav, buttons, labels, messages, stat names    |
| `game`    | locales/en/game.json        | Items, realms, enemies, worlds, techniques… |

## Common patterns

```jsx
// Simple string
t('nav.home')

// String with variable
t('build.inSlot', { slot: 'Head' })

// Game content by id
const { t: tGame } = useTranslation('game');
tGame(`items.${item.id}.name`)
tGame(`items.${item.id}.desc`)
tGame(`enemies.${enemy.id}.name`)
tGame(`realms.${realm.name}`)
tGame(`stages.${realm.stage}`)
tGame(`worlds.${world.id}.name`)
tGame(`techniques.${tech.id}.name`)
tGame(`techniques.${tech.id}.flavour`)
tGame(`laws.${law.id}.name`)
tGame(`artefacts.${artefact.id}.name`)
tGame(`artefacts.${artefact.id}.desc`)

// Stat names from ui namespace
t(`statNames.physical_damage`)   // "Physical DMG"
t(`statNamesShort.physical_damage`) // "Phys. Dmg"

// Quality / element / type enums
t(`quality.Gold`)       // "Gold"
t(`elements.Fire`)      // "Fire"
t(`techniqueTypes.Attack`) // "Attack"
t(`techniqueRanks.Mortal`) // "Mortal"
```

## Adding a new language

1. Create `src/i18n/locales/<code>/ui.json` — copy en/ui.json and translate values
2. Create `src/i18n/locales/<code>/game.json` — copy en/game.json and translate values
3. In `src/i18n/index.js`:
   - Import the new files
   - Add them to `resources`
   - Uncomment the language in `SUPPORTED_LANGUAGES`

## Language selector

Already wired into **Settings → Language** section. Uses `setLanguage(code)` from `src/i18n/index.js`.
Language choice persists in `localStorage` under `mai_lang` and survives save wipes.
