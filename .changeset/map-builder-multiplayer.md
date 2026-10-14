---
"@rpgjs/map-builder": minor
---

Add multiplayer to `@rpgjs/map-builder` (experimental, private): an authority that decides and tells everybody, and a client that asks and follows. Independent of any framework: `/protocol`, `/authority`, `/remote`.

- `createMapAuthority`: holds the truth of a map, runs the same pipelines the clients preview with, broadcasts every change in order, catches late clients up from a log (or a snapshot), and gives the ids of what is placed. Clients ask with intents; patches are only accepted from clients it trusts.
- `remoteCommitter` and `joinRemoteMap`: a model whose changes are decided by the authority, with timeouts, detection of holes in the revisions, repeated and invalid messages ignored, and a snapshot that replaces the whole state (`MapChange.reset`).
- Persistence: `MapStore`, `memoryMapStore`, `restoreMapAuthority` (snapshots, a log, replay, and a refusal of a log with a hole).
- New steps for a shared world: `ownerOnly`, `rateLimit`, `protectedZone`. `PipelineContext` gains `preview` and `scene`.
- A validated message protocol and `connectInMemory` to link a client and an authority without a network.
- `placement` no longer chooses the id of what it places: the one who resolves the intent does, so two players cannot pick the same.
