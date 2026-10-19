---
"@rpgjs/studio": patch
---

Wait for the terrain walls (the mountains) before revealing a map, so they no longer pop in a few seconds after it, and make a terrain render wait for the chunks another render is already painting. A terrain worker request that is never answered now times out and falls back to painting on the page.
