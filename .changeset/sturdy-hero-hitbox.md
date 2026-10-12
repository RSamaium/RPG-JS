---
"@rpgjs/studio": patch
"@rpgjs/action-battle": patch
---

The hitbox of a Studio hero (actor) with a generated character now follows the display scale of the character, like the hitbox of an event, instead of being as big as the cell of its image (it was 160x105 next to a 32x32 enemy). The default attack zones of Action Battle are anchored on the real hitbox of the attacker (centered on its body, pushed out of its edge in the facing direction) instead of assuming a 32x32 body.
