---
"@rpgjs/client": patch
---

Fix GUI and map rendering issues seen in the samples:

- Registering a GUI no longer remounts every displayed GUI. GUIs are keyed by a new `renderKey`, which removes the repeated title screen mounts and the `FocusContainer ... not found` warnings at startup.
- The map scene component keeps its last `data` until it is unmounted, so custom map components no longer read `undefined` during a map transfer.
- The built-in HUD stays hidden until the player enters a map and while the title screen is displayed.
