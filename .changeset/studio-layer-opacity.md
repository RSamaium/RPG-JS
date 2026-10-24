---
"@rpgjs/studio": patch
---

A Studio map can be drawn with some of its layers see-through: `updateData({ layerOpacity: { terrain: 0.4, elementsLow: 0.6 } })` (from `registerStudioMapExtension`) sets the opacity, from 0 to 1, of the `terrain`, `elementsAlwaysLow`, `elementsLow` and `elementsHigh` layers. A layer that is not named stays opaque, and characters and events are never affected.
