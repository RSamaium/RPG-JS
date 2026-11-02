---
"@rpgjs/action-battle": minor
---

Throw items from the hotbar. An item that declares an `action` is used through the combat flow instead of `useItem()`: it is aimed at the point sent by the client (an `arc` lands on it), removed from the inventory unless `consumable: false`, and can be assigned to the hotbar even when it is not consumable. `action.projectile` accepts the new projectile behaviors (`collide`, `pierce`, `wall`, `linger`), and `action.area` hits every target around a point through `map.queryArea()` and the combat flow, with damage falling off toward the edge (applied where a projectile ends). Action Battle projectiles also hit events that define `onProjectileHit`, without damage.
