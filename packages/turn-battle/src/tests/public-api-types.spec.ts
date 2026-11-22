import { describe, expectTypeOf, it, vi } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import type { RpgPlayer } from "@rpgjs/server";
import type { BattleScreenOptions } from "@rpgjs/battle-kit";
import type { BattleHandleBase } from "@rpgjs/battle-kit/server";
import type { TurnBattleClientOptions } from "../client/index";
import { getTurnBattle, startTurnBattle, watchTurnBattle, type BattleResult, type TurnBattleHandle } from "../server/index";

describe("public types of the turn-based battle", () => {
  it("start, get and watch a battle with the shared battle vocabulary", () => {
    expectTypeOf(startTurnBattle).parameter(0).toEqualTypeOf<RpgPlayer>();
    expectTypeOf<ReturnType<typeof startTurnBattle>>().toEqualTypeOf<Promise<BattleResult>>();
    expectTypeOf(getTurnBattle).returns.toEqualTypeOf<TurnBattleHandle | undefined>();
    expectTypeOf<TurnBattleHandle>().toMatchTypeOf<BattleHandleBase>();
    expectTypeOf(watchTurnBattle).returns.toEqualTypeOf<Promise<boolean>>();
  });

  it("takes the screen options of every battle system", () => {
    expectTypeOf<TurnBattleClientOptions>().toMatchTypeOf<BattleScreenOptions>();
  });
});
