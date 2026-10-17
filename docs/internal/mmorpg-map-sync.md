---
title: MMORPG Map Sync And Trust Model
description: Internal trust model and synchronization rules for MMORPG maps.
---

# MMORPG Map Sync And Trust Model

This document explains how map data is synchronized between client and server in RPG mode vs MMORPG mode, and why the trust model is different.

## Why This Exists

In standalone RPG mode, the client and server run in the same trusted process. In MMORPG mode, the client is untrusted and must not be allowed to authoritatively update map definitions.

Map definitions include:

- geometry and dimensions (`width`, `height`)
- events/NPC declarations
- world map topology (`worldMaps`)
- hooks and server-side map behavior

Allowing arbitrary clients to push this data is a security risk.

## Modes

## Standalone RPG

- `LoadMapService.load()` calls `UpdateMapService.update(map)` on the local bridge.
- The server is local/in-process, so this is a trusted path.
- This keeps map update fully automatic for local RPG development.

## MMORPG (Production)

- `UpdateMapService.update()` in MMORPG is intentionally a no-op.
- Gameplay clients cannot push `/map/update`.
- Authoritative map updates must come from a trusted backend source:
  - server bootstrap with `RPGJS_MAP_UPDATE_TOKEN`
  - admin tooling
  - editor pipeline with authentication/authorization

When `RPGJS_MAP_UPDATE_TOKEN` is set, `/map/update` only accepts trusted requests that send:

- `x-rpgjs-map-update-token: <token>`
- or `Authorization: Bearer <token>`

## MMORPG Dev With Vite

To keep development ergonomic without granting authority to clients:

- `@rpgjs/vite` server plugin initializes `map-*` rooms server-side.
- On room creation, the plugin performs a server-side `/map/update` call.
- The client does not perform map update requests.

This gives "auto update in dev" behavior while preserving the production trust boundary.

## Server-Side Dimension Fallback

During Vite auto-bootstrap, the plugin may only know `map.id`. In this case:

- bootstrap sends `width = 0`, `height = 0`
- `RpgMap.updateMap()` resolves dimensions from server world metadata (`worldMaps`) when available
- if no trusted dimensions exist, it falls back to default safe values

This keeps `autoChangeMap` consistent when world metadata is defined on the server.

## Change Map Transfer

Map transfer is still snapshot-based:

1. source map creates transfer snapshot
2. server emits `changeMap` with target map and `transferToken`
3. client reconnects using that token
4. target map restores player state

The transfer preserves player state; map definitions remain server authority.

## Movement Frames And Hidden Tabs

The server records every position change of a player or event as a timestamped
frame (`_frames`) and syncs them in batches. The client queues them on each
`RpgClientObject` (`frames`) and applies **one frame per render tick** through
`setBodyPosition`, which keeps remote movement smooth.

A hidden or frozen browser tab pauses the render loop but keeps receiving
packets. The queue then grows by hundreds of frames. After the tab is visible
again the client consumes one frame per tick while the server produces about
one per tick, so the queue never drains: remote players and NPCs replay their
old positions with a permanent delay.

Design choice: `mergeFreshFramePayload` caps the queue at `MAX_FRAME_BACKLOG`
(10 frames). When it is exceeded, only the newest frame is kept.

- Positions are absolute, so dropping stale frames loses no information; the
  object snaps to the current server position instead of replaying the past.
- The cap is applied when frames are merged, so it also bounds memory while the
  tab is hidden, without relying on `visibilitychange` (which does not cover a
  frozen tab or a slow render loop).
- 10 frames is about 0.2 s at 60 fps. In normal play the queue stays at or near
  0; Chrome measurements after an 18 s hidden tab gave a peak of 9 frames that
  drained in about 10 ticks. A higher cap (30) kept about one second of visible
  replay.
- The trade-off is that a network burst of more than 10 frames shows as a short
  snap instead of being smoothed. Raise the constant only if a game has very
  irregular latency, and re-measure the drain time after a hidden tab.

This applies to MMORPG mode. In standalone RPG mode the server runs in the page
and pauses with the render loop, so no backlog builds up.

## Operational Rule

Client gameplay traffic can move players, not redefine maps.
