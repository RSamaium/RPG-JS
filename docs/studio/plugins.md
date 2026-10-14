---
title: "Create a Studio plugin"
description: "Extend the RPGJS Studio map renderer with Studio plugins."
---

# Create a Studio plugin

Studio plugins extend the Studio map renderer without replacing the map component. Use them for client-side Studio tools such as debug overlays, editor helpers, visual diagnostics, or custom map rendering aids.

Studio plugins are client-side rendering extensions. They do not create gameplay authority and they do not replace server-side map, event, or collision logic.

## Built-in debug plugin

The simplest way to display Studio collision overlays is the compatibility shortcut:

```ts
import { provideStudioGame } from "@rpgjs/studio";

provideStudioGame({
  projectId: "your-project-id",
  debugCollisions: true,
});
```

This enables the built-in debug collisions plugin.

For events, the red overlay is drawn on the RPGJS collision hitbox. Studio reads
the physics body top-left position when it is available, then uses the event
`hitbox()` width and height. This can differ from the visible sprite bounds when
the sprite is larger than its collision box.

Player hitboxes are displayed by default with the same overlay. Set
`players: false` to hide the player collision box while keeping event collision
boxes visible.

You can also attach it explicitly:

```ts
import {
  provideStudioGame,
  studioDebugCollisionsPlugin,
} from "@rpgjs/studio";

provideStudioGame({
  projectId: "your-project-id",
  studioPlugins: [
    studioDebugCollisionsPlugin(),
  ],
});
```

The plugin can be configured:

```ts
import {
  provideStudioGame,
  studioDebugCollisionsPlugin,
} from "@rpgjs/studio";

provideStudioGame({
  projectId: "your-project-id",
  studioPlugins: [
    studioDebugCollisionsPlugin({
      terrain: true,
      elements: true,
      events: true,
      players: true,
      color: 0xef4444,
      fillAlpha: 0.18,
      strokeAlpha: 0.72,
    }),
  ],
});
```

## Create a plugin

A Studio plugin is an object with an `id` and optional renderer hooks.

```ts
import type { StudioMapPlugin } from "@rpgjs/studio";

export function myStudioPlugin(): StudioMapPlugin {
  return {
    id: "my-studio-plugin",

    terrainOptions(ctx) {
      return {};
    },

    elementRenderOptions(ctx) {
      return {};
    },

    eventLayerPixiChildren(ctx) {
      return [];
    },
  };
}
```

Attach it with `studioPlugins`:

```ts
import { provideStudioGame } from "@rpgjs/studio";
import { myStudioPlugin } from "./my-studio-plugin";

provideStudioGame({
  projectId: "your-project-id",
  studioPlugins: [
    myStudioPlugin(),
  ],
});
```

## Renderer hooks

Use `terrainOptions(ctx)` to add options to the Studio terrain renderer:

```ts
import type { StudioMapPlugin } from "@rpgjs/studio";

export function terrainToolPlugin(): StudioMapPlugin {
  return {
    id: "terrain-tool",
    terrainOptions() {
      return {
        debugCollisions: true,
      };
    },
  };
}
```

Use `elementRenderOptions(ctx)` to add options to Studio element rendering:

```ts
import type { StudioMapPlugin } from "@rpgjs/studio";

export function elementToolPlugin(): StudioMapPlugin {
  return {
    id: "element-tool",
    elementRenderOptions() {
      return {
        debugCollisions: true,
      };
    },
  };
}
```

Use `eventLayerPixiChildren(ctx)` to add Pixi objects to the event layer. The returned objects are mounted next to Studio events, players, low elements, and wall occlusion sprites.

```ts
import type { StudioMapPlugin } from "@rpgjs/studio";
import { Graphics } from "pixi.js";

export function eventOverlayPlugin(): StudioMapPlugin {
  const overlay = new Graphics() as any;
  overlay.label = "MyStudioOverlay";
  overlay.zIndex = 2147483647;

  overlay.__studioMapPluginUpdate = () => {
    overlay.clear();
    overlay
      .rect(0, 0, 96, 48)
      .fill({ color: 0x22c55e, alpha: 0.18 });
  };

  return {
    id: "event-overlay",
    eventLayerPixiChildren() {
      return [overlay];
    },
  };
}
```

If a Pixi child defines `__studioMapPluginUpdate`, Studio calls it every frame while the child is mounted.

## Plugin context

Each hook receives:

```ts
type StudioMapPluginContext = {
  engine: RpgClientEngine;
  map: any;
  data: any;
};
```

- `engine`: the active client engine.
- `map` and `data`: the current Studio map render data.

Use the context for rendering decisions only. Server-owned gameplay state should still be changed through RPGJS server APIs, map events, and synchronized data.

## Map extensions: tools that edit the running map

`registerStudioMapExtension` (from `@rpgjs/studio/client`) calls a function each time a Studio map is loaded, for tools that change the map while it runs, such as a map editor. The function receives a context with the engine, the map id and size, the placed elements as stored, and these helpers:

- `resolveElement(placed, layer)`: what the runtime draws for a placed element, or `null`.
- `readData()` and `updateData(patch)`: read the data the scene shows, and merge new data into it (the scene is drawn again).
- `rebuildElementCollisions({ low })`: make the collisions follow the placed elements (see below).

### Fading layers

`updateData({ layerOpacity })` draws layers see-through. Each key is optional, from `0` to `1`, and defaults to `1`. Characters, events and collisions are not affected. Pass `layerOpacity: undefined` to put everything back.

```ts
context.updateData({
  layerOpacity: { terrain: 0.3, elementsAlwaysLow: 0.5, elementsLow: 0.7, elementsHigh: 1 },
});
```

### Collisions that follow the elements

The hitboxes of the placed elements are made when the map loads. After a tool adds, moves or removes elements, call `rebuildElementCollisions` with the placed elements of the `elementsLow` layer as stored (`{ id, tilesetId, x, y, … }`):

```ts
context.rebuildElementCollisions({ low: placedElementsLow });
```

It replaces every hitbox that came from the elements of the map, with the same rules as at load (only the `elementsLow` layer, polygon hitboxes, scale, draw rule), and leaves the others (base map, terrain) alone. It works on the client map, which the hero predicts against, and tells the server, which does the same on its map from the tilesets it holds: the client says where the elements are, never what their hitboxes are.

The server only follows a player it allows. Install the server module with an `authorize` function; without it, the server ignores the message and only the client prediction changes:

```ts
import { provideServerModules } from "@rpgjs/server";
import { createStudioElementCollisionsServer } from "@rpgjs/studio/server";

provideServerModules([
  createStudioElementCollisionsServer({
    // standalone editor: any player; online game: check that this player may edit the map
    authorize: (player) => canEditMaps(player),
  }),
]);
```

In an online game the server decides collisions for every player, so the change applies to all of them at once. A client that is not the editor rebuilds its own prediction the next time it loads the map.
