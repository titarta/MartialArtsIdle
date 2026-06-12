# Art / Placeholder Roadmap

Audit date: 2026-06-11. Tracks the remaining placeholder art (emoji icons, missing
sprites) and groups it by reward-vs-effort so batches can be knocked out cheaply.

Enabler: the icon render components accept a PNG path anywhere an emoji sits today
(they detect a leading `/` and render `<img>`), so swapping an emoji for art is a
data edit, not a component rewrite. The only cost is generating the art.

Legend: [ ] todo  ·  [x] done

---

## Tier 1 — Free polish (4 icons, do first)

Cheapest wins; both fix surfaces that currently look unfinished.

- [ ] **Half-Step Open Heaven realm icon** (1) — `gen_realm_icons.py`. Currently the
  only realm still on an emoji (`🌅`, `JourneyBody.jsx:31`); every other one of the
  13 has a painted icon. One generation removes a visible odd-one-out.
- [ ] **Wardrobe slot defaults** (3) — `gen_ui.py`. The empty-state of the premium
  wardrobe: `🧘` character, `✨` particles, `🏔` background (`WardrobeTab.jsx:39-44`).
  Note: the particles default now shows the real C1 orb (done 2026-06-11), so only
  character + background defaults remain as emoji here.

## Tier 2 — Core-mechanic completion (14 icons)

- [ ] **Qi Spark common/uncommon icons** (11) — `src/data/qiSparks.js` SPARK_COPY.
  Seen constantly (choice modal, buffs chip, Sparks tab). Legendaries already use PNG
  art, so this finishes a half-done set. ⚡🌊💧⚔🌱🔍🏞️🕰🪙☁️🔔.
- [ ] **Settings perk icons** (3) — `shopItems.js` QoL items: Decisive Heart (`⚡`),
  Disciple's Diligence (`🤖`), Patient Mind / offline-cap (`⏳`).

## Tier 3 — Monetization polish (the paid surface)

- [ ] **Character + crystal skins first** (~7) — headline paid items; an emoji on a
  purchasable skin undercuts perceived value. Frost Ascetic `🏔️`, Frost Crystal `◇`,
  Bone Patriarch `💀`, Ossuary Crystal `⬣`, Storm Caller `⚡`, Lotus Sage `🪷`,
  Phoenix Core `🔥` (`shopItems.js:187-218`). Highest revenue-per-icon in the list.
  NOTE: these skins also have no `effect.bodyClass` yet — buying them does not change
  the in-game sprite (inventory-only). Full skin = sprite set + wiring, a bigger job.
- [x] **16 Qi Particle thumbnails** — DONE 2026-06-11, zero new art. The orbs already
  exist (`qi_orb_c9_0..15.png`); the shop already rendered them. Wardrobe now renders
  the real orb too (`WardrobeTab.jsx`), so the `cos_particles_c9_*` emoji no longer
  leak. (The `icon:` emoji stay in data as a harmless fallback.)
- [ ] **Misc shop item icons** (~5) — Crimson Aura `🔴`, Producer Surge `⚙️`,
  Heaven's Pardon `☁️`, bundle icons `❄️`/`💀`. Lower priority than skins.

## Tier 4 — Big set, reframe to stay cheap

- [ ] **Achievements (~63 emoji)** — `src/data/achievements.js`, one `icon:` each.
  Min-effort reframe: most are tiered series (realm milestones, tap/hold counts,
  offline tiers, time-of-day, secrets). Make ONE icon per series (~10) and
  differentiate tiers with a frame/tint/number badge → a 63-icon slog becomes ~10.
  Full per-achievement art is the showcase version; defer unless wanted as a
  centerpiece collection wall.

## Tier 5 — Parked / leave alone

- 22 missing enemy sprite sets (`tree_demon` … `boundary_wraith`) — hidden v2 combat,
  no current player reward. Source of truth: `scripts/gen_sprites.py` ENEMIES dict.
  Don't spend art budget until combat ships.
- Functional UI glyphs (mute `🔇`/`🔊`, export/import `📤`/`📥`, trash `🗑`, lock
  `🔒`, `✦`, `✓`/`✕`) read fine as glyphs; converting them is low reward.
- `public/backgrounds/world_1..6.png` — 6 unused background PNGs (not emoji). Separate
  wire-or-delete decision.

---

## Notes / shortcuts

- Particle thumbnails were free because the orb art + path scheme already existed
  (`cos_particles_c9_N → qi_orb_c9_N.png`). Look for the same pattern elsewhere before
  generating new art.
- Wiring per batch is cheap: change `icon:` from the emoji to a `/...` path. The spark
  / buff / producer renderers already `<img>` a leading-`/` string.
