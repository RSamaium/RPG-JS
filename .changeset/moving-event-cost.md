---
"@rpgjs/physic": patch
"@rpgjs/common": patch
---

A moving event costs less on the server (#516). During a world step, the position handlers of an entity (`entity.onPositionChange`) are called once, after the collision resolution and with the final position, instead of once per move of the integrator and of the resolver. Outside a step (`teleport()`, `notifyPositionChange()`), they are still called immediately. `World.getEntityByUUID()` reads an index instead of scanning every entity. The interpolation frames of a character (`_frames`) are no longer written to the room storage; they are still sent to clients.
