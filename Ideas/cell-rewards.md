# Cell rewards tooltip (parked)

Status: parked on 2026-11-24 because of feature creep, to be rethought later. The code is not in Toolbelt (called Nice Features at the time). It's saved as a patch next to this file.

## The idea

Hover any cell on the grid that isn't killed yet to see what killing it gives. It started as helium badges (a dot on every cell that drops helium). The dots were dropped because the cell colors already show Corrupted, Healthy and mutated cells, and everyone knows the last cell drops helium. That left a general tooltip for every reward on a cell.

## What the parked version does

- **Setting:** "Cell Rewards: Off / On" in the Toolbelt box in Settings > Mods (key `nfCellRewards`, on by default). When it's off, cells keep the plain browser hover with the enemy name.
- **Tooltip:** uses the game's own tooltip box (`tooltip(title, 'customText', event, text)`). Its title is the enemy name plus the corruption effect, from `cellTitle`. It's hidden on cells already killed (`cellColorBeaten`) or cleared by overkill (`cellColorOverkill`). The browser title is cleared while it's open, so two tooltips never show.
- **Helium and radon:**
  - Last cell: Blimp from Z21 (Z16 in U2), Improbability, Omnipotrimp. Shows what the same cell gives on the next zone. That number leaves Wind stacks out and says when the next zone is a Wind zone.
  - Corrupted and Healthy cells (U1), mutated enemies (U2), and the Void Map reward with stacked maps, Fluffy, Void Mastery, Scry and other bonuses.
  - How much helium is left in the zone or map.
  - Nothing in c² runs.
- **The item on the cell:**
  - World drops: food, wood and metal (fruit, groundLumber, freeMetals), fragments (Map) and Spire metal.
  - Map drops: gems and Gems, Food, Wood, Metal, and Any (food, wood or metal at random, all three listed).
  - Metal shows "none in Transmute".
  - Tokens of Nature.
  - Other items show their name. A prestige book already found at this map level says it gives nothing.
- **What the enemy drops:**
  - Blimp: food, wood and metal.
  - Goblimp, Feyimp and Flutimp: exact gems or fragments.
  - Chronoimp: each resource. Jestimp: each resource it could pick.
  - Magnimp, Whipimp and Venimp: their bonus now and after the kill, as a multiplier.
  - Turkimp: the buff time it adds, or that the bonus is already permanent.
  - Randimp: how many random imp drops it gives.
  - Skeletimp and Megaskeletimp: 1 or 2 bones.
  - Other imps: the game's own `dropDesc` text (Tauntimp, Titimp).
- **"No loot."** when nothing applies.

## How it works

- **Exact amounts:** they come from the game's own `rewardResource`, called with `addHelium`, `addResCheckMax`, `addAvg` and `fadeIn` switched off for the call. That way it only returns the amount, and every bonus counts. Chronoimp and Jestimp use `scaleToCurrentMap(simpleSeconds(res, seconds))`, and tokens use `rewardToken(emp, true, world)`. All of these are side-effect free.
- **Fingerprints:** the drop rules (base amount, level, map scaling, conditions) are copied from the game's code, so each one is fingerprinted. That's 31 functions in `REWARD_FNS`, against Trimps 5.10.1.
  - Each rule is checked on its own. A rule that changed only drops its own lines from the tooltip.
  - Rules that hand out resources also need `rewardResource` unchanged.
  - Changed functions show in the red warning bar.
- **Hover:** the hover is attached in `decorateGrid` (after each `drawGrid`) through `watchCell`.

## Verified

Checked in a browser copy of the Steam build with the test save, at Z240 in U1, outside c². Each tooltip amount was compared with what the game's real drop function paid out. All of these matched exactly:

- Healthy, Corrupted and the Omnipotrimp, on this zone and the next
- a U2 mutated enemy (Rage plus Compression)
- a Void Map reward
- the world drops fruit, groundLumber, freeMetals and Map
- the map drops gems, Gems, Any, Metal, Food and Wood
- tokens, Feyimp, Goblimp, Flutimp, Chronoimp and Jestimp

## Still missing

1. **Map enemies that drop resources show "No loot."** This is a bug in the parked version. Many regular map enemies drop resources (Chickimp, Grimp, Golimp, Platypimp and others; see the `loot` functions in `game.badGuys`, config.js). Some pick a resource at random (Golimp, Platypimp), so those should list each option.
2. **U2 mutated enemy extras:**
   - Mutated seeds: the SeedsInfo mod has the math. Copy it rather than linking the mods, so each still works alone.
   - Nullifium from Rage enemies with the Ragiffium mutator.
   - Resources from Randomized (Swapper) enemies with RandLoot or RandLoot2.
   - Scruffy experience from Nova enemies with NovaScruff.
3. **Spire cells:** `giveSpireReward` per cell, and the Spire metal drop during a real Spire run.
4. **The rest of the Void Map reward:** the heirloom drop (one per stacked map) and the bonus Magmite from Quick Gen.
5. **The Battle Territory Bonus amount** (fiveTrimpMax): only its name shows.
6. **Seasonal imps**, like the Pumpkimp.
7. **The Omnipotrimp's extra reward on every fifth zone** (`world % 5 === 0`): not looked into yet.

## Improvements to consider

- **Item names:** some come from the internal key ("Supershield") rather than a display name.
- **Rewards per zone:** Fluffy experience and Magmite come from clearing a zone, not a single cell. If they're wanted, they belong somewhere other than a cell tooltip.
- **Scope:** decide whether every cell needs a tooltip at all, or only cells with a reward. A smaller version could cover only helium and items, or work as a hotkey or a box like VoidsInfo.

## Picking it up again

The patch is made against `Nice Features/nice-features.js` at commit `d1c9d0c`, before the mod was renamed to Toolbelt (`Toolbelt/toolbelt.js`). It takes the version to 1.9.0. It no longer applies as it is: the file has moved and changed since. Apply it by hand, or check out `d1c9d0c`, apply it there with

```
git apply "Ideas/cell-rewards.patch"
```

and carry the result over. The cell rewards section is one block, plus small edits to the header, `FINGERPRINTS`, the option list, `decorateGrid`, `EFFECT_WHEN_OFF` and `start()`. Then check the fingerprints still match the game version, and test in the browser copy before installing in Steam.
