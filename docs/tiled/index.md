---
title: "Using TiledMap with RPG-JS"
description: "Guide for Using TiledMap with RPG-JS in RPGJS."
---

# Using TiledMap with RPG-JS

TiledMap integration allows you to use maps created with the [Tiled Map Editor](https://www.mapeditor.org/) in your RPG-JS games. This provides a visual way to design your game maps with layers, tilesets, collision detection, and interactive objects.

<Info>
Use `@rpgjs/tiledmap` when you want to build maps with Tiled Map Editor.

If you want your own renderer or your own map format, use [Custom map rendering with provideLoadMap](/advanced/provide-load-map).
</Info>

## Installation

First, install the TiledMap package:

```bash
npm install @rpgjs/tiledmap
```

## Runtime ownership

Tiled behaves differently according to the game mode:

- in standalone RPG mode, the browser loads the complete TMX and TSX files
- in MMORPG mode, the server loads the complete files and owns collisions, objects,
  events and properties; the browser receives only nearby render chunks and their
  static hitboxes for prediction

The MMORPG client never needs the raw TMX/TSX source. Keep secrets and gameplay
configuration in server modules rather than Tiled properties that must be rendered.

## Vite Configuration

Configure your `vite.config.ts` to handle Tiled map files:

```ts
import { defineConfig } from 'vite';
import { tiledMapFolderPlugin } from '@rpgjs/vite';

export default defineConfig({
  plugins: [
    tiledMapFolderPlugin({
      sourceFolder: './src/tiled',      // Folder containing your TMX files
      publicPath: '/map',               // Public URL path for maps
      buildOutputPath: 'assets/data',   // Build output directory
      // MMORPG: publish images only. The server/editor reads TMX and TSX privately.
      allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    })
  ]
});
```

### Plugin Options

- **`sourceFolder`**: Directory containing your TMX files, TSX tilesets, and images
- **`publicPath`**: URL path prefix for accessing map files (default: `/data`)
- **`buildOutputPath`**: Target folder in build output (default: `assets/data`)
- **`allowedExtensions`**: File extensions to include (default: `['.tmx', '.tsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']`)

Keep the default extensions for a standalone browser build. For an MMORPG, use
the image-only list above so neither development middleware nor `dist/client`
exposes TMX/TSX files.

## Client-Side Setup

Configure the client to use TiledMap:

```ts
import { provideClientGlobalConfig, provideRpg, startGame } from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import startServer from "./server";

startGame({
  providers: [
    provideTiledMap({
      basePath: "map"  // Must match publicPath in vite.config.ts
    }),
    provideClientGlobalConfig(),
    provideRpg(startServer),
    // ... other client providers
  ],
});
```

## Server-Side Setup

Configure the server to use TiledMap:

```ts
import { createServer, provideServerModules } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";

export default createServer({
  providers: [
    ...provideTiledMap({
      basePath: "/map", // Same image URL prefix as the client
      streaming: {
        chunkSize: 16,  // Tiled cells per chunk
        loadRadius: 2,  // Chunks sent around the authoritative position
        retainRadius: 3 // Chunks kept to avoid boundary churn
      }
    }),
    provideServerModules([
      {
        maps: [
          {
            id: "mymap",  // Map ID (should match TMX filename)
            // ... other map configuration
          }
        ]
      }
    ])
  ]
});
```

The server module is transport-neutral. The same configuration works inside the
Node.js room transport and inside a Cloudflare Durable Object. One map room owns
one authoritative map instance; Wrangler local development exercises that same
Durable Object path.

### Custom, Studio, and other map formats

Chunk streaming is not tied to Tiled. A map package can pair
`provideServerMapStreaming()` with `provideClientMapStreaming()`:

- the server compiler converts private source data into a public manifest and chunks
- every chunk supplies renderer data plus static collision geometry
- the client adapter incrementally applies and removes renderer data

Studio or a custom map system can therefore keep its complete document private and
choose its own chunk representation. Tiled currently supplies the built-in adapter;
other formats install their own pair of adapters.

## File Structure

Organize your Tiled files in the configured source folder:

```
src/
├── tiled/
│   ├── mymap.tmx          # Your Tiled map file
│   ├── tileset.tsx        # Tileset definition
│   ├── tiles.png          # Tileset image
│   └── objects.png        # Object sprites
└── ...
```

## Features

### Automatic Collision Detection

TiledMap automatically detects collision tiles and applies tile rules to physics:

- Set the `collision` property to `true` on tiles in Tiled Map Editor
- Collision rules are attached to entities through physics extension hooks
- The server always uses the complete collision map
- In MMORPG mode, the client predicts only with hitboxes from disclosed chunks
- No additional code required for basic tile blocking

A thin temporary boundary is added around the disclosed area, preventing prediction
from moving into a chunk whose physics has not arrived yet. Server reconciliation
remains authoritative.

### Event Integration

Place events in Tiled using point objects:

1. Create an Object Layer in Tiled
2. Add Point objects with names matching your event names
3. Events will be automatically positioned based on object coordinates

```ts
// In your server configuration
{
  maps: [
    {
      id: "mymap",
      events: [MyEvent()] // Event will be positioned from Tiled object
    }
  ]
}
```

### Map API Compatibility

When the server loads a Tiled map, `@rpgjs/tiledmap` attaches the CanvasEngine Tiled instance to `map.tiled` and exposes v4-compatible helpers on the map:

```ts
const layer = map.getLayerByName("Ground");
const index = map.getTileIndex(4, 2);
const origin = map.getTileOriginPosition(4, 2);
const tile = map.getTileByPosition(128, 64);

map.setTile(4, 2, "Ground", { gid: 12 });
map.updateTileset({ firstgid: 1, name: "base" });
```

Available properties and methods:

- `map.layers`
- `map.zTileHeight`
- `map.getLayerByName(name)`
- `map.getTileIndex(x, y)`
- `map.getTileOriginPosition(x, y)`
- `map.getTileByPosition(x, y, z?)`
- `map.getTileByIndex(tileIndex)`
- `map.setTile(x, y, layer, tileInfo)`
- `map.updateTileset(tileset)`

These helpers are available only for maps prepared by `@rpgjs/tiledmap`. For new code, prefer using `map.tiled` directly when you need CanvasEngine-specific behavior.

## Physics Hooks Integration

The tiled module now uses shared physics hooks:

- Server: `map.onPhysicsInit`, `map.onPhysicsEntityAdd`, `map.onPhysicsEntityRemove`, `map.onPhysicsReset`
- Client: `sceneMap.onPhysicsInit`, `sceneMap.onPhysicsEntityAdd`, `sceneMap.onPhysicsEntityRemove`, `sceneMap.onPhysicsReset`

This gives consistent tile collision behavior for both client prediction and server validation.
NPCs, players, events, and projectiles are synchronized by the same interest window:
a complete visual snapshot is sent on entry and removed on exit, while collisions and
impacts are still decided by the server.
