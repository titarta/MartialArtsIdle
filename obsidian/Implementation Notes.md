# Implementation Notes

Technical details of the current codebase. Updated as features are built.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 (hooks only, no Redux/Context) |
| Bundler | Vite |
| Mobile | Capacitor 8.3.0 |
| Persistence | localStorage only (no backend) |

---

## Project Structure

```
src/
├── App.jsx                    # Main router, screen container
├── App.css                    # All global styles
├── index.css                  # CSS variables & resets
├── components/
│   ├── NavBar.jsx             # Bottom tab bar (6 screens)
│   ├── RealmProgressBar.jsx   # Vertical qi progress indicator
│   ├── SpriteAnimator.jsx     # Sprite sheet animation engine
│   ├── VFXLayer.jsx           # Particle / VFX system
│   └── ItemModal.jsx          # Item detail popup
├── screens/
│   ├── HomeScreen.jsx         # Cultivation UI — IMPLEMENTED
│   ├── InventoryScreen.jsx    # Item management — IMPLEMENTED
│   ├── StatsScreen.jsx        # Stats + save/load — PARTIAL
│   ├── TrainingScreen.jsx     # STUB
│   ├── CombatScreen.jsx       # STUB
│   └── ShopScreen.jsx         # STUB
├── hooks/
│   ├── useCultivation.js      # Game state + main loop
│   └── useInventory.js        # Inventory CRUD
├── systems/
│   └── save.js                # localStorage + base64 encode/decode
└── data/
    ├── realms.js              # 11 realm definitions
    ├── items.js               # 24 items + rarity config
    └── starterInventory.js    # Default starting quantities
```

---

## Game Loop (`src/hooks/useCultivation.js`)

```js
// requestAnimationFrame with delta-time
BASE_RATE = 5           // qi/sec baseline
BOOST_MULTIPLIER = 3    // hold-button multiplier

tick(now):
  dt = (now - lastTick) / 1000
  if not maxed:
    qi += BASE_RATE * (boosted ? 3 : 1) * dt
  if qi >= realmCost:
    qi -= realmCost
    realmIndex++
```

Auto-save every 2 seconds → `localStorage['mai_save'] = { realmIndex, qi }`

**Realm data shape** (`src/data/realms.js`):
```js
{ name: 'Tempered Body', stage: 'Layer 1', cost: 100 }
// Display label built in useCultivation: "Tempered Body - Layer 1"
// Half-Step Open Heaven has stage: '' so label is just the name
```

**47 sub-stages** across 14 major realms. Qi display uses K/M/B/T suffix formatting (`RealmProgressBar`). Total qi to max: ~220T.

---

## Save System (`src/systems/save.js`)

| Key | Contents |
|---|---|
| `mai_save` | `{ realmIndex, qi }` |
| `mai_inventory` | Item quantities by ID |

Export/import uses base64 (`btoa`/`atob`). Stats screen has Save / Export / Import / Wipe buttons.

---

## Color Palette (`src/index.css`)

| Token | Value | Usage |
|---|---|---|
| Background | `#1a1a2e` → `#0f3460` | Page gradient |
| Card BG | `#0f3460` | UI cards |
| Accent | `#e94560` | Buttons, highlights |
| Hover | `#ff6b81` | Button hover |
| Gold | `#f5c842` | Currency, special text |
| Text primary | `#eee` | Main text |
| Text secondary | `#aaa` | Subtitles |
| Text muted | `#777` | Disabled |
| Border | `#2a2a4a` | Card borders |

---

## Rarity Colors (`src/data/items.js`)

| Tier | Hex |
|---|---|
| Common | `#aaa` |
| Uncommon | `#4ade80` |
| Rare | `#60a5fa` |
| Epic | `#c084fc` |
| Legendary | `#f59e0b` |

---

## Sprite Animation (`src/components/SpriteAnimator.jsx`)

- 6-frame idle animation, 6–12 fps
- Grid layout: `col = frame % cols`, `row = floor(frame / cols)`
- Uses `image-rendering: pixelated` for crisp pixel art

## VFX (`src/components/VFXLayer.jsx`)

| Effect | Duration | Behavior |
|---|---|---|
| Burst | 500ms | Scale 0.2 → 2 with easing |
| Hit | 300ms | Scale 0.3 → 1.2 |
| Float-up | 800ms | Translate -40px + opacity fade |

---

## What Needs Building Next

| System | Notes |
|---|---|
| CHI/Soul/Body stats | Replace `qi` with three separate stats; connect to realm gating |
| Training screen | Bind to Strength/Agility/Spirit growth |
| Combat screen | Zone assignment, enemy spawning, drop system |
| Shop screen | Buy/sell materials and items |
| Laws | Procedural generation, cultivation speed bonuses |
| Secret Techniques | Combat formula implementation |
| Reincarnation | Prestige loop, soul binding |
| Alchemy | Pill crafting from materials |

---

## Related

- [[Home]]
- [[Cultivation System]]
- [[Realm Progression]]
- [[Items]]
