---
"@rpgjs/client": patch
"@rpgjs/ui-css": patch
---

Fix unnecessarily clipped dialogue choices by sizing short prompts from their complete text and giving choices the remaining fixed-height space. Keep scrolling for genuinely long lists.

Restore mouse and touch assignment in the hotbar slot picker by avoiding false HTML disabled attributes, preserving locked-slot guards and keyboard focus selection.
