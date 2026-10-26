---
"@rpgjs/server": patch
---

A map room has the default damage formulas from its construction, not only after a `/map/update` request. A room restored from storage (a `wrangler dev` reload, a room eviction) never received that request, so `damageFormulas` stayed empty and any hit on a player threw `Physic Formulas not exists`. The formulas published with a map still override the defaults.
