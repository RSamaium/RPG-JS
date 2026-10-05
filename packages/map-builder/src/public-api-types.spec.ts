import { describe, expectTypeOf, test } from "vitest";
import {
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
});
