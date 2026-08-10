---
"@rpgjs/studio": patch
---

Reduce Studio terrain CPU usage by coalescing terrain asset loading, lazily rasterizing non-streamed chunks around the viewport, reusing morphology masks and filtered overlays across chunks, and rendering cropped water animations at a smooth capped frame rate. Keep the existing map loader visible until the initial terrain viewport has been rasterized and presented.
