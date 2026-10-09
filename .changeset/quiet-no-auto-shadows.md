---
"@rpgjs/common": patch
---

Lighting shadows are now opt-in: sprites, elements and terrain only cast a shadow when `lighting.shadows.enabled` is `true`. An active sun or a light spot no longer turns shadows on by itself (it put a harsh shadow on every character and made walking NPCs flicker).
