import { describe, expectTypeOf, test } from "vitest";
import type { RpgPlayer, RpgRoomConnection } from "@rpgjs/server";
import {
  provideStudioGame,
  type StudioPlayerStartup,
  type StudioStartupResolver,
} from "../src";

describe("Studio startup public API types", () => {
  test("provides a connection-scoped discriminated startup resolver", () => {
    const resolver = (({ player, query, headers, connection }) => {
      expectTypeOf(player).toEqualTypeOf<RpgPlayer>();
      expectTypeOf(query).toEqualTypeOf<Readonly<Record<string, string>>>();
      expectTypeOf(headers).toEqualTypeOf<Readonly<Record<string, string>>>();
      expectTypeOf(connection).toEqualTypeOf<RpgRoomConnection<unknown>>();

      return query.map
        ? { projectId: query.game, flow: "direct", mapId: query.map }
        : { projectId: query.game, flow: "title" };
    }) satisfies StudioStartupResolver;

    expectTypeOf(resolver).returns.toMatchTypeOf<StudioPlayerStartup>();
    expectTypeOf(provideStudioGame({ resolveStartup: resolver })).toMatchTypeOf<object[]>();
  });
});
