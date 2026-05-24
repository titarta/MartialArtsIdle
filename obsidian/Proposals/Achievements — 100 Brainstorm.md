# Achievements: Curated List (v4)

**Status:** Brainstorm, pre-scoping.
**Date:** 2026-05-23. Revised three times: v2 scoped to v1 features only, v3 pruned per author review, v4 added the recursive entry and stripped AI-pattern punctuation.

## Scope guardrails: what v1 actually ships

Per `src/data/featureFlags.js` everything combat-adjacent is `false`:
- combat, enemies, regions, bosses, damage, combos
- pills, alchemy, cauldron
- artefacts, gear, inventory, drops
- techniques (combat techniques)
- materials, gathering, mining
- laws (selection cards suppressed)
- wuxing element progression (UI gated behind combat)

Live systems the achievements may touch:
- Cultivation realms (the chain, see `src/data/realms.js`)
- Qi crystal (tap, hold, click multipliers)
- Qi sparks (pick-of-2 cards on breakthroughs)
- Producers and upgrades (the idle economy)
- Idle / offline qi accrual
- Reincarnation and the Eternal Tree (karma)
- Cultivation speed gates between major realms
- Shop (cosmetic skins)
- Daily login bonus
- Settings (audio channels, graphics, language, save mgmt)

## Design principles

1. **Discovery over disclosure.** Roughly 55% fully hidden (`???` until earned). Screenshots on Discord is the win condition.
2. **No categories.** Flat list. Order by flavor for readability only. The player sees one stream.
3. **Flavor over thresholds.** "Reach realm X" alone is a checkbox. Pair it with copy that lands.
4. **Earnable for the curious, not just the grinder.** Half reward weird inputs and patience. Half reward dedication.
5. **Cultivation novel literacy gets a wink, never required.** Lin Family Trash, Sun Wukong's furnace, Old Monster. Gettable on the surface, sweeter if you know.

## What got removed in v3

Per author review, 26 entries cut. Three reasons:

**Don't apply to this game's mechanics (9):** Drip Master (completionist breaks on updates), Heart Demon Banished (no hover tracking on mobile), Dao Heart Unshaken (no reincarnation reject flow, it's a button not a popup), Forgetful Cultivator (hard resets are vanishingly rare), Confucius Says (no tooltips), There Is No Spoon (no naming), Konami (no keyboard on mobile), Speak Friend (no text inputs), 1337 (overlaps).

**Wrong execution, dropped instead of replaced (8):** Snake Eyes, Phoenix, Big Brother (1984), Pseudo-Immortal, Don't Touch That (`?dev=1` mobile-broken), Lucky Seven (no real 7× mult), Patience of a Mountain (ambiguous), Ascetic (original framing).

**Sub-feature toggles that don't exist (3):** Speedometer Off, Blindfolded, Don't Touch That.

**Pay-to-win concern, whole speedrun section cut (6):** Lin Family Genius, Speed Demon, Speedrunner's Curse, Three Sons of Heaven, True Neverclick, Phoenix.

Kept with rewrites (7): #42 (now "42 of one producer"), All In (now ≥95% threshold), Spirit Awakens / Core Forged / Sea of Consciousness (renamed to real realm names), Heaven's Doorstep / Heaven's Doorway (re-anchored to real realms).

## Snapshot extensions needed

| Add to snapshot | Cost | Source |
|---|---|---|
| `totalCrystalTaps` (lifetime) | trivial | increment in `useQiCrystal.tap()` |
| `peakTapsPerSecond` (rolling 1s) | trivial | timestamped ring buffer |
| `longestHoldSec` (this session) | trivial | hold start/end timestamps |
| `totalPlayTimeSec` | trivial | accrue while mounted |
| `lastSessionGapSec` | trivial | `now - lastSavedAt` on load |
| `lifetimeQiEarned` | trivial | add in qi-gain paths |
| `peakQiPerSec` | trivial | max of current `qiPerSec` |
| `reincarnationCount` | trivial | already implicit in karma |
| `karmaNodesUnlocked` | already exists | `useReincarnationTree` |
| `qiSparksCaught` | trivial | `useQiSparks` event hook |
| `shopVisitsCount` | trivial | `useShopInventory` |
| `dayStreak` | already tracked | `useDailyBonus` |
| `runShopPurchases` (resets on reincarnation) | trivial | `useShopInventory` |
| `audioToggleCount`, `settingsTouched` (Set) | trivial | settings reducer |
| Calendar (`localHour`, holidays) | trivial | `new Date()` at unlock check |

Event bus needed for rhythm taps (60 BPM), "tap N times in M seconds", and similar. These don't fit the snapshot model. Recommend a thin `achievementBus.fire(eventId, payload)` API alongside the existing snapshot check.

## Reveal states

- **Visible** (default): title, desc, and condition hint always shown. Used for the realm chain and long-haul streaks the player can navigate toward.
- **☆ Secret desc:** title visible, desc shown as `???`. The condition is the fun.
- **★ Fully hidden:** listed as `???` until earned. Most of the list. Toast on unlock reveals everything.

Mix in the list below: about 30% visible, 15% secret-desc, 55% fully hidden.

## The list (76 entries)

Grouped by flavor for readability only. Player sees one flat stream.

### A. The Cultivation Chain (12)

1. **First Breath:** Take your first step on the path. *(realm 1)*
2. **Foundation Established:** Forge through all ten layers of Tempered Body. *(realm 10)*
3. **★ Qi Transformed:** Master Qi Transformation. *The qi within you is no longer mortal.* *(realm 13)*
4. **★ True Elements Awakened:** Enter the True Element realm. *(realm 14)*
5. **★ Spirit Severed:** Reach Separation & Reunion. *Your spirit splits to walk two paths at once.* *(realm 18)*
6. **Immortal Ascension:** Begin the ascent beyond mortal limits. *(realm 21)*
7. **Saint's Path:** Walk among those who have transcended. *(realm 24)*
8. **Saint King:** Pinnacle of the Saint ranks. *(realm 27)*
9. **★ Origin Returned:** Reach Origin Returning. *Return to the source from which all qi flows.* *(realm 30)*
10. **★ Void King:** Step into the void between worlds. *(realm 36)*
11. **★ Dao Source:** Touch the Dao at its source. *(realm 39)*
12. **Open Heaven:** Shatter the heavens. *(realm 46)*

### B. The Crystal: Taps & Holds (10)

13. **First Touch:** Your first crystal tap.
14. **Featherlight:** 100 lifetime taps.
15. **Hand of God:** 10,000 lifetime taps.
16. **★ Stone Hammer:** 100,000 lifetime taps.
17. **★ Mountain Crusher:** 1,000,000 lifetime taps. *Your phone is holding up.*
18. **★ Hummingbird:** 12 taps in 1 second.
19. **★ Carpal Tunnel:** 100 taps in 10 seconds. *We're worried.*
20. **★ Wax On, Wax Off:** Hold the crystal for 60 seconds straight.
21. **★ Iron Lung:** Hold the crystal for 5 minutes straight.
22. **★ Dao of Holding:** Hold the crystal for 30 minutes straight. *Statue mode.*

### C. Qi Sparks (4)

23. **★ First Spark:** Catch your first qi spark.
24. **★ Spark Hunter:** Catch 100 qi sparks.
25. **★ Spark Sage:** Catch 1,000 qi sparks.
26. **★ Drought:** Play for 1 hour without seeing a single spark. *The wind is still.*

### D. Idle & Offline (7)

27. **Brief Sojourn:** Return after 1 hour away.
28. **Closed-Door Cultivation:** Return after 24 hours away. *The mountain does not move.*
29. **★ Slept Through a Dynasty:** Return after 7 days away.
30. **★ Old Monster:** Return after 30 days away. *Your sect thinks you're dead.*
31. **★ Eternal Hibernation:** Return after 365 days away. *Welcome back. The world is different.*
32. **★ Idle Empire:** Accumulate 1B qi entirely while offline.
33. **★ The Long Slumber:** A single offline gap rewards more qi than your prior total play time.

### E. Reincarnation & The Eternal Tree (8)

34. **Wheel of Saṃsāra:** Reincarnate for the first time.
35. **★ Second Wind:** Reincarnate a second time. *It got easier, didn't it.*
36. **★ Beyond the Wheel:** Reincarnate 10 times. *You remember every life.*
37. **★ Karmic Seed:** Spend your first karma point.
38. **★ Bodhi Branch:** Unlock 10 karma nodes.
39. **★ Bodhi Tree:** Unlock 50 karma nodes.
40. **★ Bodhi Crown:** Unlock the entire Eternal Tree.
41. **★ Lin Family Trash:** Voluntarily reincarnate at the lowest available threshold.

### F. Speed Gates & Upgrades (4)

42. **★ Brick Wall:** Hit your first cultivation speed gate.
43. **★ Through the Gate:** Pass a cultivation speed gate.
44. **★ Iron Gate:** Pass the highest-tier speed gate.
45. **★ All In:** Spend at least 95% of your current qi pool in a single producer or upgrade purchase.

### G. Shop & Cosmetics (2)

46. **Vanity:** Buy your first cosmetic skin.
47. **★ Cabbage Seller:** Visit the shop 100 times. *Always poor. Always smiling.*

### H. Daily Streak (4)

48. **Loyal Disciple:** 7-day login streak.
49. **★ Iron Will:** 30-day login streak.
50. **★ Hundred-Day Hermit:** 100-day login streak.
51. **★ No Daily Bread:** Skip the daily bonus 7 days in a row, then claim. *Worth it.*

### I. Time of Day & Calendar (8)

52. **★ Night Owl:** Cross a realm boundary between 1am and 4am local time.
53. **★ Early Bird:** Cross a realm boundary between 5am and 7am.
54. **★ Lunch Break:** Play for 10 minutes or more between 12pm and 1pm on a weekday.
55. **★ Witching Hour:** Tap the crystal at exactly 00:00:00 local time.
56. **★ Lunar New Year:** Play on the lunar new year.
57. **★ Day of Tribulation:** Play on the 9th day of the 9th month. *Auspicious, or not.*
58. **★ Birthday Cultivator:** Play on your registered birthday.
59. **★ Sky Watcher:** Play during all four time brackets (night, morning, afternoon, evening) within 24 hours.

### J. Settings & Discovery (5)

60. **★ Patience, Young Grasshopper:** Open the achievements panel 50 times. *We see you checking.*
61. **★ Audiophile:** Toggle BGM 10 times. *Pick a side.*
62. **★ Mute:** Play with all audio off for 30 minutes.
63. **★ Settings Connoisseur:** Touch every setting at least once.
64. **★ Did You Know?:** Read every tutorial card.

### K. Pop Culture (3)

65. **★ It's Over 9000:** Reach 9,001 qi/s.
66. **★ Number of the Beast:** Hold exactly 666 qi/s for one full second.
67. **★ 42:** Own exactly 42 of a single producer type. *The answer.*

### L. Quirky & Silly (5)

68. **★ Bonk:** Tap a non-interactable UI element 20 times in a row. *Nothing's happening.*
69. **★ Restless:** Switch screens 100 times in 5 minutes. *Pick one, friend.*
70. **★ Tap Dancer:** Tap the crystal at 60 BPM for 30 seconds. *Tempo matters.*
71. **★ Tickle the Master:** Tap the cultivator sprite 100 times. *He felt that.*
72. **★ Achievement Unlocked:** Unlock any achievement. *Surprise. This is your second.*

### M. Endgame Dedication (3)

73. **Sworn Brother of Heaven:** 100 hours total play time.
74. **★ Sleepless in Eastern Continent:** 500 hours total play time.
75. **★ Dao of Idle:** 1,000 hours total play time.

### Capstone (1)

76. **★ ?????:** Unlock all 75 above. Reveal: **"Become the Path"**. *You did not climb the mountain. You became it.*

## Implementation notes (when scoped)

- Snapshot extension is mostly trivial. Drop the new counters into the existing `achievements.check()` snapshot.
- Event-based ones (60 BPM rhythm, taps-in-window, midnight tap) need an `achievementBus.fire(eventId)` companion.
- `hidden: true` field on the entry, plus render `???` for title in `AchievementsBody.jsx`.
- `secretDesc: true` makes the title visible but desc hidden until earned.
- Toast on unlock stays as-is. The "??? Achievement Unlocked" with reveal in the toast is part of the fun.
- Spirit Severed, Origin Returned, Void King, Dao Source are new realm-threshold entries to add to `achievements.js` alongside the existing realm_1, realm_10, realm_14, realm_21, realm_24, realm_27, realm_46.

## Open questions

1. **Backfill to 100?** Current list is 75 plus capstone. If you want closer to 100, I can draft another 24 in the surviving themes (more crystal, spark, idle, calendar, reincarnation entries, the safest categories). Or ship this curated set and call it done.
2. **Hidden state icon.** Do `★` locked achievements show a generic `?` icon, or a category-flavored one (cultivation, idle, etc) as a hint? I lean generic `?` for maximum mystery.
3. **Seed list.** Which 5 of the hidden ones do you want guaranteed to fire in the first 2 or 3 hours, so players learn the game has hidden content? Candidates: First Touch, First Spark, Brief Sojourn, Vanity.
4. Want the rendering changes (`hidden` and `secretDesc` in `AchievementsBody.jsx`) scoped next, or another pass on the list first?
