When an API is added on the client-side or server-side, be sure to update the documentation to explain how to use it.

If you use @signe/room package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/room/readme.md
If you use @signe/reactive package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/reactive/readme.md
If you use @signe/sync package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/sync/readme.md
If you use @signe/di package, read with curl : https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/di/readme.md

If you're using CanvasEngine as a library to create components (*.ce file), the complete table of contents for the documentation is available at the following link: https://canvasengine.net/llms.txt. You can use `curl` to fetch the table of contents and then navigate to the relevant Markdown pages to code the components correctly.

## Cursor Cloud specific instructions

### Project overview

RPG JS v5 is a TypeScript monorepo (pnpm workspaces) for creating RPG/MMORPG browser games. No external databases or Docker services are required.

### Key commands

| Action | Command | Notes |
|---|---|---|
| Install deps | `pnpm install` | Run from workspace root |
| Build all packages | `pnpm build` | Sequential build via `tsx bin/build.ts` |
| Dev mode (watch) | `pnpm dev` | Parallel watch via `tsx bin/dev.ts` |
| Run tests | `pnpm test -- --run` | Vitest with jsdom; 42 test files, 417+ tests |
| TypeScript check | `cd packages/physic && npx tsc --noEmit` | No ESLint configured; TS is the lint layer |
| Run sample app | `cd samples/sample-dev && pnpm dev` | Starts Vite on http://localhost:5173 |

### Build order gotcha

The root `pnpm build` script (in `bin/config.ts`) builds 10 packages but **does not include `@rpgjs/vue`**. If you modify or depend on `@rpgjs/vue`, build it separately: `cd packages/vue && pnpm build`.

### .npmrc and build scripts

The `.npmrc` contains `//registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}` which produces harmless warnings when `NPM_AUTH_TOKEN` is unset. To allow native packages like `esbuild` and `sharp` to run their postinstall scripts, the `.npmrc` also needs `only-built-dependencies[]=esbuild`, `only-built-dependencies[]=sharp`, and `only-built-dependencies[]=workerd`. These are already configured.

### Testing notes

- Tests use `vitest` with `jsdom` environment. The root `vitest.config.ts` sets up aliases for workspace packages.
- `HTMLCanvasElement.getContext()` warnings are expected in test output (jsdom limitation, does not affect test results).
- One test file (`packages/server/tests/event.spec.ts`) is intentionally skipped.
