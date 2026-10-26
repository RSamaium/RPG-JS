---
"@rpgjs/studio": patch
---

Temporary, opt-in link with `@rpgjs/map-builder` (experimental). With `mapBuilderRenderer: true` in the global configuration of the client, the map elements that the map builder can draw (plain sprites: no shadow, light, liquid submersion or drawing rule) go through it; the others stay on the Studio renderer. Off by default, and nothing is loaded when it is off. Also keeps spec files out of the declaration build, which failed since the reference snapshots spec was added.
