import { createModule } from "@rpgjs/common";
import { defineModule, inject, RpgClientEngine, RpgGui, type RpgClient } from "@rpgjs/client";
import { BattleClientHooks, hideGuisDuringBattle, type BattleCueSound, type BattleScreenOptions } from "@rpgjs/battle-kit";
import { TURN_BATTLE_GUI, type Beat, type BattleResult, type BattleView } from "../core";
import BattleGui from "../ui/battle.ce";
import type { FxFn } from "./fx";
import type { ActionSteps, BeatSteps } from "./director";
import type { Backdrop, Scene } from "./scene";
import { configureSession } from "./session";
import { cues, type TurnBattleCue } from "./sfx";
import { toSpritesheet, type BattleSpritesheet, type BattlerHints, type BattlerInfo } from "./sheets";
import { connectI18n, muted } from "./state";
import { TURN_BATTLE_I18N } from "../core";

export type { BattleSpritesheet, BattlerHints, BattleAnimName, BattlerInfo, RpgFrame } from "./sheets";
export { battlerAnims, readTexture } from "./sheets";
export type { FxFn } from "./fx";
export type { Backdrop, Scene, BattlerModel, EffectSpec, FxPreset } from "./scene";
export type { ActionSteps, BeatSteps } from "./director";
export type { TurnBattleCue } from "./sfx";
export { builtinFx, burst } from "./fx";
export * from "../core";

/**
 * Client hooks of the turn-based battle. A game module declares them under
 * the `turnBattle` key; `provideTurnBattleClient({ hooks })` takes them too.
 *
 * Client side: they change how the battle is shown, never its outcome (the
 * server owns the rules). Standalone RPG and MMORPG.
 *
 * @example
 * ```ts
 * defineModule<RpgClient>({
 *   turnBattle: {
 *     onStart(scene, view) {},
 *     async onPlay(beat, scene, steps) {
 *       if (steps.t !== "action" || steps.beat.ref !== "meteor") return; // default choreography
 *       steps.announce();
 *       await steps.charge({ fx: "summonSigil" });
 *       scene.shake(14, 600);
 *       await steps.strike({ fx: "meteorImpact" });
 *       await steps.fall();
 *       await steps.returnHome();
 *       return false; // played here
 *     },
 *     onEnd(result) {},
 *   },
 * })
 * ```
 */
export interface TurnBattleClientHooks {
  /** The battle scene is shown. */
  onStart?(scene: Scene, view: BattleView): void | Promise<void>;
  /**
   * Every beat, before it is played. Use `steps` (the default choreography cut
   * into steps) to play it your way and return `false`; otherwise the default
   * choreography runs. The numbers always converge on the server's afterwards.
   */
  onPlay?(beat: Beat, scene: Scene, steps: BeatSteps | ActionSteps): boolean | void | Promise<boolean | void>;
  /** The player closed the result screen. */
  onEnd?(result: BattleResult): void | Promise<void>;
}

declare module "@rpgjs/client" {
  interface RpgClient {
    /** Client hooks of the turn-based battle (`@rpgjs/turn-battle`). */
    turnBattle?: TurnBattleClientHooks;
  }
}

/**
 * Options of the client side of the turn-based battle. The screen options
 * (`hideGuis`, `keepGuis`, `onBattleShown`) are the ones of every RPGJS battle
 * system (`BattleScreenOptions` of `@rpgjs/battle-kit`).
 */
export interface TurnBattleClientOptions extends BattleScreenOptions {
  /**
   * Battle hints per battler id, overriding the `battle` field of the RPGJS
   * spritesheet (facing, scale, impact frames, animation names, portrait).
   * Battlers themselves are ordinary RPGJS spritesheets (`spritesheets: [...]`).
   */
  battlers?: Record<string, BattlerHints>;
  /**
   * Builds the spritesheet of a battler the engine does not hold, for instance one drawn from the media of a
   * character. Return undefined to leave the battler to the engine.
   */
  resolveBattler?: (id: string) => BattleSpritesheet | undefined | Promise<BattleSpritesheet | undefined>;
  /** Battle backgrounds by troop `background` id (`default` otherwise): painted layers + ambient particles. */
  backdrops?: Record<string, Backdrop>;
  /** Builds the background of a troop that `backdrops` does not hold, for instance an image of the project. */
  resolveBackdrop?: (id: string) => Backdrop | undefined | Promise<Backdrop | undefined>;
  /** Extra VFX recipes, by skill `fx` id. */
  fx?: Record<string, FxFn>;
  /**
   * Sounds of the cues of the battle: a sound id of the game (registered with `sounds: [...]`), `false` (silence) or
   * a function `(engine, volume) => void`. A cue without one plays a small synthesized sound. The cues are `cursor`,
   * `confirm`, `back` (the menu), `attack`, `cast` (the wind-up of an action), `hit`, `crit`, `hurt` (an impact),
   * `break`, `heal`, `ko`, `limit`, `victory` and `dash`.
   */
  sounds?: Partial<Record<TurnBattleCue, BattleCueSound>>;
  /** Start muted (the player can turn the sound on in the battle). */
  muted?: boolean;
  /** Client hooks declared without a module (see `TurnBattleClientHooks`). */
  hooks?: TurnBattleClientHooks;
}

/**
 * Client side of the turn-based battle: the battle GUI (CanvasEngine
 * components rendered above the map), battlers registered as RPGJS
 * spritesheets, keyboard and gamepad controls, texts (i18n keys
 * `turnBattle.*`), music and client hooks. Pair it with
 * `provideTurnBattleServer` on the server. Standalone RPG and MMORPG.
 *
 * @title provideTurnBattleClient
 * @method provideTurnBattleClient(options?)
 * @param {TurnBattleClientOptions} [options] - Battlers, backgrounds, sounds, screen options and hooks
 * @returns {RpgProvider[]} The providers of the client module
 * @example
 * ```ts
 * import { provideTurnBattleClient } from "@rpgjs/turn-battle/client";
 *
 * export default createClient({
 *   providers: [
 *     provideTurnBattleClient({ sounds: { hit: "sword-hit" }, keepGuis: ["chat"] }),
 *     provideClientModules([]),
 *   ],
 * });
 * ```
 */
export function provideTurnBattleClient(options: TurnBattleClientOptions = {}) {
  const hooks = new BattleClientHooks<TurnBattleClientHooks>("turnBattle", options.hooks);
  const registered = new Set<string>();

  return createModule("TurnBattle", [
    {
      client: defineModule<RpgClient>({
        i18n: TURN_BATTLE_I18N,
        gui: [{ name: TURN_BATTLE_GUI, component: BattleGui }],
        engine: {
          onStart(engine: RpgClientEngine) {
            connectI18n(engine);
            cues.configure(engine, { sounds: options.sounds, muted: options.muted });
            muted.set(!!options.muted);
            configureSession(
              {
                interact: (name, data) => inject(RpgGui).guiInteraction(TURN_BATTLE_GUI, name, data),
                registerSheet: (info: BattlerInfo) => {
                  if (registered.has(info.sheetId)) return;
                  registered.add(info.sheetId);
                  engine.addSpriteSheet(toSpritesheet(info), info.sheetId);
                },
                getSheet: async (id: string) => {
                  const custom = await options.resolveBattler?.(id);
                  if (custom) return custom;
                  // The RPGJS spritesheet as registered (object form; a class is read from its prototype).
                  const read = (sheet: unknown) =>
                    typeof sheet === "function"
                      ? ({ ...(sheet as { prototype: object }).prototype } as BattleSpritesheet)
                      : (sheet as BattleSpritesheet | undefined);
                  const found = engine.getSpriteSheet(id) as unknown;
                  return found instanceof Promise ? found.then(read) : read(found);
                },
                hideOtherGuis: () => hideGuisDuringBattle(TURN_BATTLE_GUI, options),
                music: (bgm) => {
                  if (!bgm) return () => {};
                  void engine.music.enter(bgm, { fadeInMs: 500, fadeOutMs: 400 });
                  return () => void engine.music.leave({ exitDelayMs: 0, fadeOutMs: 600 });
                },
                callHooks: (name, ...args) => hooks.call(name as keyof TurnBattleClientHooks & string, ...args),
              },
              options,
            );
          },
        },
      }),
    },
  ]);
}
