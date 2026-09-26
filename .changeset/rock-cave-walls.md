---
"@rpgjs/studio": patch
---

Render Studio walls with `wallStyle: "rock"` as stratified rock faces with a rock rim and a floor contact shadow, as used by dug caves. Wall faces now match the Studio map editor: they are extruded straight, their sides come from the wall's own sides, and face parts over an opaque wall top are no longer drawn, which removes stray lines along cave and room sides.
