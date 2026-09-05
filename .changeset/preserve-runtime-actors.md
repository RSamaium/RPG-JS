---
"@rpgjs/server": patch
"@rpgjs/studio": patch
---

Preserve switched actors, chosen classes and progression when restoring Studio players. Persist parameter curve bounds and Studio initialization state, rebuild derived parameters instead of loading over their runtime signal, restore actor presentation without granting starting inventory again, and normalize Studio media and hitbox records for character selection. Apply combat animation bindings in changeActor.
