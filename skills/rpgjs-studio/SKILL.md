---
name: rpgjs-studio
description: Use the RPGJS Studio HTTP API to create or manage a 2D RPG game. Trigger this skill when Codex needs to CRUD maps, map events, database records, media assets, or general project settings in RPGJS Studio, especially when the task should be done through `curl` or another HTTP client with an API key and configurable base URL.
---

# RPGJS Studio API Skill

Use this skill to execute content-management tasks against an RPGJS Studio instance.

## Inputs

- Check whether a local `RPGSTUDIO.md` file exists in the current working directory.
- If `RPGSTUDIO.md` exists, treat it as local project context and read it first.
- Use it to recover persistent values such as:
  - `BASE_URL`
  - `projectId`
  - any other project-specific instructions relevant to API usage
- If `RPGSTUDIO.md` does not exist, continue normally.
- Resolve `BASE_URL` from the user if provided.
- Default `BASE_URL` to `https://rpgjs.studio` when the user did not specify another host.
- Read the API key from the environment variable `RPGSTUDIO_API_KEY`.

## Mandatory startup workflow

1. Check whether `RPGSTUDIO_API_KEY` exists before any API call.
2. When checking `RPGSTUDIO_API_KEY`, never print its value in the terminal and never echo it back in the response.
3. If the variable is missing or empty, stop and tell the user to create an API key first on `${BASE_URL}/api-keys`, then export `RPGSTUDIO_API_KEY`.
4. Build authenticated requests with these headers:

```bash
-H "x-api-key:$RPGSTUDIO_API_KEY"
-H "Content-Type: application/json"
```

5. Prefer `curl` for HTTP calls. Use another HTTP client only if there is a clear reason.
6. Fail fast on authentication errors. If the API returns an invalid-key style response, `401`, or `403`, stop the task and tell the user to verify the key or contact support.
7. Read only the reference file that matches the user task:
   - `references/database.md`
   - `references/maps.md`
   - `references/events.md`
   - `references/event-examples.md`
   - `references/blocks.md`
   - `references/media.md`
   - `references/settings.md`

## Local memory file

Use `RPGSTUDIO.md` as a lightweight local memory file for the current project.

- Read it at the start if it exists.
- Reuse values already stored there instead of asking again.
- After the task, update or create it with stable, non-secret context discovered during execution.

Typical contents:

- last used `BASE_URL`
- current `projectId`
- project-specific conventions or notes useful for future calls

If `projectId` is still unknown after reading `RPGSTUDIO.md` and the current user request does not provide it:

1. Call the projects listing endpoint first.
2. Present a numbered list with:
   - project title
   - project identifier
3. Stop the workflow there.
4. Ask the user which project to select.
5. Resume the actual task only after the user chooses a project.
6. Persist the selected `projectId` in `RPGSTUDIO.md` so it does not need to be requested again later.

Never store secrets in this file.

- Do not store `RPGSTUDIO_API_KEY`.
- Do not print `RPGSTUDIO_API_KEY`.
- Do not copy raw secret values into logs, terminal output, or markdown.

## Request pattern

Define the base command once and reuse it:

```bash
BASE_URL="${BASE_URL:-https://rpgjs.studio}"
curl -sS \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

Use project listing when `projectId` is missing:

```bash
curl -sS "$BASE_URL/api/projects" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

For write operations, prefer:

```bash
curl -sS -X POST "$BASE_URL/..." \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Execution rules

- Start by identifying the resource domain, then load the matching reference file.
- Use REST semantics: `GET`, `POST`, `PUT`, `DELETE`.
- Resolve foreign keys before creation or update:
  - Search media with `/api/media?query=<search>`.
  - Search database records with `/api/database/:type?query=<search>`.
  - If a matching dependency exists, reuse its returned `_id`.
  - If not found, create it first, then continue with the returned `_id`.
- If `projectId` is missing, list projects, ask the user to choose one, and stop until they answer.
- When the user asks to create game objects, send the smallest valid payload first, then enrich it only if the task requires more fields.
- Reuse IDs returned by the API instead of guessing them.
- If an endpoint shape is uncertain, inspect the response from a nearby `GET` endpoint first and adapt from that live payload.
- Do not continue after an auth failure.
- If a missing dependency would require AI media generation, stop and ask the user whether to spend credits before calling a `/api/media/generate/...` endpoint.
- For `POST /api/maps/generate`, rely on `references/maps.md` for the AI map generation workflow and endpoint-specific failure behavior.
- Summarize the exact records created, updated, or deleted in the final response.
- When a task reveals stable project context such as `BASE_URL` or `projectId`, persist that context into `RPGSTUDIO.md` for future runs.

## Common checks

- `database` task: read [references/database.md](./references/database.md)
- `map` task: read [references/maps.md](./references/maps.md)
- `event` task: read [references/events.md](./references/events.md)
- `event example` task: read [references/event-examples.md](./references/event-examples.md)
- `event workflow block` task: read [references/blocks.md](./references/blocks.md)
- `media` task: read [references/media.md](./references/media.md)
- `settings` task: read [references/settings.md](./references/settings.md)
