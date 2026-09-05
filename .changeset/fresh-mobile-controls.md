---
"@rpgjs/client": patch
---

Keep the mobile joystick connected across MMORPG streamed map updates by preventing retired character effects from overwriting live controls, continue repeating held movement without new pointer events, and preserve joystick power after direction changes.

Dispose the character controls effect through its underlying subscription so streamed player removal completes without a runtime error.
