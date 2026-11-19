# MMORPG publication

## Publish the current project

`POST /api/mmorpg/publish` publishes the project selected by the authenticated
Studio session. This route uses the Studio project cookie; it is not an API-key
content-management route.

The server prepares every project map before it sends the first update to the
MMORPG Worker. A local preparation failure therefore does not partially update
the remote world. Map and world updates are then sent sequentially.

Project, map, media and database reads are deduplicated within each publication.
Preparation receives independent copies, and the cache is discarded between
publications so later edits are visible. The publisher uses the same RPGJS
release versions as the MMORPG runtime, including Studio rc.8's compact terrain
collision preparation.

Without `MMORPG_PUBLICATIONS`, this endpoint still updates every map room.
The authorized local Studio integration uses that private R2 binding to upload
immutable snapshots and activate them through the framework API from issue #374.
It consumes a locally packed framework build; production awaits an official RC.
Success keeps the same response and means activation, not completed propagation.

### Success

Status: `200`

```json
{
  "gameUrl": "https://mmorpg.game.example.com/?game=project-1",
  "projectId": "project-1",
  "startMapId": "map-a",
  "publishedMapIds": ["map-a", "map-b"]
}
```

The playable URL intentionally contains only `game`. An MMORPG has no title screen:
without `map` the player enters straight on the map they were on (their saved
progress) or on the project's start map. There is no new-game character selection
(it belongs to the title flow of the Studio plugin, which the MMORPG does not use).

### Studio publication history

`GET /api/mmorpg/publications` returns the latest 50 publication attempts of the
selected project, newest first, as `{ "publications": [...] }`. Each entry has:

- `id`: unique entry id.
- `status`: `success` or `failed`.
- `mode`: `legacy` (map and world updates sent to every room) or `r2` (private
  `MMORPG_PUBLICATIONS` binding present).
- `createdAt`: ISO 8601 date of the attempt.
- `authorId`: Studio user who published, when known.
- `mapIds`: the maps of the attempt (the published maps on success, every project
  map on failure).
- `revision` and `manifest` (successful `r2` entries only): the activated revision
  (integer) and the SHA-256 of its manifest in the R2 bucket. Identical
  republication returns the same pair. If the coordinator answer cannot be read, only
  `manifest` (the uploaded one) is recorded. Legacy and failed entries have neither,
  and the publish response does not contain them.
- `error` (failed only): `code` (same values as the publish route), `stage`,
  and optional `resourceId`, `upstreamStatus`, `upstreamRequestId` (Cloudflare
  `cf-ray`) and `payloadBytes`. It never contains the shared secret nor the
  upstream response body.

A failed publication is also sent to Sentry through `captureException` with the
tags `operation`, `errorCode`, `projectId` and `stage`, and the history entry `id` as
`publicationId` in the extra data. A successful publication reports nothing.

Entries live in the `mmorpg_publications` collection, indexed by `projectId` and
`createdAt`. The history is a trace: if writing an entry fails, the error is
reported to the logger (`operation: "mmorpg-publication-history"`) and the
publication result is unchanged. Publications made before this feature have no
entry.

### Studio publication status

`GET /api/mmorpg/publication` uses the same authenticated project selection as
the publish route. It returns `{ "published": false }` before the first
successful publication, or `{ "published": true, "gameUrl": "..." }` afterward.
Studio records the URL only after the publication request succeeds. The game
button uses this status; older projects need one new publication to initialize it.

### Publication failure

```json
{
  "message": "A map could not be prepared for MMORPG publication",
  "code": "MMORPG_PREPARATION_FAILED",
  "stage": "prepare-map",
  "resourceId": "map-b"
}
```

The public error fields are:

- `code`: `MMORPG_PREPARATION_FAILED`, `MMORPG_UPSTREAM_FAILED`, or
  `MMORPG_PUBLICATION_FAILED`.
- `stage`: `prepare-map`, `publish-map`, `publish-world`, `publish-version`, or `publication`.
- `resourceId`: the affected map or world identifier when known.
- `message`: a safe summary. Internal exception details and credentials are
  never returned.

Preparation and unexpected failures return `500`. A map or world update rejected
by the MMORPG Worker returns `502`.

Server-side error context additionally records `payloadBytes` (UTF-8 request
body size) and `upstreamRequestId` (the upstream `cf-ray` header when present).
Use the latter to correlate the failed update with Cloudflare Worker logs.
These diagnostics are not added to the public response. Upstream response
bodies are not logged, because they may contain private runtime details.

### Framework versioned publication (pending release and Studio integration)

The framework implementation for issue #374 adds `prepareRpgPublication` and
`RpgPublicationDurableObject` in `@rpgjs/server/cloudflare`. Enable the Worker's
`publication: { bucket, coordinator }` option with private R2 and a new SQLite
Durable Object namespace. Upload complete prepared maps and shared configuration,
then activate the returned manifest with authenticated
`POST /publications/:projectId/activate` and `{ manifest, expectedRevision }`.
`GET /publications/:projectId` reports the active head and room acknowledgements.
Only occupied rooms are notified; other rooms load their version on entry.

Studio's `MMORPG_PUBLICATIONS` integration (local test environment and preproduction,
bucket `rpgjs-mmorpg-publications-preprod`) calls this framework API from the
authenticated endpoint above. Production still uses the legacy publication. Bootstrap, media and
custom loaders must also use published data to avoid reading mutable drafts.
See `docs/advanced/versioned-cloudflare-publication.md` in the RPG-JS repository
for bindings, authentication, payload splitting, retirement and retry semantics.

## Players of the project

`project.playerAccounts.enabled` (boolean, default `false`, Settings → Players) says that a
player must sign in to play. `GET /api/game/project` always returns `playerAccounts: { enabled }`
as a boolean and nothing else of that object. The sign-in screen (`rpg-account` of
`@rpgjs/account`) is configured in `project.menus.account.settings`: `title`, `subtitle`,
`backgroundMusic`, `backgroundImage` (all nullable); `menus.account.guiId` is stored but a custom
GUI does not replace the screen yet.

The accounts of the players are the SigneStack project users (`users` collection scoped
by `projectId`), managed under `/api/users` for the project selected by the `projectId`
cookie, owned by the authenticated Studio account, with the `users.*` permissions.
`GET /api/users/list` returns `{ data, meta }`; `POST /api/users` invites a player;
`POST /api/users/ban` and `/unban` ban and unban. There is no public registration
(`allowPublicRegistration: false`). `JWT_SECRET` signs their sessions; without it only
these routes fail. The Studio shows them in Database → MMORPG → Players. See
`docs/project-players.md` in the Studio repository.

### Dashboard of the project (Studio session only)

`GET /api/mmorpg/dashboard` answers `{ world: { available }, online, accounts, publication }` for the selected
project: `online` (`count`, `players` with `playerId`, `userId?`, `email?`, `name?`, `map: { id, name? }`, `since`,
and `byMap` with `mapId`, `name?`, `count`) is `null` when the world of the project on the game Worker cannot
tell; `accounts` is `{ enabled, total, banned, pendingInvitations }`; `history` is `{ intervalMs, points: [{ t, count }], peak }` (players online per slice of five minutes over
the last 24 hours, `null` when the world cannot tell); `maps` lists the project maps with their
place in the world (`id`, `name?`, `x?`, `y?`, `width?`, `height?`); `publications` are the latest five
history entries, newest first. Owner of the project with the Studio session only (`403` otherwise): not for API keys, since it
contains personal data. Not cacheable. See `docs/mmorpg-world.md` in the Studio repository.

`GET /api/users/list` also gives each player `online` (boolean) when the world of the game can tell, and accepts
`online=true|false` to filter. It answers `503` for a filter when the world cannot tell, and rows have no `online`
field in that case. See `docs/project-players.md` in the Studio repository.

### Chat (Studio session only)

The MMORPG game uses `@rpgjs/chat` with the channels `map` and `global` (180 characters). The world of the project
moderates it: `GET /api/mmorpg/chat?limit=` answers `{ enabled, available, messages, muted }` (`enabled` is `false` when the
owner turned the chat off with `project.menus.chat.enabled` (`{ enabled: boolean }`, on by default, GUI page of the Studio,
entry Chat: no chat on the client, every message refused by the server); messages newest first over the
last 24 hours, at most 200; `muted` is `[{ userId, email?, since }]`; `available` is `false` when the world cannot tell),
and `POST /api/mmorpg/chat/mute` with `{ userId, muted }` mutes or unmutes an account of the project (`404` for an
account of another project, `400` invalid, `502` game unreachable). Owner of the project with the Studio session only
(`403` otherwise): not for API keys. A muted account cannot speak, online or not; players without account cannot be muted.
See `docs/mmorpg-world.md` in the Studio repository.

The owner can also speak and delete (Studio session only): `POST /api/mmorpg/chat/say` with `{ text (1 to 180), target:
{ type: "world" } or { type: "maps", mapIds } }` answers `{ id, delivered }` (`404` for a map of another project, `400`
invalid, `502` game unreachable), and `DELETE /api/mmorpg/chat/messages/:id` answers `{ deleted, notified }`. Messages of the
owner come back in `GET /api/mmorpg/chat` with `admin: true` and `maps: [{ id, name? }]`. The game shows them with an Admin tag
and drops a deleted message from the screens of the players.

