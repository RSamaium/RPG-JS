import { createModule, ModulesToken } from "@rpgjs/common";
import { defineModule, inject, RpgClientEngine, RpgGui, type RpgClient } from "@rpgjs/client";
import { TURN_BATTLE_GUI, type Beat, type BattleResult, type BattleView } from "../core";
import BattleGui from "../ui/battle.ce";
import { injectBattleStyles } from "../ui/styles";
import type { FxFn } from "./fx";
import type { ActionSteps, BeatSteps } from "./director";
import { installInput } from "./input";
import type { Backdrop, Scene } from "./scene";
import { configureSession } from "./session";
import { configureSfx, sfxPlayers, type SfxId, type SfxSound } from "./sfx";
import { toSpritesheet, type BattleSpritesheet, type BattlerHints, type BattlerInfo } from "./sheets";
import { followLocale, muted, TEXTS } from "./state";

export type { BattleSpritesheet, BattlerHints, BattleAnimName, BattlerInfo, RpgFrame } from "./sheets";
export { battlerAnims, readTexture } from "./sheets";
export type { FxFn } from "./fx";
export type { Backdrop, Scene, BattlerModel, EffectSpec, FxPreset } from "./scene";
export type { ActionSteps, BeatSteps } from "./director";
export type { SfxId, SfxSound } from "./sfx";
export { builtinFx, ELEMENT_COLORS, burst, playPreset, hasPreset, elementColor } from "./fx";
export { scene } from "./scene";
export { TEXTS } from "./state";
export { TEXTS_BY_LOCALE } from "./texts";
export * from "../core";

/**
 * Client hooks any module can implement:
 *
 * ```ts
 * defineModule<RpgClient>({
 *   battle: {
 *     onStart(scene, view) {},
 *     async onBeat(beat, scene, steps) {
 *       if (steps.t !== "action" || steps.beat.ref !== "meteor") return; // default choreography
 *       steps.announce();
 *       await steps.charge({ fx: "summonSigil" });
 *       scene.shake(14, 600);
 *       await steps.strike({ fx: "meteorImpact" });
 *       await steps.fall();
 *       await steps.returnHome();
 *     },
 *     onEnd(result) {},
 *   },
 * })
 * ```
 */
export interface TurnBattleClientHooks {
  onStart?(scene: Scene, view: BattleView): void | Promise<void>;
  /**
   * Every beat, before it is played. Use `steps` (the default choreography cut
   * into steps) to play it your way, or return `false` to play it entirely
   * yourself; otherwise the default choreography runs. The numbers always
   * converge on the server's afterwards.
   */
  onBeat?(beat: Beat, scene: Scene, steps: BeatSteps | ActionSteps): boolean | void | Promise<boolean | void>;
  onEnd?(result: BattleResult): void | Promise<void>;
}

declare module "@rpgjs/client" {
  interface RpgClient {
    battle?: TurnBattleClientHooks;
  }
}

export interface TurnBattleClientOptions {
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
  /** Override UI texts (keys of `TEXTS_BY_LOCALE`) over the catalog of the language of the game (`en`, `fr`). */
  texts?: Record<string, string>;
  /** Map GUIs hidden while a battle is shown (restored afterwards). */
  hideGuis?: string[];
  /**
   * Sounds: map battle cues to RPGJS sound ids (registered with `sounds: [...]`), to `false` (silence) or to a
   * function `(engine, volume) => void` that plays it, otherwise small synthesized sounds are used. The cues are
   * `cursor`, `confirm`, `back` (the menu), `attack`, `cast` (the wind-up of an action), `hit`, `crit`, `hurt` (an
   * impact), `break`, `heal`, `ko`, `limit`, `victory` and `dash`.
   */
  sounds?: Partial<Record<SfxId, SfxSound>>;
  muted?: boolean;
  /**
   * Called when a battle is shown, to adapt the rest of the interface (a chat reduced to its pill, for instance). Return what
   * restores it: it is called when the battle ends.
   */
  onBattleShown?: () => () => void;
}

const DEFAULT_HIDDEN_GUIS = ["hud", "rpg-hotbar", "rpg-notification"];

/**
 * Client side of the turn battle plugin: the battle GUI (CanvasEngine
 * components rendered above the map), battlers registered as RPGJS
 * spritesheets, keyboard/gamepad input, music and client hooks.
 */
export function provideTurnBattleClient(options: TurnBattleClientOptions) {
  Object.assign(TEXTS, options.texts);
  injectBattleStyles();
  let removeInput: (() => void) | undefined;
  const registered = new Set<string>();

  return createModule("TurnBattle", [
    {
      client: defineModule<RpgClient>({
        gui: [{ name: TURN_BATTLE_GUI, component: BattleGui }],
        engine: {
          onStart(engine: RpgClientEngine) {
            const e = engine as any;
            followLocale(() => e.getLocale?.() ?? "en");
            configureSfx({
              muted: options.muted,
              sounds: sfxPlayers(options.sounds, e),
              engine: e,
            });
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
                    typeof sheet === "function" ? ({ ...(sheet as any).prototype } as BattleSpritesheet) : (sheet as BattleSpritesheet | undefined);
                  const found = e.getSpriteSheet?.(id);
                  return found instanceof Promise ? found.then(read) : read(found);
                },
                hideOtherGuis: () => {
                  // Keep map HUDs hidden for the whole battle, even if the map
                  // shows them again (streaming, level up…); restore them after.
                  const hidden = new Set<{ display: { (): boolean; set(v: boolean): void } }>();
                  const hide = () => {
                    const guis = inject(RpgGui).gui() as Record<string, any>;
                    for (const id of options.hideGuis ?? DEFAULT_HIDDEN_GUIS) {
                      const g = guis[id];
                      if (!g?.display?.()) continue;
                      g.display.set(false);
                      hidden.add(g);
                    }
                  };
                  hide();
                  const timer = setInterval(hide, 200);
                  const restore = options.onBattleShown?.();
                  return () => {
                    clearInterval(timer);
                    hidden.forEach((g) => g.display.set(true));
                    restore?.();
                  };
                },
                music: (bgm) => {
                  if (!bgm || !e.music) return () => {};
                  void e.music.enter(bgm, { fadeInMs: 500, fadeOutMs: 400 });
                  return () => e.music.leave({ exitDelayMs: 0, fadeOutMs: 600 });
                },
                callHooks: (name, ...args) => {
                  const hooks = inject<any>(ModulesToken);
                  const out: unknown[] = [];
                  if (!hooks?.callHooks) return Promise.resolve(out);
                  return new Promise((resolve) =>
                    hooks.callHooks(`client-battle-${name}`, ...args).subscribe({
                      next: (v: unknown) => out.push(...(Array.isArray(v) ? v : [v])),
                      error: (error: unknown) => {
                        console.warn(`[TurnBattle] battle.${name} hook failed`, error);
                        resolve(out);
                      },
                      complete: () => resolve(out),
                    }),
                  );
                },
              },
              options,
            );
            removeInput?.();
            removeInput = installInput();
          },
        },
      }),
    },
  ]);
}
