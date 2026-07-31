---
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

Keep top components such as enemy HP bars attached to scaled sprites when
transparent frame bounds are still loading or cannot be scanned.

Respect each enemy skill cooldown inside combos and choose varied special
attacks that fit the current target distance.

Let enemies choose among every learned skill, normal attacks, and contextual
repositioning. Projectile and area skills now respect their targeting metadata,
and optional structured AI logs explain each server-authoritative decision.

Preload Studio skill impact and projectile media so enemy skills render their
configured animation on the first use. Resolve reactive skill presentation
and impact metadata before client transfer, consume their reactive SP and hit
rate values, and play ranged skills as casts.

Unwrap reactive skill combat values before RPGJS evaluates damage formulas, so
enemy skills apply their configured power instead of resolving to zero damage.

Remove the caster animation control from the Studio skill editor while keeping
existing skill records compatible at runtime.
