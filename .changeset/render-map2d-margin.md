---
"@rpgjs/render-map2d": patch
---

`renderTerrainRegion` accepts an optional `margin`: the pixels computed around the requested bounds so that blends match a larger render. The default is unchanged (at least three tiles); a caller that knows its widest blend can pass less, which makes small regions several times cheaper (for example for live painting of a terrain mask).
