# Using TiledMap with RPG-JS

TiledMap integration allows you to use maps created with the [Tiled Map Editor](https://www.mapeditor.org/) in your RPG-JS games. This provides a visual way to design your game maps with layers, tilesets, collision detection, and interactive objects.

## Installation

First, install the TiledMap package:

```bash
npm install @rpgjs/tiledmap
```

## Vite Configuration

### Using V4 Compatibility Mode

If you're using **V4 compatibility mode** (`compatibilityV4Plugin`), the `tiledMapFolderPlugin` is **automatically injected** when a `src/tiled` folder exists in your project. You don't need to manually configure it in your `vite.config.ts`.

The plugin will be automatically configured with these default options:
- `sourceFolder: './src/tiled'`
- `publicPath: '/map'`
- `buildOutputPath: 'assets/data'`

### Manual Configuration

For projects not using V4 compatibility mode, you need to manually configure the plugin in your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { tiledMapFolderPlugin } from '@rpgjs/vite';

export default defineConfig({
  plugins: [
    tiledMapFolderPlugin({
      sourceFolder: './src/tiled',      // Folder containing your TMX files
      publicPath: '/map',               // Public URL path for maps
      buildOutputPath: 'assets/data'    // Build output directory
    })
  ]
});
```

### Plugin Options

- **`sourceFolder`**: Directory containing your TMX files, TSX tilesets, and images
- **`publicPath`**: URL path prefix for accessing map files (default: `/data`)
- **`buildOutputPath`**: Target folder in build output (default: `assets/data`)
- **`allowedExtensions`**: File extensions to include (default: `['.tmx', '.tsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']`)

## Client-Side Setup

**Important**: You **must** configure `provideTiledMap` on the client side, even if the Vite plugin is automatically injected in V4 compatibility mode.

Configure the client to use TiledMap:

```ts
import { mergeConfig } from "@signe/di";
import { provideClientGlobalConfig, provideRpg, startGame } from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";
import startServer from "./server";

startGame(
  mergeConfig({
    providers: [
      provideTiledMap({
        basePath: "map"  // Must match publicPath in vite.config.ts (or '/map' in V4 compatibility mode)
      }),
      provideClientGlobalConfig(),
      // ... other client providers
    ]
  }, {
    providers: [provideRpg(startServer)]
  })
);
```

> **Note**: The `basePath` must match the `publicPath` configured in the Vite plugin. In V4 compatibility mode, the default `publicPath` is `/map`.

## Server-Side Setup

**Important**: You **must** configure `provideTiledMap` on the server side, even if the Vite plugin is automatically injected in V4 compatibility mode.

Configure the server to use TiledMap:

```ts
import { createServer, provideServerModules } from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";

export default createServer({
  providers: [
    provideTiledMap(),  // No options needed for server
    provideServerModules([
      {
        maps: [
          {
            id: "mymap",  // Map ID (should match TMX filename without .tmx extension)
            // ... other map configuration
          }
        ]
      }
    ])
  ]
});
```

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

TiledMap automatically detects collision tiles and creates hitboxes:

- Set the `collision` property to `true` on tiles in Tiled Map Editor
- Collision hitboxes are automatically generated on the server
- No additional code required for basic collision detection

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