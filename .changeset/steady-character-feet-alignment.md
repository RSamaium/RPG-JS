---
"@rpgjs/studio": patch
"@rpgjs/client": patch
---

Align the animations of a Studio character on its feet. Each direction of an animation is now calibrated on the median pose of its frames (height and feet position) instead of its first image, and a frame can carry a `footAnchor` that the client puts on the bottom center of the hitbox. Switching between stand and walk no longer shifts or resizes the character. A warning is logged when the pixels of a sheet cannot be read.
