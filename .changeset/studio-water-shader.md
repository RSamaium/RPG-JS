---
"@rpgjs/studio": minor
---

Draw the water animation of the terrain with a shader instead of 2D canvases redrawn on the CPU. Each region of water is one quad that shifts the surface in bands (refraction), adds the pale glow and is cut by the shape of the water; a frame only updates the phase, so the water moves on every frame and no longer costs a canvas redraw. Where no shader can be made, the water is drawn on the CPU as before, and the unseen wave lines (drawn with an alpha of 0) are no longer drawn.
