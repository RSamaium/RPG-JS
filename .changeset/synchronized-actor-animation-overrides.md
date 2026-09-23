---
"@rpgjs/studio": patch
---

Synchronize resolved actor combat animations to clients, preserving actor
overrides for predicted attacks and casts across map loads. Read synchronized
animation references at playback time and retain project defaults only until
authoritative actor presentation is available.

Resolve the project main actor when character selection is disabled, so its
attack and cast overrides take precedence over inherited project animations.
