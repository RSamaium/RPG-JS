import { describe, expectTypeOf, test } from "vitest";
import {
  defineCatalog,
  defineSkin,
  history,
  placement,
  selection,
  selectionTool,
  snapToGrid,
  type CatalogId,
  type MaybePromise,
  type IntentOf,
  type MapIntent,
  type PipelineStep,
  type SkinContext,
  type TargetRef,
  createMapView,
  defineMapFeature,
  elements,
  events,
  attachMapView,
  type EffectHandle,
  type EffectStatus,
  type MapFeature,
  type MapView,
  type MapViewHooks,
  type SceneNode,
  createMapModel,
  defineAssets,
  defineMap,
  defineMap as defineMapAlias,
  definePatchHandlers,
  el,
  event,
  localCommitter,
  type ApplyResult,
  type AssetKind,
  type MapCommitter,
  type MapModel,
  type MapPatch,
  type MapPatchOf,
  type PatchType,
} from "./index";

// A feature adds its patch types by merging into the registry, through the public entry point
// (the same specifier consumers use, mapped to the sources by tsconfig `paths`).
declare module "@rpgjs/map-builder/model" {
  interface PatchRegistry {
    "tilling.till": { readonly x: number; readonly y: number };
  }
}

// A feature adds its intents the same way: by merging into the registry.
declare module "@rpgjs/map-builder/interaction" {
  interface IntentRegistry {
    "tilling.till": { readonly x: number; readonly y: number };
  }
}

const assets = defineAssets({
  "tree-oak": { src: "/tree.png" },
  "house-red": { src: "/house.png" },
  "wood-icon": { src: "/wood.png" },
});

describe("map-builder public API types", () => {
  test("asset references are inferred from defineAssets", () => {
    expectTypeOf<AssetKind<typeof assets>>().toEqualTypeOf<"tree-oak" | "house-red" | "wood-icon">();
    expectTypeOf(assets.kinds).toEqualTypeOf<readonly ("tree-oak" | "house-red" | "wood-icon")[]>();
    expectTypeOf(assets.has).parameter(0).toEqualTypeOf<string>();
  });

  test("defineMap only accepts known asset references", () => {
    defineMap(assets, {
      id: "ok",
      size: [10, 10],
      elements: [el("tree-oak", { id: "a", x: 0, y: 0 }), el("house-red", { id: "b", x: 0, y: 0 })],
      events: [event("chest", { id: "c", x: 0, y: 0, graphic: "wood-icon" }), event("npc", { id: "d", x: 0, y: 0 })],
    });

    // Checked by the compiler, never run: these calls throw at runtime on purpose.
    const rejectedByTheCompiler = () => {
      defineMap(assets, {
        id: "bad",
        size: [10, 10],
        // @ts-expect-error "tree-ok" is not a declared asset
        elements: [el("tree-ok", { id: "a", x: 0, y: 0 })],
      });

      defineMap(assets, {
        id: "bad",
        size: [10, 10],
        // @ts-expect-error "nope" is not a declared asset
        events: [event("chest", { id: "c", x: 0, y: 0, graphic: "nope" })],
      });

      // @ts-expect-error the size is required
      defineMap(assets, { id: "bad" });
    };
    void rejectedByTheCompiler;
  });

  test("a definition is read-only and always serializable", () => {
    const map = defineMapAlias(assets, { id: "m", size: [1, 1] });
    expectTypeOf(map.version).toEqualTypeOf<1>();
    expectTypeOf(map.size).toEqualTypeOf<readonly [width: number, height: number]>();
    const rejectedByTheCompiler = () => {
      // @ts-expect-error definitions are read-only
      map.id = "other";
      // @ts-expect-error elements are read-only
      map.elements.push({ id: "a", kind: "k", x: 0, y: 0 });
    };
    void rejectedByTheCompiler;
  });

  test("MapPatch is a discriminated union on `type`", () => {
    expectTypeOf<MapPatch["type"]>().toEqualTypeOf<PatchType>();
    expectTypeOf<PatchType>().toEqualTypeOf<
      | "element.add"
      | "element.remove"
      | "element.move"
      | "element.update"
      | "element.data"
      | "event.add"
      | "event.remove"
      | "event.move"
      | "extension.set"
      | "tilling.till"
      // added by the terrain module, which is part of the same program
      | "terrain.paint"
      | "terrain.region"
      | "terrain.materials"
      | "terrain.morphology"
    >();

    const narrow = (patch: MapPatch) => {
      if (patch.type === "element.move") {
        expectTypeOf(patch.x).toEqualTypeOf<number>();
        expectTypeOf(patch.id).toEqualTypeOf<string>();
      }
      if (patch.type === "tilling.till") expectTypeOf(patch).toEqualTypeOf<MapPatchOf<"tilling.till">>();
    };
    void narrow;
  });

  test("patches are checked: unknown types and wrong payloads do not compile", () => {
    const model = createMapModel(defineMap(assets, { id: "m", size: [1, 1] }));
    model.apply({ type: "element.move", id: "a", x: 1, y: 2 });
    model.apply({ type: "tilling.till", x: 1, y: 2 }); // added by the merged registry above
    model.apply([{ type: "element.remove", id: "a" }, { type: "event.remove", id: "b" }]);

    const rejectedByTheCompiler = () => {
      // @ts-expect-error unknown patch type
      model.apply({ type: "element.mve", id: "a", x: 1, y: 2 });
      // @ts-expect-error x must be a number
      model.apply({ type: "element.move", id: "a", x: "1", y: 2 });
      // @ts-expect-error a registered type still needs its payload
      model.apply({ type: "tilling.till", x: 1 });
    };
    void rejectedByTheCompiler;
  });

  test("a synchronous committer gives a synchronous model, an asynchronous one gives promises", () => {
    const definition = defineMap(assets, { id: "m", size: [1, 1] });
    const local = createMapModel(definition);
    expectTypeOf(local).toEqualTypeOf<MapModel<ApplyResult>>();
    expectTypeOf(local.apply({ type: "element.remove", id: "a" })).toEqualTypeOf<ApplyResult>();
    expectTypeOf(local.history.undo()).toEqualTypeOf<ApplyResult | null>();

    const explicit = createMapModel(definition, { committer: localCommitter() });
    expectTypeOf(explicit.apply).returns.toEqualTypeOf<ApplyResult>();

    const remote: MapCommitter<Promise<ApplyResult>> = {
      attach: () => undefined,
      commit: async () => ({ ok: false, rejection: { code: "unavailable", message: "offline" } }),
    };
    const model = createMapModel(definition, { committer: remote });
    expectTypeOf(model).toEqualTypeOf<MapModel<Promise<ApplyResult>>>();
    expectTypeOf(model.apply({ type: "element.remove", id: "a" })).toEqualTypeOf<Promise<ApplyResult>>();
    expectTypeOf(model.history.undo()).toEqualTypeOf<Promise<ApplyResult> | null>();
  });

  test("an apply result narrows on `ok`", () => {
    const model = createMapModel(defineMap(assets, { id: "m", size: [1, 1] }));
    const result = model.apply({ type: "element.remove", id: "a" });
    if (result.ok) {
      expectTypeOf(result.revision).toEqualTypeOf<number>();
      expectTypeOf(result.inverse).toEqualTypeOf<readonly MapPatch[]>();
      // @ts-expect-error a success has no rejection
      void result.rejection;
    } else {
      expectTypeOf(result.rejection.code).toBeString();
      // @ts-expect-error a failure has no revision
      void result.revision;
    }
  });

  test("patch handlers are typed against the registry", () => {
    definePatchHandlers({
      "tilling.till": {
        apply(state, patch) {
          expectTypeOf(patch.x).toEqualTypeOf<number>();
          expectTypeOf(state.elements).toEqualTypeOf<readonly import("./index").MapElement[]>();
          return { ok: true, state, inverse: [] };
        },
      },
    });
    definePatchHandlers({
      // @ts-expect-error unknown patch type
      "tilling.dig": { apply: () => ({ ok: true as const, state: {} as never, inverse: [] }) },
    });
  });

  describe("renderer", () => {
    const definition = defineMap(assets, { id: "m", size: [1, 1] });

    test("a view accepts a model whatever its committer, and features are imported objects", () => {
      // Checked by the compiler, never run: nothing here needs a real view.
      const compileOnly = () => {
        const local = createMapModel(definition);
        const remote = createMapModel(definition, {
          committer: { attach: () => undefined, commit: async () => ({ ok: false as const, rejection: { code: "x", message: "y" } }) },
        });

        const view = createMapView({ model: local, assets, features: [elements(), events()] });
        createMapView({ model: remote, assets, features: [elements()] });
        expectTypeOf(view).toExtend<MapView<ApplyResult>>();
        expectTypeOf(elements()).toExtend<MapFeature<"elements">>();
        expectTypeOf(elements().id).toEqualTypeOf<"elements">();

        // @ts-expect-error features are imported objects, not names (they must stay tree-shakeable)
        createMapView({ model: local, assets, features: ["elements"] });
        // @ts-expect-error a view needs its features, even if the list is empty
        createMapView({ model: local, assets });
        // @ts-expect-error a view needs a model
        createMapView({ assets, features: [] });
      };
      void compileOnly;
    });

    test("effect targets are element ids or typed references", () => {
      const compileOnly = (view: MapView) => {
        const handle = view.effects.play("t1", "shake", { intensity: 4 });
        view.effects.play({ type: "event", id: "chest-1" }, "blink");
        expectTypeOf(handle).toEqualTypeOf<EffectHandle>();
        expectTypeOf(handle.finished).toEqualTypeOf<Promise<EffectStatus>>();
        expectTypeOf<EffectStatus>().toEqualTypeOf<
          "completed" | "cancelled" | "target-removed" | "unknown-effect" | "target-missing"
        >();

        // @ts-expect-error only elements and events can be targeted
        view.effects.play({ type: "terrain", id: "x" }, "shake");
        // @ts-expect-error an effect needs a name
        view.effects.play("t1");
      };
      void compileOnly;
    });

    test("hooks are typed on the element they receive and the node they may return", () => {
      const hooks: MapViewHooks = {
        resolveElementSprite(element, context) {
          expectTypeOf(element.id).toEqualTypeOf<string>();
          expectTypeOf(context.descriptor?.src).toEqualTypeOf<string | undefined>();
          return { parts: [{ x: 0, y: 0, width: 16, height: 16 }] };
        },
        onBeforeRenderElement(node) {
          expectTypeOf(node).toEqualTypeOf<SceneNode>();
          return { ...node, sortKey: node.sortKey + 1 };
        },
        onMissingAsset(kind, owner) {
          expectTypeOf(kind).toEqualTypeOf<string>();
          expectTypeOf(owner.type).toEqualTypeOf<"element" | "event">();
        },
      };
      void hooks;

      const rejectedByTheCompiler = () => {
        const bad: MapViewHooks = {
          // @ts-expect-error a part needs a size
          resolveElementSprite: () => ({ parts: [{ x: 0, y: 0 }] }),
        };
        return bad;
      };
      void rejectedByTheCompiler;
    });

    test("a feature is defined with an id, and attachMapView hosts a view", () => {
      expectTypeOf(defineMapFeature({ id: "demo", requires: ["elements"] }).id).toEqualTypeOf<"demo">();
      expectTypeOf(attachMapView).returns.toEqualTypeOf<() => void>();
      const rejectedByTheCompiler = () => {
        // @ts-expect-error a feature needs an id
        defineMapFeature({});
      };
      void rejectedByTheCompiler;
    });
  });

  describe("interaction", () => {
    const definition = defineMap(assets, { id: "m", size: [1, 1] });
    const catalog = defineCatalog([
      { id: "oak", sprite: "tree-oak" },
      { id: "cabin", sprite: "house-red" },
    ]);

    test("the view is typed by its features: only their APIs exist, and only the ids of the catalog can be placed", () => {
      const compileOnly = () => {
        const model = createMapModel(definition);
        const view = createMapView({ model, assets, features: [elements(), selection(), placement({ catalog }), history()] });

        view.placement.start("oak");
        view.placement.start("cabin");
        expectTypeOf(view.placement.active).toEqualTypeOf<"oak" | "cabin" | null>();
        expectTypeOf(view.selection.current).toEqualTypeOf<readonly TargetRef[]>();
        expectTypeOf(view.selection.hovered).toEqualTypeOf<TargetRef | null>();
        expectTypeOf(view.history.undo()).toEqualTypeOf<MaybePromise<ApplyResult> | null>();
        // with a local committer, say so and results are synchronous
        const local = createMapView({ model, assets, features: [elements(), history<ApplyResult>()] });
        expectTypeOf(local.history.undo()).toEqualTypeOf<ApplyResult | null>();
        expectTypeOf(view.placement.onRejected).parameter(0).parameter(0).toHaveProperty("reason");

        // @ts-expect-error "birch" is not in the catalog
        view.placement.start("birch");

        const drawOnly = createMapView({ model, assets, features: [elements()] });
        // @ts-expect-error no placement feature in the list, so no view.placement
        drawOnly.placement;
        // @ts-expect-error no selection feature either
        drawOnly.selection;
      };
      void compileOnly;
    });

    test("catalog ids are inferred", () => {
      expectTypeOf<CatalogId<typeof catalog>>().toEqualTypeOf<"oak" | "cabin">();
      expectTypeOf(catalog.get("oak")?.sprite).toEqualTypeOf<string | undefined>();
    });

    test("intents are a discriminated union, extended by merging into the registry", () => {
      expectTypeOf<MapIntent["type"]>().toEqualTypeOf<"element.move" | "element.remove" | "element.place" | "tilling.till" | "terrain.paint">();
      const narrow = (intent: MapIntent) => {
        if (intent.type === "element.place") expectTypeOf(intent.catalogId).toEqualTypeOf<string>();
        if (intent.type === "tilling.till") expectTypeOf(intent).toEqualTypeOf<IntentOf<"tilling.till">>();
      };
      void narrow;

      const compileOnly = (view: MapView<ApplyResult>) => {
        view.submit({ type: "element.move", id: "t1", x: 1, y: 2 });
        view.submit([{ type: "element.remove", id: "a" }, { type: "tilling.till", x: 1, y: 1 }]);
        expectTypeOf(view.submit({ type: "element.remove", id: "a" })).toEqualTypeOf<ApplyResult>();

        // @ts-expect-error unknown intent
        view.submit({ type: "element.mve", id: "t1", x: 1, y: 2 });
        // @ts-expect-error element.move needs a position
        view.submit({ type: "element.move", id: "t1" });
      };
      void compileOnly;
    });

    test("a step of a pipeline is typed on the intent it receives", () => {
      const step: PipelineStep<"element.place"> = (intent, context, next) => {
        expectTypeOf(intent.catalogId).toEqualTypeOf<string>();
        expectTypeOf(context.actor).toEqualTypeOf<unknown>();
        return context.state.elements.length > 3 ? context.reject("too-many") : next({ ...intent, x: intent.x + 1 });
      };
      void step;

      const compileOnly = () => {
        // a grid can snap anything that has a position…
        const onPlace: PipelineStep<"element.place"> = snapToGrid(32);
        const onMove: PipelineStep<"element.move"> = snapToGrid(32);
        void onPlace;
        void onMove;
        // @ts-expect-error …but not a removal, which has none
        const onRemove: PipelineStep<"element.remove"> = snapToGrid(32);
        void onRemove;
        // @ts-expect-error a step for placing cannot be attached to moving
        const wrong: PipelineStep<"element.move"> = step;
        void wrong;
      };
      void compileOnly;
    });

    test("tools and skins are typed", () => {
      selectionTool({ drag: { live: true, threshold: 5 }, remove: true, types: ["element"] });
      const compileOnly = () => {
        // @ts-expect-error drag takes an object or false
        selectionTool({ drag: true });
        // @ts-expect-error only elements and events can be selected
        selectionTool({ types: ["terrain"] });
      };
      void compileOnly;

      const skin = defineSkin({
        selection: (context) => {
          expectTypeOf(context).toEqualTypeOf<SkinContext>();
          expectTypeOf(context.nodes().at(0)?.bounds.width).toEqualTypeOf<number | undefined>();
          return { update: (snapshot) => void snapshot.selection.length, destroy: () => undefined };
        },
      });
      void skin;
    });
  });
});

describe("terrain types", () => {
  test("the recipe is checked against the materials that were declared", async () => {
    const { defineTerrain, paint, terrainPatchHandlers } = await import("./terrain");
    const terrain = defineTerrain({ grass: { texture: "grass" }, water: { texture: "water" } });
    const compileOnly = () => {
      terrain.layers([paint.fill("grass"), paint.circle("water", { x: 0, y: 0, radius: 4 })]);
      // @ts-expect-error "lava" was not declared
      terrain.layers([paint.fill("lava")]);
      // @ts-expect-error a circle needs a radius
      paint.circle("grass", { x: 0, y: 0 });
    };
    void compileOnly;
    expectTypeOf(terrain.materials.at(0)?.id).toEqualTypeOf<string | undefined>();
    expectTypeOf(terrainPatchHandlers["terrain.paint"]).not.toBeAny();
  });

  test("terrain patches are part of the MapPatch union once the terrain module is loaded", async () => {
    await import("./terrain");
    const patch: import("./model").MapPatch = { type: "terrain.paint", shape: { type: "circle", x: 1, y: 2, radius: 3 }, material: null };
    expectTypeOf(patch.type).toExtend<string>();
    // @ts-expect-error the shape is required
    const missing: import("./model").MapPatch = { type: "terrain.paint", material: "grass" };
    void missing;
  });
});
