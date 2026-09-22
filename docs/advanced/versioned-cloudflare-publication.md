# Versioned Cloudflare publication

The Cloudflare adapter can publish an immutable version of a project's prepared
maps without initializing every map room. Private source data lives in R2;
SQLite room storage keeps a compact version reference. A project coordinator
activates versions and notifies only affected rooms with connected players.

This is an opt-in **server-side MMORPG** capability. Standalone games and Node
servers retain their existing loading behavior. It does not execute uploaded
code, deploy modules, or change player save storage.

## Configure the Worker

```ts
import { createRpgServerWorker } from '@rpgjs/server/cloudflare';
import server from './server';
export {
  RpgServerDurableObject,
  RpgPublicationDurableObject,
} from '@rpgjs/server/cloudflare';

export default createRpgServerWorker(server, {
  binding: 'RPGJS_ROOMS',
  publication: { bucket: 'GAME_DATA', coordinator: 'PUBLICATIONS' },
});
```

Add a **private** R2 binding and a new SQLite Durable Object namespace. Existing
room namespaces and migration tags must be preserved; add a new migration tag
for the coordinator when upgrading an existing deployment.

```jsonc
{
  "r2_buckets": [{ "binding": "GAME_DATA", "bucket_name": "game-publications" }],
  "durable_objects": {
    "bindings": [
      { "name": "RPGJS_ROOMS", "class_name": "RpgServerDurableObject" },
      { "name": "PUBLICATIONS", "class_name": "RpgPublicationDurableObject" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["RpgServerDurableObject"] },
    { "tag": "v2", "new_sqlite_classes": ["RpgPublicationDurableObject"] }
  ]
}
```

Configure `RPGJS_MAP_UPDATE_TOKEN` as a Worker secret. Publication endpoints
always require it, even if `requireMapUpdateToken` is disabled for legacy map
updates. The trusted Studio/backend publisher is responsible for checking
which user may publish each project. Never put this secret in browser code.

When wrapping the generated Worker to serve assets, forward both `/parties/`
and `/publications/` requests to it. Configure one room router per Worker module,
matching the underlying Signe adapter's runtime configuration model.

## Prepare a version

Use `prepareRpgPublication` in a trusted Worker/backend with access to the same
bucket. It returns the manifest's SHA-256 digest, without activating it.

```ts
import { prepareRpgPublication } from '@rpgjs/server/cloudflare';

const manifest = await prepareRpgPublication(env.GAME_DATA, {
  projectId: 'my-game',
  startMapId: 'my-game-town',
  shared: {
    config: { _id: 'my-game', worldMaps: worldTopology },
    database: publishedDatabase,
  },
  maps: preparedMaps, // each contains id, width, height, events, data, hitboxes...
});
```

Input must be JSON data. Map dimensions are positive pixels. Project/map IDs use
letters, digits, `_` and `-` (1–200 characters). Map IDs must be globally unique
within a room namespace, matching existing `map-<id>` routing. Ownership is
claimed permanently on activation; another project cannot reuse that map ID.

Split `config` and `database` out of prepared map payloads into `shared`, and
remove publisher-only `worldUpdates`. For Studio, shared `config.worldMaps` is
the topology used by the Studio map module. Map payloads must already contain
all required server data. Each content hash is scoped to its project; shared
configuration/database content is stored once rather than once per map.

The helper uses canonical JSON and conditional R2 writes. Identical inputs
produce identical hashes. Consumers must not overwrite artifact/ownership keys
or publicly serve this bucket. Media URLs referenced by the publication should
also be immutable: this helper does not copy external image/audio files.

## Activate and inspect

Read the current head with authenticated `GET /publications/my-game` before
preparation. For the first publication, `head` is `null` and the expected revision
is `0`. Then submit:

```http
POST /publications/my-game/activate
Content-Type: application/json
x-rpgjs-map-update-token: <secret>

{"manifest":"<64-character SHA-256>","expectedRevision":0}
```

A successful response is `200` with `{ "revision": 1, "manifest": "..." }`.
Success means **activated**, not that every occupied room has applied it yet.
The coordinator validates every artifact before a transactional head update.
A changed head returns `409`; re-read status and explicitly decide whether to
rebuild/rebase the publication. Do not blindly retry with a newer revision.
Reactivating the current manifest is idempotent. An older manifest with a stale
expected revision cannot roll back a newer activation.

Status returns:

```json
{
  "head": { "revision": 2, "manifest": "..." },
  "rooms": [
    { "mapId": "my-game-town", "revision": 1, "failed": true, "retired": false }
  ]
}
```

`revision` is the room's acknowledged applied version; a lower revision means
propagation is pending. `failed` indicates a failed notification/application.
`retired` means the map was removed and its existing occupants retain the older
version. No manifest data or database is exposed by this status API. Untrusted
requests return `401`, invalid request schemas `400`, ownership/revision
conflicts `409`, and unavailable/invalid artifacts `503`.

## Room behavior

- Empty maps are not initialized by activation. First entry loads the current
  manifest and that map's source from R2 before normal connection hooks.
- Affected occupied rooms receive small private notifications. Unchanged maps
  are not reloaded when only other maps change. Shared data changes affect all
  occupied maps. Identical publications cause no reload.
- Pending notifications are persisted. Alarms process at most 16 rooms per
  batch, continue remaining batches promptly, and retry failures after 30 seconds.
  They stop once no work remains. A stale registration can cause one empty-room
  notification after an abrupt disconnect; it is removed without loading data.
- A room restart restores its source through its R2 reference. Connection and
  message hooks re-establish membership after runtime restoration; no background
  heartbeat wakes empty rooms. The Signe transport currently uses standard
  WebSockets; this feature does not itself enable WebSocket hibernation.
- New entrants to a removed map are rejected. Existing occupants keep the last
  applied version and can leave normally. Historical artifacts are deliberately
  retained, including versions still referenced by occupied rooms. There is no
  automatic garbage collection in this version.
- A failed application keeps the previous durable pointer and attempts to
  restore the prior runtime map. If restoration also fails, gameplay messages
  are rejected until a later propagation succeeds. Normal player state/save
  storage is not replaced by publication data.

Map load hooks must be safe to run again. External side effects performed by
custom hooks cannot be rolled back by this transport; put such operations
outside publication hooks or make them idempotent. Custom loaders and Studio
bootstrap/title/character-selection integrations must consume published data,
not read mutable authoring APIs. The adapter hydrates map sources exclusively
from R2, but cannot intercept arbitrary HTTP calls made by application modules.
Studio's API integration is a separate step after this package is released.

## Compatibility and validation

Without `publication`, authenticated `/map/update` and `/world/:id/update` keep
their current behavior. With it enabled, unclaimed maps still use the legacy
path. Once claimed by a project publication, direct map/world updates return
`409`; publish the project version instead. Existing legacy source data is
removed only after a new reference has been stored successfully.

Run unit/runtime tests with `pnpm exec vitest run packages/server/tests` and real
R2/SQLite/WebSocket tests with `pnpm --dir samples/cloudflare-mmorpg test:publication`.
Build `@rpgjs/server` first so the sample consumes the updated package artifacts.
