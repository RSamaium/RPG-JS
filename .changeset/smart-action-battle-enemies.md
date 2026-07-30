---
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

Keep top components such as enemy HP bars attached to scaled sprites when
transparent frame bounds are still loading or cannot be scanned.

Respect each enemy skill cooldown inside combos and choose varied special
attacks that fit the current target distance.

Remove the caster animation control from the Studio skill editor while keeping
existing skill records compatible at runtime.
