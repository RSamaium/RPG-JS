---
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/physic": patch
"@rpgjs/server": patch
---

Keep the camera attached when MMORPG streaming refreshes Tiled layers. Stabilize predicted movement by pairing acknowledgements with their physics frame, preserving client tick spacing, and using the server clock for idle detection.
