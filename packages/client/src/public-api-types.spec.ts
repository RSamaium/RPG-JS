import { describe, expectTypeOf, test } from "vitest";
import { Container, h } from "canvasengine";
import type { RpgContext, RpgProvider } from "@rpgjs/common";
import {
  provideMmorpg,
  startGame,
  type GuiRegistration,
  type GuiRenderer,
  provideClientScenes,
  type RpgClientRoomSceneProps,
  type RpgClientSceneDefinition,
  type RpgMusicManager,
} from "./index";

describe("client public API types", () => {
  test("custom room scenes infer synchronized state and component props", () => {
    type BattleState = { turn: number };
    const scene: RpgClientSceneDefinition<BattleState> = {
      kind: "battle",
      component(props: RpgClientRoomSceneProps<BattleState>) {
        expectTypeOf(props.room.state()).toEqualTypeOf<BattleState>();
        expectTypeOf(props.descriptor.kind).toEqualTypeOf<string>();
        return h(Container);
      },
    };

    expectTypeOf(provideClientScenes([scene])).toEqualTypeOf<RpgProvider>();
  });
  test("bootstrap and providers expose RPGJS-owned contracts", () => {
    expectTypeOf(provideMmorpg({})).toEqualTypeOf<RpgProvider[]>();
    const assertions = (start: typeof startGame) => {
      expectTypeOf(start({ providers: [] })).toEqualTypeOf<Promise<RpgContext>>();
    };
    expectTypeOf(assertions).toBeFunction();
  });

  test("the Signe Context class is not re-exported", () => {
    // @ts-expect-error Context is available only from direct advanced Signe usage
    type LegacyContext = typeof import("./index")["Context"];
    expectTypeOf<LegacyContext>();
  });

  test("GUI registrations expose renderer-neutral typed data", () => {
    type DialogData = { message: string };
    const registration: GuiRegistration<DialogData> = {
      id: "dialog",
      component: () => null,
      renderer: "canvas",
      data: { message: "Hello" },
    };

    expectTypeOf(registration.renderer).toEqualTypeOf<GuiRenderer | undefined>();
    expectTypeOf(registration.data).toEqualTypeOf<DialogData | undefined>();
  });

  test("temporary music exposes a typed transition controller", () => {
    expectTypeOf<RpgMusicManager["enter"]>().toBeFunction();
    expectTypeOf<RpgMusicManager["leave"]>().toBeFunction();
  });
});
