---
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/server": patch
---

Keep the camera attached when MMORPG streaming refreshes Tiled layers and synchronize instant following with the rendered character position so the viewport cannot trail by one frame. Stabilize predicted movement by publishing finalized input batches only after their client physics step, applying every input from the same client tick in one authoritative server step, capturing the matching acknowledged position, ignoring delayed acknowledgements whose prediction history expired, routing local-player snapshots through prediction instead of applying them directly, and sharing the same movement idle window on both peers.
