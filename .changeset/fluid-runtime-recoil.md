---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
---

Keep combat recoil authoritative across RPG and MMORPG runtimes. Prevent velocity accumulation, premature cancellation by idle or locked input, and replay of pre-impact positions. Synchronize the transient recoil phase, smooth its presentation, and release completed attack locks without restarting locomotion during an impact.
