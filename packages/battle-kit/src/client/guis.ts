import { PrebuiltGui } from "@rpgjs/common";
import { inject, RpgGui } from "@rpgjs/client";

/**
 * How a battle shares the screen with the GUIs of the game. Every battle
 * system of RPGJS takes these options in its `provide…Client` function.
 */
export interface BattleScreenOptions {
  /**
   * GUIs hidden while the battle is shown (restored afterwards). By default,
   * every GUI of the game but the battle's, the ones in `keepGuis` and the
   * built-in modal GUIs (dialog, choices, menu, shop, save…), which take the
   * keyboard over the battle when an event opens them.
   */
  hideGuis?: string[];
  /** GUIs that stay visible during a battle (a chat panel, for example). Ignored when `hideGuis` is given. */
  keepGuis?: string[];
  /**
   * Called when a battle is shown; return a function called when it ends. Use it
   * to adapt a GUI of your own (reduce a chat, move a quest tracker).
   */
  onBattleShown?: () => (() => void) | void;
}

/** Built-in GUIs that take the keyboard over a battle when an event opens them. */
export const MODAL_GUIS: string[] = [
  PrebuiltGui.Dialog,
  PrebuiltGui.MainMenu,
  PrebuiltGui.Shop,
  PrebuiltGui.Save,
  PrebuiltGui.Input,
  PrebuiltGui.Gameover,
  PrebuiltGui.Disconnect,
];

type GuiEntry = { display?: { (): boolean; set(value: boolean): void } };

const guiEntries = (): Record<string, GuiEntry> => {
  try {
    return (inject(RpgGui).gui() ?? {}) as Record<string, GuiEntry>;
  } catch {
    return {};
  }
};

/** Is one of the built-in modal GUIs shown (a dialog over the battle…)? Then the battle leaves the keys to it. */
export function modalGuiShown(): boolean {
  const guis = guiEntries();
  return MODAL_GUIS.some((id) => !!guis[id]?.display?.());
}

/**
 * Hides the GUIs of the game while a battle is shown, and keeps them hidden
 * (a map module may show its HUD again meanwhile). Client only.
 *
 * @param battleGui - Id of the GUI of the battle, never hidden
 * @param options - The screen options of the battle system
 * @returns The function that shows them again
 *
 * @example
 * ```ts
 * const restore = hideGuisDuringBattle(TURN_BATTLE_GUI, options);
 * // … battle …
 * restore();
 * ```
 */
export function hideGuisDuringBattle(battleGui: string, options: BattleScreenOptions = {}): () => void {
  const hidden = new Set<NonNullable<GuiEntry["display"]>>();
  const hide = () => {
    const guis = guiEntries();
    const ids =
      options.hideGuis ??
      Object.keys(guis).filter((id) => id !== battleGui && !options.keepGuis?.includes(id) && !MODAL_GUIS.includes(id));
    for (const id of ids) {
      const display = guis[id]?.display;
      if (!display?.()) continue;
      display.set(false);
      hidden.add(display);
    }
  };
  hide();
  const timer = setInterval(hide, 200);
  const leave = options.onBattleShown?.();
  return () => {
    clearInterval(timer);
    hidden.forEach((display) => display.set(true));
    leave?.();
  };
}
