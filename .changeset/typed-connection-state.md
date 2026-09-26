---
"@rpgjs/server": patch
---

Type connection state as deeply immutable data with the new `RpgConnectionState<TState>` type, used by `RpgRoomConnection` and `RpgHostedRoomConnection`. Node rooms from `@signe/room` are now assignable to `RpgHostedRoom` without casts (requires `@signe/room` 3.2.1).
