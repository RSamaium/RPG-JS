---
"@rpgjs/studio": patch
---

Reduce animated terrain water rendering cost by copying only the pixels covered by each refraction band instead of redrawing the full terrain chunk for every band. Configure the Studio playground with a large animated-water map for local performance testing.
