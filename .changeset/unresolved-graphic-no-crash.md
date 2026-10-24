---
"@rpgjs/client": patch
---

A player or event whose graphic id cannot be resolved to a spritesheet yet (for example `default_character` before the server applies the real graphic after joining a map) no longer crashes the client with `Cannot read properties of undefined (reading 'textures')`. The sprite is simply not drawn until an id resolves, and the rest of the scene and the GUIs keep working.
