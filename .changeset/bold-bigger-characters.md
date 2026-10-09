---
"@rpgjs/studio": patch
---

Studio characters are displayed 35% bigger by default (`STUDIO_CHARACTER_DISPLAY_BOOST`), to fit the size of the decor. The hitbox of an event with a generated character follows the same scale. Stand and walk are calibrated on the median pose of their frames, the other animations (attacks) on their first pose.
