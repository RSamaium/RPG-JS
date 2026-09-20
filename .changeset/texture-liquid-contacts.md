---
"@rpgjs/render-map2d": patch
"@rpgjs/studio": patch
---

Derive liquid contact colors from opaque pixels of the material's atlas region, with explicit fill-color fallback and no default blue or grey-white foam. Share palettes across Canvas and CPU renderers and honor border/foam settings.

Add opt-in static-element `submersion: { depth: 0.2 }`, preserved in direct loads and streamed chunks. Tint the lower alpha silhouette only where it intersects the actual liquid surface, including fill levels and erasures, after optional ground-shadow extraction. Cache palettes, liquid masks and composed element pixels by terrain revision without changing collisions or server authority.
