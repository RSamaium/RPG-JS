---
"@rpgjs/client": patch
---

Render the camera on whole pixels so the tilemap no longer shimmers when the camera follows an interpolated (fractional) position. Set `engine.cameraPixelSnap = false` to keep a fully fluid camera.
