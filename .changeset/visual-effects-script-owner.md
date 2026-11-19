---
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
"@rpgjs/script": minor
---

`map.playVisualEffect(position, effect, options?)` plays a one-shot particle effect for the players of the map: a built-in preset by name, or a resolved particle preset (the payload of a Studio Visual Effect) with `options.preset`. The client registers the `rpg:visual-effect` component animation (the CanvasEngine `Fx` preset) by default.

Scripts: `$map.playVisualEffect({ effect, at, preset?, duration?, scale? })`, and `$map.launchProjectile` takes `owner: "player"` so the player of the script launches the projectile: it flies through them, and `projectile.end` and `event.projectileHit` fire for them.
