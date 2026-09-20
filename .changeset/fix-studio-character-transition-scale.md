---
"@rpgjs/studio": patch
---

Restore idle scale after linked animations and preload all character animation images before exposing spritesheets to the game. Apply the same preparation to media objects and media IDs.

Normalize generated characters to a 128-pixel reference frame before applying their saved scale.

Match Character Editor's visible-height normalization across idle and linked animations, even when their saved scales have not been proportionally adjusted.

Apply the same parent normalization when combat plays a linked attack as a separate graphic.
