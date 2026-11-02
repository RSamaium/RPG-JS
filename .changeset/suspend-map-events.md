---
"@rpgjs/server": minor
---

Map events can be suspended and restored: `map.suspendEvents(filter?)` hides the events of a map (no sprite, no hitbox, no touch or action, no route) and keeps them, `map.resumeEvents(filter?)` puts them back where they were with their state (position, graphics, variables, self switches). Also `map.suspendEvent(id)`, `map.resumeEvent(id)`, `map.isEventSuspended(id)`, `map.getSuspendedEvents()` and, on an event, `event.suspend()`, `event.resume()` and `event.suspended`. A scenario event is suspended for its owner only, as only its owner sees it.
