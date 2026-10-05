# `@rpgjs/map-builder`

> **Experimental, private.** The API changes until the Studio integration
> validates it. See [`MAP_BUILDER.md`](../../MAP_BUILDER.md) for the design.

A modifiable map: one model, changed only by patches, usable by a game, an
editor or both. This first step provides the model (`@rpgjs/map-builder/model`);
it runs in plain Node, without a DOM.

```ts
import { createMapModel, defineAssets, defineMap, el } from "@rpgjs/map-builder/model";

const assets = defineAssets({ "tree-oak": { src: "/img/tree-oak.png" } });

// A map written in code. References to assets are checked by the compiler.
const forest = defineMap(assets, {
  id: "forest",
  size: [2560, 1920], // pixels
  elements: [el("tree-oak", { id: "t1", x: 128, y: 96, data: { hits: 5 } })],
});

const model = createMapModel(forest);

model.subscribe(({ patches }) => console.log("changed", patches));

model.apply({ type: "element.move", id: "t1", x: 160, y: 96 });

// A batch is atomic and gets a single revision.
model.apply([
  { type: "element.remove", id: "t1" },
  { type: "event.add", event: { id: "wood-1", kind: "loot", x: 160, y: 96 } },
]);

model.history.undo(); // restores the tree and removes the loot, in one step
```

## What is in it

| | |
| --- | --- |
| `defineAssets`, `defineMap`, `el`, `event` | Describe a map in code. The result is a plain, serializable `MapDefinition`. |
| `parseMapDefinition` | Validates, migrates and copies raw JSON. Unknown fields are preserved. |
| `MapSource`: `codeMapSource`, `jsonMapSource`, `httpMapSource` | Where maps come from. `loadRegion` streams large maps. |
| `AssetResolver` | Turns `"tree-oak"` into an image descriptor. |
| `createMapModel` | State, revisions, patches, batches, history, `subscribe`. |
| Patches | `element.add/remove/move/update/data`, `event.add/remove/move`, `extension.set`. Serializable and invertible. |
| `localCommitter` | Applies changes immediately, and saves them through `persist`. |

## Rejections are values

```ts
const result = model.apply({ type: "element.move", id: "nope", x: 1, y: 1 });
if (!result.ok) result.rejection; // { code: "not-found", message, patchIndex: 0 }
```

## Adding a patch type

A feature extends the registry, so its patches are checked everywhere:

```ts
declare module "@rpgjs/map-builder/model" {
  interface PatchRegistry {
    "tilling.till": { readonly x: number; readonly y: number };
  }
}

createMapModel(definition, {
  patchHandlers: [
    definePatchHandlers({
      "tilling.till": { apply: (state, patch) => patchOk(/* new state */ state, /* inverse patches */ []) },
    }),
  ],
});
```

## Scripts

```bash
pnpm --filter @rpgjs/map-builder test        # unit tests, in Node
pnpm --filter @rpgjs/map-builder test:types  # strict type check, including the type tests
pnpm --filter @rpgjs/map-builder build
```
