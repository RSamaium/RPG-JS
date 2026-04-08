When an API is added on the client-side or server-side, be sure to update the documentation to explain how to use it.

If you use @signe/room package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/room/readme.md
If you use @signe/reactive package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/reactive/readme.md
If you use @signe/sync package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/sync/readme.md
If you use @signe/di package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/di/readme.md

If you're using CanvasEngine as a library to create components (*.ce file), the complete table of contents for the documentation is available at the following link: https://canvasengine.net/llms.txt. You can use `curl` to fetch the table of contents and then navigate to the relevant Markdown pages to code the components correctly.

## Cursor Cloud specific instructions

### Project overview

RPG JS v5 is a pnpm monorepo (`pnpm@10.25.0`, Node 22+) for building RPG/MMORPG games. Key workspace areas:

- `packages/` — core libraries (physic, common, client, server, vite, tiledmap, action-battle, studio, etc.)
- `samples/sample-dev/` — primary development sample app (Vite-based RPG game)
- `samples/sample-tiled/`, `samples/sample-studio/` — additional sample apps

### Running commands

| Task | Command | Notes |
|------|---------|-------|
| Install deps | `pnpm install --no-frozen-lockfile` | `.npmrc` references `NPM_AUTH_TOKEN`; ignore the warning if not publishing |
| Run tests | `pnpm test -- --run` | Vitest; 42 test files, all in `packages/` |
| Dev server (sample-dev) | `cd samples/sample-dev && npx vite` | Starts on port 5173 (or 5174 if 5173 is busy); includes WebSocket RPG server |
| Build (sample-dev) | `cd samples/sample-dev && npx vite build` | Output in `samples/sample-dev/dist/` |
| Build all packages | `pnpm run build` | Sequentially builds all workspace packages |

### Caveats

- TypeScript `tsc --noEmit` on `sample-dev` will report errors from `.tsx` tiled map data files (e.g. `[A]Dirt_pipo.tsx`). These are Tiled map XML/data files with `.tsx` extensions, **not** TypeScript source. The Vite build handles them correctly via the `tiledMapFolderPlugin`.
- The `.npmrc` contains `${NPM_AUTH_TOKEN}` — this is only needed for publishing. `pnpm install` will warn but succeed without it.
- The root `npm run dev` starts **all** packages in watch mode (long-running). For focused work on `sample-dev`, run `npx vite` directly in `samples/sample-dev/`.
- Port 5173 may already be in use; Vite auto-increments to 5174. Check terminal output for the actual port.