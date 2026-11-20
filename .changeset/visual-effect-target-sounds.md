---
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
---

`map.playVisualEffect(position, effect, options)` takes a `target` (the map pixels the effect aims at: its emitters with `pathSpace: "target"` or `at: "target"` go there), the tuning of the preset (`color`, `intensity`, `sizeScale`, `speedScale`), a `delay` and `sounds` played on its timeline. The projectile looks take a preset of their own: `trailFx` and `impactFx` accept `{ preset, color, ... }` besides a preset name, and `shape: "none"` draws a projectile made only of its particles.
