---
"@rpgjs/server": minor
"@rpgjs/script": minor
---

Module hooks `event.onProjectileHit` and `player.onProjectileHit` can reply `"pass"`, `"stick"` or `"stop"` (returned at once, not from a promise) to decide what the projectile does; the first module that replies wins and the event's own `onProjectileHit` has the last word.

Scripts: `event.projectileHit` and `player.projectileHit` take the same replies. Only a listener that answers at once can reply: it reads the payload and the handles and calls only the methods that read, now marked `sync` in the API description (`getVariable`, `hasItem`, `getEvent`...). A listener that waits still runs as an observer. Script core: `SignalDesc.reply`, `MethodDesc.sync`, `SignalRegistry.emitSync`, `Program.runSync` and `ScriptService.emitSync`; a binding declares `reply: true` for a hook that asks before acting.
