---
"@rpgjs/studio": patch
"@rpgjs/client": minor
---

With a deferred connection (`provideMmorpg({ deferConnection: true })`), Studio no longer draws the title screen over the sign-in screen at start: it waits for the connection, then shows the title. The client engine gets `isConnectionDeferred()` and `isConnected()` for this.
