---
"@rpgjs/client": minor
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/testing": minor
"@rpgjs/tiledmap": patch
---

Add server-authoritative custom gameplay rooms with registered room paths,
session-preserving player transfers, synchronized client room state, and
CanvasEngine scene adapters that run independently of maps and map physics.
Room providers also accept concrete `RpgGameplayRoom` subclasses with their
typed constructor context, so strict TypeScript applications can register them.
Returning from a custom room now waits for a fresh map-stream packet before
remounting the map component and keeps the room scene visible until that data
is ready. Map components are also gated on non-null render data, preventing
stale or incomplete values from reaching CanvasEngine presets.
