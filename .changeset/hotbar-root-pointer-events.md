---
"@rpgjs/client": patch
---

The hotbar no longer swallows the clicks meant for the game and for the other GUIs. Pixi sets `pointer-events: auto` on the element of every `DOMContainer`, which its full-screen root (`pointer-events: none`) lost to; the rule is now `!important`, as the notification GUI already does.
