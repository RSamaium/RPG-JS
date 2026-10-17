---
"@rpgjs/client": patch
---

Fix: the icons of the skills menu, of the hotbar and of the hotbar slot picker are no longer drawn at twice the size of their box. `DOMSprite` already fits the icon into its width and height with `objectFit="contain"`, the extra `scale={2}` doubled it (the icon covered the skill name in the skills menu and was cropped in the hotbar).
