import { battleControls, modalGuiShown } from "@rpgjs/battle-kit";
import type { RpgClientEngine } from "@rpgjs/client";
import { back, confirm, cycleSpeed, inBattle, moveMenu, skipCutin } from "./session";
import { cinematic, cutin, phase } from "./state";

/** Runs a menu command unless the choreography is playing; any command skips a cut-in. */
const menu = (fn: () => void, skips = false) => () => {
  if (cutin()) return void (skips && skipCutin());
  if (phase() === "playing") return;
  fn();
};

/**
 * The controls of the battle GUI: the keyboard controls of the game and the
 * shared gamepad mapping of the RPGJS GUIs (A confirms, B or Start goes back,
 * the d-pad or the stick moves through the menu, R changes the speed).
 * A cinematic or a dialog shown over the battle keeps its own keys.
 */
export function turnBattleControls(engine: RpgClientEngine): Record<string, unknown> {
  return battleControls(engine, {
    up: menu(() => moveMenu(-1)),
    left: menu(() => moveMenu(-1)),
    down: menu(() => moveMenu(1)),
    right: menu(() => moveMenu(1)),
    action: menu(confirm, true),
    escape: menu(back, true),
    tabNext: () => {
      if (!cutin()) cycleSpeed();
    },
    paused: () => !inBattle() || !!cinematic() || modalGuiShown(),
  });
}
