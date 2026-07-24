---
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

Add composable boss phase helpers, delayed AI sequences, server action intents,
movement and teleport conveniences, and a generic server-driven AI visual
registry. Resolve animation callbacks into serializable visual packets so
Studio combat media are honored without cloning functions across rooms.

Add the Adventure combat preset with buffered player combos, authoritative
charged attacks, dodge invulnerability, attack multipliers, stronger Impact
visuals, enemy telegraphs, reuse of the existing RPGJS HUD and graphic-bound
HP components, contextual animated damage typography, skill-specific FX,
and optional mobile heavy-attack controls. `preset: "classic"` preserves the
previous combat and UI defaults.

Position transient component animations from numeric world coordinates and
derive component bounds from visible pixels for generated Studio spritesheets,
so telegraphs, damage popups, and HP bars stay anchored to scaled characters
without including transparent frame padding.
