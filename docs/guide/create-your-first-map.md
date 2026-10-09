---
title: "Create your first map"
description: "Add your first playable map to an RPGJS project."
---

# Create your first map

The simplest workflow is to use the Tiled integration.

## 1. Register the Tiled providers

On the server:

```ts
import { createServer, provideServerModules } from "@rpgjs/server";
import mainServerModule from "./modules/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";

export default createServer({
  providers: [
    provideServerModules([mainServerModule]),
    provideTiledMap()
  ]
});
```

On the client:

```ts
import { provideClientGlobalConfig } from "@rpgjs/client";
import { provideTiledMap } from "@rpgjs/tiledmap/client";

export default {
  providers: [
    provideTiledMap({
      basePath: "map"
    }),
    provideClientGlobalConfig()
  ]
};
```

## 2. Create the map file

Create a TMX file in your Tiled folder, for example:

```text
src/tiled/simplemap.tmx
```

The map ID used by RPGJS must match the file name, so `simplemap.tmx` becomes the map id `simplemap`.

## 3. Declare the map in your module

In your server module:

```ts
import { defineModule, type RpgServer } from "@rpgjs/server";
import { player } from "./player";

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: "simplemap"
    }
  ]
});
```

At this point, the map exists in the server and can be loaded by players.

## 4. Run the game

When the player changes to `simplemap`, the client will load the matching Tiled map automatically.

## Tiled is optional

`@rpgjs/tiledmap` is the easiest way to create maps with [Tiled Map Editor](https://www.mapeditor.org/), but it is not required.

If you want your own renderer or your own map format, use [Custom map rendering with provideLoadMap](/advanced/provide-load-map).

## Next step

Continue with [Create hero in map](/guide/create-hero-in-map).
