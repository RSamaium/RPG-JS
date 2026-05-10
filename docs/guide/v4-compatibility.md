---
title: "V4 Compatibility"
description: "Run an RPGJS v4 game structure with RPGJS v5 packages."
---

# V4 Compatibility

`compatibilityV4Plugin()` lets a project using the RPGJS v4 module layout run on the RPGJS v5 runtime.

The game code can keep the v4 structure. The migration point is the Vite configuration.

Install the v5 packages used by the compatibility layer, including `@rpgjs/tiledmap`, because Tiled is the default map runtime.

## Vite Configuration

```ts
import { defineConfig } from "vite";
import { compatibilityV4Plugin } from "@rpgjs/vite";
import path from "path";

export default defineConfig({
  plugins: [
    ...compatibilityV4Plugin({
      type: "rpg",
      tiledMapBasePath: "map"
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

Use `type: "mmorpg"` for a multiplayer project. In MMORPG mode, the plugin starts the RPGJS server transport during Vite development and injects a generated client entry.

`tiledMapBasePath` is optional and defaults to `"map"`. Tiled files are served from `/<tiledMapBasePath>` during development and copied to `dist/<tiledMapBasePath>` during production builds.

## Supported V4 Layout

The plugin reads `rpg.toml` or `rpg.json` and supports the v4 module conventions:

```txt
src/modules/main/
  client.ts
  server.ts
  player.ts
  sprite.ts
  scene-map.ts
  maps/
  worlds/
  events/
  database/
  gui/
  sounds/
  characters/
  spritesheets/
```

It also supports `modulesRoot`, `modules`, `start.map`, `start.graphic`, `start.hitbox`, `spritesheetDirectories`, and the v4 flagged imports: `client!`, `server!`, `rpg!`, `mmorpg!`, `production!`, and `development!`.

The official v4 starter layout is also supported. A project can keep a root module such as `main/` and a config like:

```toml
modules = ['./main', '@rpgjs/mobile-gui', '@rpgjs/default-gui', '@rpgjs/gamepad']

[start]
map = 'simplemap'
graphic = 'hero'
hitbox = [16, 16]
```

The legacy starter modules are mapped automatically: `@rpgjs/mobile-gui` uses the v5 mobile GUI helper, while `@rpgjs/default-gui` and `@rpgjs/gamepad` are treated as compatibility no-ops because their behavior is built into v5.

## Example

See `samples/sample-v4-compat` for a minimal v4-style project running on the v5 packages. The sample keeps the v4 module layout and only uses `vite.config.ts` to enable `compatibilityV4Plugin()`.

## Tiled Files

Tiled Map Editor is the default map loader. The generated client config uses `provideTiledMap({ basePath: "map" })`, and the generated server config uses `provideTiledMap()`.

Files ending in `.tmx`, `.tsx`, and `.world` are handled as V4 assets. Images referenced by Tiled tilesets are copied as well. The plugin supports the documented autoload roots:

```txt
[module-name]/maps/
[module-name]/worlds/[maps-directory]/
[module-name]/worlds/[world-name].world
```

If a `.tmx` file has a `.ts` file with the same name, the `.ts` map module is used and the `.tmx` file is not auto-registered as a map. Tiled world entries such as `maps/simplemap.tmx` are normalized to the map id `simplemap`.

## Limitations

This plugin is a compatibility layer for project structure and build conventions. New v5 APIs should still be added through normal v5 modules when you start migrating the game code.
