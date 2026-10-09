# RPGJS Playground

The playground is a launcher for independent gameplay demos. Each game owns its
source files, assets, RPGJS configuration, build, and runtime. The launcher
discovers demos from `playground/games/*/playground.config.json`.

## Layout

The launcher displays the game list on the left and loads the selected game in
an iframe on the right. Selecting a game updates the URL with `?game=<id>`, so a
specific demo can be shared directly:

```txt
http://localhost:5174/?game=projectiles
```

## Run

```bash
pnpm playground
```

Open the launcher at `http://localhost:5174/`, then select a game in the left
navigation. The selected game runs in the iframe on the right. The launcher
starts each game dev server for you:

- Action Battle: `http://localhost:5180/`
- Projectiles: `http://localhost:5181/`
- Studio: `http://localhost:5182/`
- Tiled Maps: `http://localhost:5183/`
- V4 Compatibility: `http://localhost:5184/`
- Vue GUI: `http://localhost:5185/`
- Mouse Interactions: `http://localhost:5186/`
- Dash: `http://localhost:5187/`
- Pressure Plate: `http://localhost:5188/`
- Pixel Chat: `http://localhost:5189/`
- Farm Hotbar: `http://localhost:5190/`

Run a game directly when you only want one server:

```bash
pnpm --dir playground dev:action-battle
pnpm --dir playground dev:hotbar
pnpm --dir playground dev:mouse-interactions
pnpm --dir playground dev:pressure-plate
pnpm --dir playground dev:projectiles
pnpm --dir playground dev:studio
pnpm --dir playground dev:tiled
pnpm --dir playground dev:v4-compat
pnpm --dir playground dev:vue-gui
```

## Add a Gameplay

Create a new folder in `playground/games/<game-id>` with its own project files:

```txt
playground/games/my-gameplay/
  package.json
  vite.config.ts
  playground.config.json
  src/
  public/
```

Add `playground.config.json`:

```json
{
  "id": "my-gameplay",
  "title": "My Gameplay",
  "description": "Short description shown in the launcher.",
  "tags": ["combat", "ai"],
  "modes": ["standalone"],
  "port": 5182
}
```

Use a unique `port` for each game. The current reserved ports are:

- `5174`: launcher
- `5180`: Action Battle
- `5181`: Projectiles
- `5182`: Studio
- `5183`: Tiled Maps
- `5184`: V4 Compatibility
- `5185`: Vue GUI
- `5186`: Mouse Interactions
- `5187`: Dash
- `5188`: Pressure Plate
- `5189`: Pixel Chat
- `5190`: Farm Hotbar

The game Vite config should read the port from `playground.config.json`:

```ts
import { defineConfig } from "vite";
import { rpgjs } from "@rpgjs/vite";
import startServer from "./src/server";
import playgroundConfig from "./playground.config.json";

export default defineConfig({
  server: {
    port: playgroundConfig.port,
    strictPort: true,
  },
  plugins: [
    ...rpgjs({
      server: startServer,
      entryPoints: {
        mmorpg: {
          client: "./src/client.ts",
          server: "./src/server.ts",
        },
      },
    }),
  ],
});
```

After that, `pnpm playground` will automatically:

- discover the game
- add it to the left navigation
- start its dev server
- load it in the iframe when selected

No launcher TypeScript file needs to be edited for a normal new game.

## Build Checks

Build the launcher:

```bash
pnpm --dir playground build
```

Build a game:

```bash
pnpm --dir playground/games/my-gameplay build
```

The launcher build generates `src/generated-games.ts` from the JSON configs.
That file is ignored by Git and should not be edited manually.

## Independence Rule

Games should stay independent from one another. Shared behavior belongs in RPGJS
packages or a reusable module, not in another playground game.
