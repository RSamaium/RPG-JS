---
"@rpgjs/studio": patch
---

Fix: the conditional branch on the player direction now reads the `direction` signal of the player, so it matches the direction the player is facing instead of never matching.
