import { PrebuiltGui } from "@rpgjs/common";
import { inject, RpgGui } from "@rpgjs/client";

/**
 * How a battle shares the screen with the GUIs of the game. Every battle
 * system of RPGJS takes these options in its `provide…Client` function.
 * Client only; works the same in standalone RPG and MMORPG mode.
 *
 * @title BattleScreenOptions
 * @example
 * ```ts
 * provideTurnBattleClient({
 *   keepGuis: ["chat"],
 *   onBattleShown: () => {
 *     questTracker.collapse();
 *     return () => questTracker.expand();
 *   },
 * });
 * ```
 */
export interface BattleScreenOptions {
  /**
   * GUIs hidden while the battle is shown (restored afterwards). By default,
   * every GUI of the game but the battle's, the ones in `keepGuis` and the
   * built-in modal GUIs (dialog, choices, menu, shop, save…), which take the
   * keyboard over the battle when an event opens them.
   *
   * @prop {string[]} [hideGuis]
   * @memberof BattleScreenOptions
   */
  hideGuis?: string[];
  /**
   * GUIs that stay visible during a battle (a chat panel, for example).
   * Ignored when `hideGuis` is given.
   *
   * @prop {string[]} [keepGuis]
   * @memberof BattleScreenOptions
   */
  keepGuis?: string[];
  /**
   * Called when a battle is shown; return a function called when it ends. Use it
   * to adapt a GUI of your own (reduce a chat, move a quest tracker).
   *
   * @prop {() => (() => void) | void} [onBattleShown]
   * @memberof BattleScreenOptions
   */
  onBattleShown?: () => (() => void) | void;
}

/** Built-in GUIs that take the keyboard over a battle when an event opens them. */
export const MODAL_GUIS: readonly string[] = Object.freeze([
  PrebuiltGui.Dialog,
  PrebuiltGui.MainMenu,
  PrebuiltGui.Shop,
  PrebuiltGui.Save,
  PrebuiltGui.Input,
  PrebuiltGui.Gameover,
  PrebuiltGui.Disconnect,
]);

const guiService = (): RpgGui | undefined => {
  try {
    return inject(RpgGui);
  } catch {
    return undefined;
  }
};

/**
 * Is one of the built-in modal GUIs shown (dialog, main menu, shop, save,
 * input, game over, disconnect)? Then the battle leaves the keys to it.
 * False when the GUI service is not available. Client only.
 *
 * @title modalGuiShown
 * @method modalGuiShown()
 * @returns {boolean} True while a built-in modal GUI is displayed
 * @example
 * ```ts
 * const controls = signal(battleControls(engine, { action: confirm, paused: modalGuiShown }));
 * ```
 */
export function modalGuiShown(): boolean {
  const gui = guiService();
  return !!gui && MODAL_GUIS.some((id) => gui.isDisplaying(id));
}

/**
 * Hides the GUIs of the game while a battle is shown, and keeps them hidden
 * (a map module may show its HUD again meanwhile). Both CanvasEngine and Vue
 * GUIs are hidden through `RpgGui.hide`. When the battle ends, a GUI is shown
 * again with its current data, unless the game closed it meanwhile. The GUIs
 * are checked again every 200 ms until the returned function is called.
 * Client only.
 *
 * @title hideGuisDuringBattle
 * @method hideGuisDuringBattle(battleGui, options?)
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
  /** The GUIs hidden by the battle, with the open id they had (a server GUI closed meanwhile is not shown again). */
  const hidden = new Map<string, string | undefined>();
  const hide = () => {
    const gui = guiService();
    if (!gui) return;
    const ids =
      options.hideGuis ??
      Object.keys(gui.getAll()).filter((id) => id !== battleGui && !options.keepGuis?.includes(id) && !MODAL_GUIS.includes(id));
    for (const id of ids) {
      if (!gui.isDisplaying(id)) continue;
      const instance = gui.get(id)!;
      const openId = instance.openId;
      gui.hide(id);
      // Kept, so a `gui.exit` of the server for this opening still finds it and closes it for good.
      instance.openId = openId;
      hidden.set(id, openId);
    }
  };
  hide();
  const timer = setInterval(hide, 200);
  const leave = options.onBattleShown?.();
  return () => {
    clearInterval(timer);
    const gui = guiService();
    if (gui) {
      for (const [id, openId] of hidden) {
        const instance = gui.get(id);
        // Closed by the game during the battle (its open id was cleared), or shown again already.
        if (!instance || instance.openId !== openId || gui.isDisplaying(id)) continue;
        gui.display(id, instance.data(), [], openId);
      }
    }
    hidden.clear();
    leave?.();
  };
}

/**
 * The font of the game's GUIs (the `--rpg-ui-font` variable of the
 * `@rpgjs/ui-css` theme), for the texts a battle draws on the canvas (damage
 * numbers, names): a battle never hard-codes a font, and a theme restyles it
 * with the rest of the HUD. Client only.
 *
 * @title battleFont
 * @method battleFont(fallback?)
 * @param fallback - Font used when the theme sets none. Default: `"sans-serif"`
 * @returns A CSS font-family list
 * @example
 * ```ts
 * const style = { fontFamily: battleFont(), fontSize: 28 }
 * ```
 */
export function battleFont(fallback = "sans-serif"): string {
  if (typeof document === "undefined" || typeof getComputedStyle !== "function") return fallback;
  const themed = getComputedStyle(document.documentElement).getPropertyValue("--rpg-ui-font").trim();
  return themed || fallback;
}
