---
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
"@rpgjs/testing": patch
"@rpgjs/tiledmap": patch
"@rpgjs/vue": patch
---

Establish the stable RPGJS-owned boundary for reactive gameplay properties,
dependency-injection providers, Node room storage, and Cloudflare room hosting.
Remove accidental Signe re-exports from the client and server roots, keep
direct Signe imports as an explicitly advanced plugin path, and protect every
published TypeScript entry with declaration reachability snapshots in CI.
