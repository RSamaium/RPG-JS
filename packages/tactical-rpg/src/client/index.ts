/// <reference path="../types/canvas-engine.d.ts" />
import { createModule } from "@rpgjs/common";
import { defineModule, inject, RpgClientEngine, RpgGui, type RpgClient } from "@rpgjs/client";
import { BattleClientHooks, hideGuisDuringBattle, type BattleCueSound, type BattleScreenOptions } from "@rpgjs/battle-kit";
import { TACTICAL_GUI, TACTICAL_HIDDEN_GRAPHIC } from "../core";
import { TACTICAL_I18N } from "../core/messages";
import type { BattleEvent, BattleState, Cell } from "../core/types";
import { world } from "../core/board";
import TacticalHud from "../ui/tactical-hud.ce";
import Battlefield from "../ui/battlefield.ce";
import { field, type UnitView } from "./field";
import { connectEngine, connectEventHook, connectHost, cues, notice, reduced, sound, t, type TacticalCue } from "./state";

// The public surface of the client side: the module, its options and hooks, the texts, the walking sheets of the battlers, and the
// types the hooks receive. The rules, the board and the HUD state stay internal.
export { TACTICAL_I18N } from "../core/messages";
export { walkingSheet } from "../core/data";
export type { UnitView } from "./field";
export type { TacticalCue } from "./state";
export type { TacticalControl } from "./keys";
export type { AttackStyle, BattleEvent, BattlePlayer, BattleState, Board, Cell, Role, RoleDef, SkillDef, ItemDef, Team, Unit } from "../core/types";

/**
 * What an `onPlay` hook can drive: the effect presets and screen impacts of `@rpgjs/battle-kit`, popups, unit views. Client only:
 * it changes what is shown, never the outcome.
 *
 * @example
 * ```ts
 * onPlay(event, state, stage) {
 *   const at = stage.world(state.units.find((u) => u.id === event.targetId)!);
 *   stage.popup("Critical!", at.x, at.y, { color: 0xffd166, big: true });
 * }
 * ```
 */
export interface TacticalStage {
  /** CanvasEngine presets (`fx.play("fireball", x, y)`), in map world coordinates. */
  fx: typeof field.fx;
  /** Shake, hitstop, zoom blur, shockwave, chromatic aberration. */
  screen: typeof field.screen;
  popup(text: string, x: number, y: number, o?: { color?: number; big?: boolean }): void;
  /** Centre of a grid cell in map pixels. */
  world(cell: Cell): Cell;
  /** Reactive view of a unit (position, flash, alpha…). */
  unit(id: string): UnitView | undefined;
}

/**
 * Client hooks of the tactical battle. A game module declares them under the
 * `tactical` key; `provideTacticalClient({ hooks })` takes them too.
 *
 * Client side: they change how the battle is shown, never its outcome (the
 * server owns the rules). Standalone RPG and MMORPG.
 *
 * @example
 * ```ts
 * defineModule<RpgClient>({
 *   tactical: {
 *     onStart(state) {},
 *     onPlay(event, state, stage) {
 *       if (event.kind !== "skill" || event.skillId !== "meteor") return; // default choreography
 *       const target = state.units.find((u) => u.id === event.targetId)!;
 *       const at = stage.world(target);
 *       stage.fx.play("meteorImpact", at.x, at.y);
 *       stage.screen.shakeScreen(14, 600);
 *       return false; // played here: skip the default effects (units still move)
 *     },
 *     onEnd(state) {},
 *   },
 * })
 * ```
 */
export interface TacticalClientHooks {
  /** The first state of a battle is shown. */
  onStart?(state: BattleState): void | Promise<void>;
  /**
   * Every event, before it is played: return `false` to play its effects yourself (the units still move). A move the local player
   * walked before sending it is given when the server confirms it, and what is returned is not used for it.
   */
  onPlay?(event: BattleEvent, state: BattleState, stage: TacticalStage): boolean | void | Promise<boolean | void>;
  /** The HUD closes on a battle. */
  onEnd?(state: BattleState): void | Promise<void>;
}

declare module "@rpgjs/client" {
  interface RpgClient {
    /** Client hooks of the tactical battle (`@rpgjs/tactical-rpg`). */
    tactical?: TacticalClientHooks;
  }
}

/**
 * Options of the client side of the tactical battle. The screen options
 * (`hideGuis`, `keepGuis`, `onBattleShown`) are the ones of every RPGJS battle
 * system (`BattleScreenOptions` of `@rpgjs/battle-kit`). The texts are the
 * `tactical.*` keys of the i18n service: a game overrides them in its own
 * module. The keys are the `keyboardControls` of the game (see
 * `TacticalControl`). Client only.
 *
 * @example
 * ```ts
 * provideTacticalClient({ keepGuis: ["chat"], sounds: { confirm: "ui-ok", hit: false }, reducedMotion: true });
 * ```
 */
export interface TacticalClientOptions extends BattleScreenOptions {
  /**
   * Sounds of the cues of the HUD: `select` (a cell, a menu entry), `confirm` (an order given), `hit` (a blow lands), `back` (a
   * cancel). A sound id of the game, `false` (silence) or a function `(engine, volume) => void`; without one, a short tone is
   * synthesized. The cues play once the player turns the sound on (♪), at once when the game gives sounds.
   */
  sounds?: Partial<Record<TacticalCue, BattleCueSound>>;
  /** Start muted. */
  muted?: boolean;
  /** Start with reduced motion (no screen impacts). */
  reducedMotion?: boolean;
  /** Client hooks declared without a module (see `TacticalClientHooks`). */
  hooks?: TacticalClientHooks;
}

const BATTLEFIELD = "tactical-battlefield";
/** 1 × 1 transparent PNG: the player's graphic during a battle. */
const TRANSPARENT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
// One frame held for a second (an end marker): an animation of zero length would keep the sprite busy forever.
const still = { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }, { time: 60 }]] };
const hiddenSheet = {
  id: TACTICAL_HIDDEN_GRAPHIC,
  image: TRANSPARENT,
  framesWidth: 1,
  framesHeight: 1,
  textures: { default: still, stand: still, walk: still },
};
const stage: TacticalStage = {
  fx: field.fx,
  screen: field.screen,
  popup: (text, x, y, o) => field.popup(text, x, y, o),
  world: (cell) => {
    const b = field.board();
    return b ? world(b, cell) : cell;
  },
  unit: (id) => field.unit(id),
};

/**
 * Client side of the tactical battle: the HUD (the GUI opened by
 * `startTacticalBattle`), the battlefield drawn on the map (component
 * animation), keyboard and gamepad controls, texts (i18n keys `tactical.*`),
 * sound cues and client hooks. Pair it with `provideTacticalServer`.
 * Standalone RPG and MMORPG.
 *
 * @title provideTacticalClient
 * @method provideTacticalClient(options?)
 * @param {TacticalClientOptions} [options] - Sounds, screen options, motion and hooks
 * @returns {RpgProvider[]} The providers of the client module
 * @example
 * ```ts
 * import { provideTacticalClient } from "@rpgjs/tactical-rpg/client";
 *
 * export default createClient({
 *   providers: [provideTacticalClient({ keepGuis: ["chat"], sounds: { confirm: "ui-ok" } }), provideClientModules([])],
 * });
 * ```
 */
export function provideTacticalClient(options: TacticalClientOptions = {}) {
  const hooks = new BattleClientHooks<TacticalClientHooks>("tactical", options.hooks);

  return createModule("Tactical", [
    {
      client: defineModule<RpgClient>({
        i18n: TACTICAL_I18N,
        gui: [{ name: TACTICAL_GUI, component: TacticalHud }],
        spritesheets: [hiddenSheet],
        engine: {
          onStart(engine: RpgClientEngine) {
            connectEngine(engine);
            cues.configure(engine, { sounds: options.sounds });
            // The cues are off until the player turns them on (♪), unless the game gave them sounds of its own.
            sound.set(!!options.sounds && !options.muted);
            reduced.set(!!options.reducedMotion);
            try {
              engine.getComponentAnimation(BATTLEFIELD);
            } catch {
              engine.addComponentAnimation({ id: BATTLEFIELD, component: Battlefield });
            }
            connectEventHook((event, state) => hooks.replaced("onPlay", event, state, stage));
            connectHost({
              command: (env) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "command", env),
              pace: (value) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "pace", { pace: value }),
              hold: (unitId, cell) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "hold", { unitId, cell }),
              close: () => inject(RpgGui).guiInteraction(TACTICAL_GUI, "close", {}),
              started: (state) => void hooks.call("onStart", state),
              ended: (state) => void hooks.call("onEnd", state),
              enter: () => {
                // The battlefield: a CanvasEngine component in the map world.
                const battlefield = engine.getComponentAnimation(BATTLEFIELD);
                battlefield.clear();
                void battlefield.displayEffect({}, { x: 0, y: 0 });
                // The field drives the camera: stop following the player.
                engine.setCameraFollow("tactical-camera");
                // Keep the GUIs of the game hidden for the whole battle, even if the map shows them again.
                const restore = hideGuisDuringBattle(TACTICAL_GUI, options);
                // Only the battle is drawn on the map: its events and players are hidden for this client (they stay on the map).
                const showMapObjects = engine.hideMapObjects({ events: true, players: true });
                return () => {
                  showMapObjects();
                  restore();
                  battlefield.clear();
                  engine.setCameraFollow(null);
                };
              },
            });
          },
          onDisconnect() {
            notice.set(t("tactical.error.connection"));
          },
        },
      }),
    },
  ]);
}
