---
"@rpgjs/studio": patch
---

Deduplicate Studio project, map, database, and media reads within each runtime provider. Cache in-flight and resolved requests by resource identifier, keep project and map lookup keys distinct, and evict failed requests so later calls can retry.
