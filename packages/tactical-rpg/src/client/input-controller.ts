import { battleControls, modalGuiShown } from "@rpgjs/battle-kit";
import type { RpgClientEngine } from "@rpgjs/client";
import {
  action,
  battle,
  busy,
  canPlay,
  cancel,
  confirm,
  cursor,
  endPhase,
  nextUnit,
  planned,
  send,
  help,
  hoverCell,
  cue,
  leave,
  spectator,
  mode,
  menuItems,
  menuIndex,
  setPace,
  pace,
  speed,
  myTeam,
  skillMenu,
  skillOptions,
  skillIndex,
  pickSkill,
  itemMenu,
  itemOptions,
  itemIndex,
  pickItem,
  danger,
} from "./state";
import { MENU_ENTRIES, tacticalBinds, type TacticalControl } from "./keys";

/** A command of the tactical HUD, whatever key or button gave it. */
export type TacticalCommand = TacticalControl;

const DELTA: Partial<Record<TacticalCommand, [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FORWARD: TacticalCommand[] = ["down", "right"];
const BACKWARD: TacticalCommand[] = ["up", "left"];

/** The opposing side is playing (AI or opponent): the action control held fast-forwards it. */
const theirTurn = () => {
  const state = battle();
  return !!state?.started && !state.winner && state.phase !== myTeam();
};

/** Plays a command of the HUD (keyboard, gamepad, or a test). */
export function dispatch(command: TacticalCommand): void {
  if (help()) {
    if (command === "escape") help.set(false);
    return;
  }
  const state = battle();
  if (!state) return;
  // The danger zone is only shown: anyone may toggle it, at any time.
  if (command === "danger") return void danger.set(!danger());
  // A spectator only leaves or closes the result screen.
  if (spectator() && !state.winner) {
    if (command === "escape") leave();
    return;
  }
  if (state.winner) {
    if (!busy() && command === "action") leave();
    return;
  }
  if (!state.started && command === "action") {
    send({ type: "start" });
    return;
  }
  if (busy()) return;
  if (command === "escape") {
    cue("back");
    cancel();
    return;
  }
  if (!canPlay()) return;
  const entry = command.startsWith("entry") ? Number(command.slice(5)) : 0;
  const list = skillMenu() ? { options: skillOptions(), index: skillIndex, pick: pickSkill } : itemMenu() ? { options: itemOptions(), index: itemIndex, pick: pickItem } : null;
  if (list) {
    const { options, index, pick } = list;
    if (!options.length) return;
    if (FORWARD.includes(command)) {
      index.set((index() + 1) % options.length);
      cue("select");
    }
    if (BACKWARD.includes(command)) {
      index.set((index() + options.length - 1) % options.length);
      cue("select");
    }
    if (command === "action") pick(options[index()]?.id);
    if (entry === 1 || entry === 2) pick(options[entry - 1]?.id);
    return;
  }
  if (command === "action") return void confirm();
  // Action menu: up and down go through its entries (the grid cursor stays).
  if (mode() === "menu" && (command === "up" || command === "down")) {
    const n = menuItems().length;
    menuIndex.set((menuIndex() + (command === "up" ? n - 1 : 1)) % n);
    cue("select");
    return;
  }
  if (command === "nextUnit") return void nextUnit();
  if (command === "endPhase") return void endPhase();
  // The keys of the entries of the menu (2, 3…) follow what the menu offers; 1 goes back to the move.
  if (entry === 1) return void action("move");
  if (entry) {
    const item = menuItems().find((i) => i.slot === entry);
    if (item && !item.disabled) action(item.id);
    return;
  }
  const delta = DELTA[command];
  if (delta) {
    const p = cursor();
    cursor.set({
      x: Math.max(0, Math.min(state.board.columns - 1, p.x + delta[0])),
      y: Math.max(0, Math.min(state.board.rows - 1, p.y + delta[1])),
    });
    hoverCell(cursor());
    planned.set(null);
  }
}

/**
 * The controls of the tactical HUD: the keyboard controls of the game and the
 * shared gamepad mapping of the RPGJS GUIs. A confirms (held during the
 * opposing turn: fast-forward), B or Start goes back, the d-pad or the stick
 * moves the cursor, R selects the next unit, Y ends the phase, X is the second
 * entry of the menu. The keys of the commands of the tactical battle are read
 * from `keyboardControls` too (`endPhase`, `danger`, `entry1`…`entry6`, see
 * `tacticalBinds`). A dialog shown over the battle, or a text field the player
 * writes in, keeps the keys.
 */
export function tacticalControls(engine: RpgClientEngine): Record<string, unknown> {
  const to = (command: TacticalCommand) => () => dispatch(command);
  const binds = tacticalBinds((engine.globalConfig?.keyboardControls ?? {}) as Record<string, unknown>);
  const entries = Object.fromEntries(
    Array.from({ length: MENU_ENTRIES }, (_, i) => {
      const name = `entry${i + 1}` as TacticalCommand;
      // X (button 2) is the first entry after the move.
      return [name, { bind: binds[name], ...(i === 1 ? { button: 2 } : {}), keyDown: to(name) }];
    }),
  );
  return battleControls(engine, {
    up: to("up"),
    down: to("down"),
    left: to("left"),
    right: to("right"),
    action: {
      keyDown: () => (theirTurn() ? setPace(3) : dispatch("action")),
      keyUp: () => {
        if (pace() === 3) setPace(speed());
      },
    },
    escape: to("escape"),
    tabNext: to("nextUnit"),
    extra: {
      endPhase: { bind: binds.endPhase, button: 3, keyDown: to("endPhase") },
      danger: { bind: binds.danger, keyDown: to("danger") },
      ...entries,
    },
    paused: modalGuiShown,
  });
}
