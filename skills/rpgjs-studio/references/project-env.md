# Project environment variables

Use these endpoints to manage per-project environment variables in RPGJS Studio.
The API key identifies the project context for normal Studio API usage, but the
HTTP path still contains the target project id.

## List variables

```bash
curl -sS "$BASE_URL/api/projects/<projectId>/env" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

## Set a plain variable

```bash
curl -sS -X PUT "$BASE_URL/api/projects/<projectId>/env/GAME_MODEL" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"plain","value":"gpt-4.1-mini"}'
```

Plain variable responses include `value`.

## Set a secret variable

```bash
curl -sS -X PUT "$BASE_URL/api/projects/<projectId>/env/GAME_INTERNAL_API_KEY" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"secret","value":"sk_project_secret"}'
```

Secret responses never include the raw value. They expose `isSet` only. Never
print, log, or store raw secret values in `RPGSTUDIO.md`.

## Delete a variable

```bash
curl -sS -X DELETE "$BASE_URL/api/projects/<projectId>/env/GAME_MODEL" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

## Provider secrets

The global generation provider keys remain Cloudflare environment
bindings/secrets, not project env variables:

- `OPENAI_API_KEY`
- `FAL_KEY`
- `GEMINI_API_KEY`
- `REPLICATE_API_TOKEN`
