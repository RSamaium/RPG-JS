# MMORPG publication

## Publish the current project

`POST /api/mmorpg/publish` publishes the project selected by the authenticated
Studio session. This route uses the Studio project cookie; it is not an API-key
content-management route.

The server prepares every project map before it sends the first update to the
MMORPG Worker. A local preparation failure therefore does not partially update
the remote world. Map and world updates are then sent sequentially.

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
- `stage`: `prepare-map`, `publish-map`, `publish-world`, or `publication`.
- `resourceId`: the affected map or world identifier when known.
- `message`: a safe summary. Internal exception details and credentials are
  never returned.

Preparation and unexpected failures return `500`. A map or world update rejected
by the MMORPG Worker returns `502`.
