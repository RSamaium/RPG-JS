---
"@rpgjs/studio": patch
---

Scope Studio player initialization and starting database records to the joined
map project so multi-project Workers do not leak global project configuration.
