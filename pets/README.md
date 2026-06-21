# Pets

Client modules for the elemental pet companion system.

| File | Role |
|------|------|
| `pet_progression.js` | XP table (12,380 to L30), feed charges (8h regen, cap 2) |
| `pets_catalog.js` | 16 pets (Fire/Earth/Nature/Water), element basic food, favorites, L30 stats |
| `pet_system.js` | Instances, feeding, hatching, stat scaling, tooltip HTML |
| `egg_drops.js` | Region→egg element, drop rates, dungeon elite list |
| `pet_items.js` | Merges pet + egg item defs into `GAME_CONFIG` (after `config.js`) |

## Elements

- **Fire** → INT pets (Ember Salamander, Cinder Moth, Flameglass Viper, Rift Emberling)
- **Earth** → STR pets (Ironroot Raptor, Granite Boar, Rustjaw Hound, Stoneback Auroch)
- **Nature** → VIT pets (Mossheart Stag, Barkscale Tortoise, Verdant Lynx, Heartbloom Wisp)
- **Water** → DEX pets (Tideglass Otter, Frost Mink, Ripplewing Heron, Glassfin Serpent)

## Acquisition

Rare **elemental eggs** drop from monsters (region sets egg type; rarity sets rate). Double-click an egg in **Consumables** to hatch a random L1 pet of that element.

## Feeding

Equip pet on hero → drag **Resources** onto the pet slot. 1 resource = 1 feed (uses 1 of 2 feed charges). Basic food is shared per element (5 normal-monster materials); favorites are per pet (elite/boss drops).

## Testing (edit mode)

Character panel → **Add to inventory** → pick a pet or egg → equip pet / double-click egg → drag resources onto pet slot.

Pet images: `Assets/Pets/{slug}_{young|grown|mature}.png`
