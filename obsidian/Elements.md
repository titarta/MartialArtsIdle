# Elements

Five elements replacing the prior 9-pool type system. Authoritative: `ELEMENTS` in `src/data/elements.js`.

| Element | — |
|---|---|
| fire | — |
| water | — |
| earth | — |
| wood | — |
| metal | — |

## Where Elements Appear

- **Laws** — each law has exactly one element; its `types` field selects unique-modifier pools
- **Artefacts** — element assigned at drop time; constrains the `setId`
- **Secret Techniques** — each has an element + independent `damageType` (physical or elemental)
- **Enemies** — optional tag; defaults to `'none'`

## Element ≠ Damage Type

Element is a **tag** for content matching (set bonuses, law affinity, technique drop pools). Damage routing is the technique's `damageType` field. A `wood` technique can deal physical damage.

## Unique Pools

`['fire', 'water', 'earth', 'wood', 'metal', 'general']` — all empty after 2026-04-24 overhaul. See [[Unique Modifiers]].

## Related

- [[Stats]]
- [[Laws]]
