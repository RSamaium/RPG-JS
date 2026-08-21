---
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
---

Fix Studio world-map transitions and preserve the reactive HUD state during
map transfers.

* Normalize scaled Studio world coordinates to integer pixels and resolve
  automatic transitions from exact directional neighbors.
* Keep explicit border-entry coordinates through map-room transfers instead of
  falling back to the destination map's `start` position.
* Restore Studio's generated class from every destination map database so a
  standalone session transfer keeps the player snapshot, including HP and SP,
  while deferring a runtime class until the destination database has loaded.
* Apply synchronized player parameters through their signal and keep the Studio
  HUD mounted so the avatar, HP, and SP remain reactive across map changes.
