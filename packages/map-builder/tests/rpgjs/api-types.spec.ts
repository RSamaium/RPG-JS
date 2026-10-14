import { describe, expectTypeOf, test } from "vitest";
import type { RpgPlayer } from "@rpgjs/server";
import type { RpgClientEngine } from "@rpgjs/client";
import { elements, placement, selection } from "../../src/features";
import { defineCatalog } from "../../src/interaction/catalog";
import type { MapStore } from "../../src/authority/store";
import { createMapBuilderClient, getMapBuilder, type MapBuilderHandle } from "../../src/client";
import { createMapBuilderServer, getMapAuthority, type MapBuilderServerOptions } from "../../src/server";
import type { MapAuthority } from "../../src/authority/authority";
import { assets } from "./helpers";

const catalog = defineCatalog([
  { id: "oak", sprite: "tree" },
  { id: "cabin", sprite: "house" },
]);

describe("map builder for RPGJS: public types", () => {
  test("the client handle is typed by the features it was given", () => {
    const features = [elements({ edit: true }), selection(), placement({ catalog })] as const;
    const compileOnly = (engine: RpgClientEngine) => {
      const handle = getMapBuilder<typeof features>(engine).current();
      expectTypeOf(handle).toEqualTypeOf<MapBuilderHandle<typeof features> | undefined>();
      handle?.view.placement.start("oak");
      handle?.view.placement.start("cabin");
      expectTypeOf(handle?.view.selection.current).not.toBeAny();
      expectTypeOf(handle?.mapId).toEqualTypeOf<string | undefined>();

      // @ts-expect-error "birch" is not in the catalog
      handle?.view.placement.start("birch");

      // a decision is a promise: the server answers
      const result = handle?.view.submit({ type: "element.remove", id: "t1" });
      expectTypeOf(result).not.toBeAny();
    };
    void compileOnly;
  });

  test("onJoin receives a handle typed by the options", () => {
    createMapBuilderClient({
      assets,
      features: [elements({ edit: true }), placement({ catalog })] as const,
      onJoin(handle) {
        handle.view.placement.start("oak");
        expectTypeOf(handle.view.placement.active).toEqualTypeOf<"oak" | "cabin" | null>();
      },
    });
  });

  test("the server options accept the three ways to give maps, and know the player", () => {
    const store = {} as MapStore;
    const options: MapBuilderServerOptions = {
      assets,
      maps: { forest: { version: 1, id: "forest", size: [10, 10], elements: [], events: [] } },
      actor: (player) => {
        expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
        return { id: player.id };
      },
      persist: (map) => {
        expectTypeOf(map.id).toBeString();
        return store;
      },
      events: { idPrefix: "mb:", define: (event) => (event.kind === "pickup" ? { hooks: { onAction() {} }, hitbox: { width: 16, height: 16 } } : undefined) },
      onReady(authority, map) {
        expectTypeOf(authority).toEqualTypeOf<MapAuthority>();
        expectTypeOf(map.id).toBeString();
      },
    };
    void options;
    createMapBuilderServer({ assets, maps: (id) => (id === "forest" ? undefined : undefined) });
    createMapBuilderServer({ assets, maps: { load: async () => { throw new Error("no"); } } });

    const compileOnly = () => {
      // @ts-expect-error events is an object, or false
      createMapBuilderServer({ assets, maps: {}, events: true });
      // @ts-expect-error the server needs the assets it describes maps with
      createMapBuilderServer({ maps: {} });
      // @ts-expect-error physics is a boolean
      createMapBuilderServer({ assets, maps: {}, physics: "yes" });
    };
    void compileOnly;
  });

  test("game code reaches the authority of a map", () => {
    expectTypeOf(getMapAuthority).returns.toEqualTypeOf<MapAuthority | undefined>();
  });
});
