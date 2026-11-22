import { describe, expectTypeOf, it, vi } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import type { RpgPlayer } from "@rpgjs/server";
import type { BattleHandleBase } from "@rpgjs/battle-kit/server";
import { getTacticalBattle, startTacticalBattle, watchTacticalBattle, type Placement, type TacticalBattleHandle, type TacticalResult } from "../server";

describe("public types of the tactical battle", () => {
  it("start, get and watch a battle with the shared battle vocabulary", () => {
    expectTypeOf(startTacticalBattle).parameter(0).toEqualTypeOf<RpgPlayer>();
    expectTypeOf<ReturnType<typeof startTacticalBattle>>().toEqualTypeOf<Promise<TacticalResult>>();
    expectTypeOf(getTacticalBattle).returns.toEqualTypeOf<TacticalBattleHandle | undefined>();
    expectTypeOf<TacticalBattleHandle>().toMatchTypeOf<BattleHandleBase>();
    expectTypeOf(watchTacticalBattle).returns.toEqualTypeOf<Promise<boolean>>();
  });

  it("places either a unit of the database or the hero of a player", () => {
    expectTypeOf<{ hero: true; x: 1; y: 2 }>().toMatchTypeOf<Placement>();
    expectTypeOf<{ unit: "kael"; x: 1; y: 2; seat: 1 }>().toMatchTypeOf<Placement>();
  });
});
