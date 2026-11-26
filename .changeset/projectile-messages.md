---
"@rpgjs/server": patch
"@rpgjs/client": patch
---

Projectile messages follow the sync rate of the map instead of the number of shots (#520). `map.projectiles.emit()` no longer sends a message right away: spawns, impacts, updates and destroys are queued and sent once per sync interval (`throttleSync`, 50 ms by default; every step when the map has no throttle). With 110 shots per second, a map sends about 38 projectile messages per second instead of 193, and half the bytes before compression; most messages now pass the compression threshold.

- A shot is drawn up to one sync interval later than before.
- A projectile that stops on its hit sends its impact once, in its destroy entry. The client calls `projectiles.onImpact` from there.
- A spawn leaves out the values that are the defaults of the client (`delay: 0`, `index: 0`, `count: 1`, a plain linear `trajectory`), and rounds `direction` to 5 decimals and `origin` to 2.
