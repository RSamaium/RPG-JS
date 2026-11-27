import { describe, expect, expectTypeOf, it, vi } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import type { RpgPlayer } from "@rpgjs/server";
import type { BattleScreenOptions } from "@rpgjs/battle-kit";
import type { BattleHandleBase } from "@rpgjs/battle-kit/server";
import type { TurnBattleClientOptions } from "../client/index";
import * as serverApi from "../server/index";
import {
  getTurnBattle,
  startTurnBattle,
  turnBattleSkill,
  watchTurnBattle,
  type BattleResult,
  type TurnBattleHandle,
  type TurnBattleSkillRecord,
} from "../server/index";

/** Engine internals that must stay out of the public entries. */
const INTERNALS = [
  "runCommand", "runAuto", "validate", "setAuto", "forfeit", "mirrorBeats", "mirrorView", "mirrorResult", "beginBattle",
  "createBattle", "createRules", "withHooks", "toView", "syncVitals", "TURN_BATTLE_GUI",
] as const;
type Internal = (typeof INTERNALS)[number];

describe("public types of the turn-based battle", () => {
  it("start, get and watch a battle with the shared battle vocabulary", () => {
    expectTypeOf(startTurnBattle).toBeCallableWith({} as RpgPlayer, "goblins");
    expectTypeOf<ReturnType<typeof startTurnBattle>>().toEqualTypeOf<Promise<BattleResult>>();
    expectTypeOf(getTurnBattle).returns.toEqualTypeOf<TurnBattleHandle | undefined>();
    expectTypeOf<TurnBattleHandle>().toMatchTypeOf<BattleHandleBase>();
    expectTypeOf(watchTurnBattle).returns.toEqualTypeOf<Promise<boolean>>();
  });

  it("takes the screen options of every battle system", () => {
    expectTypeOf<TurnBattleClientOptions>().toMatchTypeOf<BattleScreenOptions>();
  });

  it("exposes the data helpers and the texts, not the battle engine", () => {
    expectTypeOf(turnBattleSkill<TurnBattleSkillRecord>).returns.toEqualTypeOf<TurnBattleSkillRecord>();
    expectTypeOf<Extract<keyof typeof import("../server/index"), Internal>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof typeof import("../client/index"), Internal | "turnBattleSkill">>().toEqualTypeOf<never>();
    expectTypeOf<typeof import("../client/index")>().toHaveProperty("TURN_BATTLE_I18N");
    for (const name of INTERNALS) expect(serverApi).not.toHaveProperty(name);
    for (const name of ["turnBattleSkill", "turnBattleItem", "turnBattleEnemy", "turnBattleTroop", "turnBattleCommand", "TURN_BATTLE_I18N", "getLimit"])
      expect(serverApi).toHaveProperty(name);
  });
});
