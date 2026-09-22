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

The playable URL intentionally contains only `game`. It omits `map` so the
MMORPG client runs the title screen and new-game character selection before
joining the project's start map.

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

Studio's local `MMORPG_PUBLICATIONS` integration calls this framework API from
the authenticated endpoint above. Production integration awaits a released package. Bootstrap, media and
custom loaders must also use published data to avoid reading mutable drafts.
See `docs/advanced/versioned-cloudflare-publication.md` in the RPG-JS repository
for bindings, authentication, payload splitting, retirement and retry semantics.
