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
- `addElementTileset(tileset)`: teaches the map an element set it was not loaded with (a set the person added while editing), so that its elements can be resolved, placed, drawn and given collisions. `tileset` is the media of the set (`{ _id, fileName, metadata: { elements, drawRules } }`); a set the map already has is replaced. Resolves once its picture is loaded.
- `rebuildElementCollisions({ low })`: make the collisions follow the placed elements (see below).

### Fading layers

`updateData({ layerOpacity })` draws layers see-through. Each key is optional, from `0` to `1`, and defaults to `1`. Characters, events and collisions are not affected. Pass `layerOpacity: undefined` to put everything back.

```ts
context.updateData({
  layerOpacity: { terrain: 0.3, elementsAlwaysLow: 0.5, elementsLow: 0.7, elementsHigh: 1 },
});
```

### Params without a reload

`updateParams(patch)` changes the params of the map the scene shows, without loading it again: the scale, the weather kept in the
params, and the sounds. `backgroundMusic` and `backgroundAmbientSound` are the addresses the client plays from: give them
`await context.resolveAudio(value)` for a value of the map settings (a stored file name, a media, a media id), and `undefined` to
stop the sound. A change of scale shows on the picture only: the collisions are not made again, so a game that is played after
it should be loaded again.

```ts
context.updateParams({ scale: 2, backgroundMusic: await context.resolveAudio(settings.backgroundMusic) });
context.updateParams({ backgroundMusic: undefined }); // silence
```

### The size a map gives to an event

A placement of an event on a map (`events: [{ eventId, x, y }]`) can carry the size this map gives to it, so the same event is bigger here than there:

- `scale` (number above 0, default `1`): multiplies the character **and** the hitbox of that placement.
- `hitbox` (`{ width, height }`, above 0): the hitbox this map gives to the placement instead of the one of the event, in the same unit as the event's own hitbox (before the scale).

```json
{ "eventId": "goblin", "x": 320, "y": 240, "scale": 1.5, "hitbox": { "width": 40, "height": 24 } }
```

The Studio server keeps both on save (`PUT /api/maps/:id`, a value that is not a size is a `400`) and sends them with the game's map; the runtime applies them when it makes the event (character through its graphic scale, hitbox through the hitbox of the event). `resolveStudioEventDisplay({ media, frame, hitbox, scale })` (from `@rpgjs/studio/client`) takes the same `scale`, so a map editor draws the event at the size the player sees. `placeStudioEvent` (below) takes them too.

### Events that follow the editor

A map editor that runs in the same page as the server (a standalone game) can change the events the game runs without loading the map again. The Studio server map has these methods; positions are those the map stores (the game applies the map scale):

- `placeStudioEvent(record, { x, y, runtimeId, scale?, hitbox? })`: puts an event of the project on the map as the load does (media resolved, workflows and hitbox of the project), so an enemy attacks and a character answers. It resolves to `runtimeId`, or `undefined` when an event already has that id. `record` is the event as the project stores it (`{ _id, ... }`).
- `moveStudioEvent(runtimeId, x, y)`: moves an event; resolves to `false` when there is none.
- `removeStudioEvent(runtimeId)`: takes an event off the map; `false` when there is none.
- `listStudioEvents()`: the events the game runs, as `{ runtimeId, sourceEventId }`. An event of the map has the id of its event, then `id::2`, `id::3` for each other placement of it.

```ts
await map.placeStudioEvent(record, { x: 320, y: 240, runtimeId: `${record._id}::drop1` });
await map.moveStudioEvent(`${record._id}::drop1`, 352, 240);
map.removeStudioEvent(`${record._id}::drop1`);
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
