---
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/server": patch
---

Keep the camera attached when MMORPG streaming refreshes Tiled layers and synchronize instant following with the rendered character position so the viewport cannot trail by one frame. Stabilize predicted movement by publishing input acknowledgements only after their authoritative physics step, capturing the matching client step, ignoring delayed acknowledgements whose prediction history expired, and sharing the same movement idle window on both peers.
