# `@rpgjs/map-builder`

> **Experimental, private.** The API changes until the Studio integration
> validates it. See [`MAP_BUILDER.md`](../../MAP_BUILDER.md) for the design.

A modifiable map: one model, changed only by patches, usable by a game, an
editor or both.

| Entry | What it gives | Needs PixiJS |
| --- | --- | --- |
| `@rpgjs/map-builder/model` | The model, patches, history, sources. Runs in plain Node, without a DOM. | no |
| `@rpgjs/map-builder/renderer` | `createMapView`: draws a model with PixiJS, updates it patch by patch. | yes (peer dependency) |
| `@rpgjs/map-builder/features` | `elements()`, `events()`, `selection()`, `placement()`, `history()`. | yes (through the skins) |
| `@rpgjs/map-builder/interaction` | The headless layer: state, tools, intents, pipelines, catalog. Runs on a server, to validate with the same rules. | no |
| `@rpgjs/map-builder/skins` | How the interaction looks: `defaultSkin`, `gameSkin`, and the contract to write your own. | yes |

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

## Drawing a map

```ts
import { createMapView } from "@rpgjs/map-builder/renderer";
import { elements, events } from "@rpgjs/map-builder/features";

const view = createMapView({
  model,
  assets,
  features: [elements(), events()], // imported objects, so unused ones are tree-shaken
});

await view.mount(document.getElementById("game")!); // creates a PixiJS application…
// …or host `view.root` in any PixiJS stage you already have:
app.stage.addChild(view.root);

model.apply({ type: "element.move", id: "t1", x: 160, y: 96 }); // only t1 is updated
```

The view follows the model whatever its committer: it listens to the changes
that were applied, and describes again only the elements a patch touched.

- **Depth.** Elements are drawn back to front by a sort key: the bottom of the
  hitbox (or of the drawing without one) plus `depth.z`, as the Studio renderer
  does. `depth.anchorY` replaces the bottom with an explicit offset.
- **Assets.** `AssetDescriptor` has an optional `frame` (an asset cut out of a
  tileset), a `size`, and a `hitbox` in source pixels. An asset that declares
  neither `frame` nor `size` is measured once its image has loaded.
- **Culling.** `view.setViewport(rect)` hides what is outside the camera, with a
  margin (64 px by default). `null` shows everything.
- **Hooks.** `resolveElementSprite` changes how an element is drawn (Studio uses
  it for its drawing rules), `onBeforeRenderElement` adjusts the result,
  `onMissingAsset` reports unknown assets.
- **Effects.** Short visual changes that never touch the model, so they are not
  saved, undoable nor replayed to late joiners:

  ```ts
  const handle = view.effects.play("t1", "shake", { intensity: 4 });
  await handle.finished; // "completed" | "cancelled" | "target-removed" | …
  ```

  `shake` and `blink` are built in; add yours with `effects: { lift }` or
  `view.effects.register`. Time only moves on `view.tick(deltaMs)`, which `mount`
  calls every frame, so effects are deterministic.

## Editing, and playing, on the same map

The same view serves a game and an editor. What changes is the list of features,
the active modes and the rules.

```ts
const catalog = defineCatalog([
  { id: "oak", sprite: "tree-oak", pipeline: [/* rules of this item */] },
]);

const view = createMapView({
  model,
  assets,
  features: [
    elements({ pipeline: { move: [snapToGrid(16)] } }), // rules for every move, whoever asks
    events(),
    selection({ drag: { live: true }, remove: true }),
    placement({ catalog, pipeline: [snapToGrid(32), withinMap(), requireFree()] }),
    history(),
  ],
  modes: ["edit"],
});

view.placement.start("oak");          // a ghost follows the pointer; typed on the catalog ids
view.selection.current;               // what is selected
view.history.undo();
view.submit({ type: "element.move", id: "t1", x: 160, y: 96 }); // an intent, not a patch
```

Features are imported objects, and each one that has an API exposes it on the view
under its id: `view.placement`, `view.selection`, `view.history`. The view is typed
by the list you give: without `placement()`, `view.placement` does not exist.

### Intents, pipelines, rejections

A user action is an **intent**. It goes through a **pipeline** of steps, then
becomes patches, which the committer applies. A step may modify the intent, refuse it
or pass it on, in the style of Koa:

```ts
const rules: PipelineStep<"element.place">[] = [
  snapToGrid(32),
  maxCount("tree-oak", 5),
  (intent, ctx, next) => (ctx.actor.inventory.wood >= 2 ? next() : ctx.reject("not-enough-wood")),
];
```

Steps are synchronous and pure, so **the same pipeline runs on the client**, to
preview with the ghost, **and on a server**, to validate. A refusal is a value:
`view.submit(...)` returns `{ ok: false, rejection: { code: "occupied", … } }` and
`interaction.state.get().lastRejection` keeps it, so the UI can say why.

Provided steps: `snapToGrid`, `withinMap`, `requireFree`, `maxCount`, `minDistance`.

### Modes

Tools belong to modes (`play`, `edit`, `inspect`). Several modes can be active at
once, and a tool can be gated on a modifier key, which is how a player plays while
Alt turns the same click into editing:

```ts
view.interaction.addTool(playTool({ types: ["event"], onInteract: (target) => talkTo(target) }));
view.interaction.setModes(["play", "edit"]);
```

The interaction layer is **headless**: it publishes `interaction.state` (hovered,
selection, drag, rubber band, ghost, last rejection) and draws nothing. Skins read
that state:

```ts
selection({ skin: { selection: myGlow } });   // replace one part, keep the others
placement({ catalog, skin: gameSkin({ ghost: { valid: 0x66ff66, invalid: 0xff5555 }, pulse: true }) });
```

Keyboard (Escape cancels, Delete removes) is opt-in: `view.mount(host, { keyboard: true })`
or `bindKeyboard(view.interaction, window)`.

### Adding an intent

```ts
declare module "@rpgjs/map-builder/interaction" {
  interface IntentRegistry {
    "tilling.till": { readonly x: number; readonly y: number };
  }
}
```

### In a CanvasEngine scene

The view is a PixiJS container, which is what CanvasEngine renders to. Host it
the way other raw PixiJS objects are hosted:

```ce
<Container />

<script>
  import { mount, tick } from "canvasengine";
  import { attachMapView } from "@rpgjs/map-builder/renderer";

  mount((element) => attachMapView(element.componentInstance, view));
  tick(({ deltaTime }) => view.tick(deltaTime));
</script>
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
| `createMapView`, `elements()`, `events()` | Draw the model with PixiJS, incrementally. |
| `defineMapFeature` | Declares a feature with an id, its dependencies and what it draws. Built-in and third-party features use the same contract. |

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
