/// <reference path="../types/canvas-engine.d.ts" />
import { createModule, ModulesToken } from "@rpgjs/common";
import { defineModule, inject, RpgClientEngine, RpgGui, type RpgClient } from "@rpgjs/client";
import { TACTICAL_GUI, TACTICAL_HIDDEN_GRAPHIC, messages, type BattleEvent, type BattleState, type Cell } from "../core";
import { world } from "../core/board";
import TacticalHud from "../ui/tactical-hud.ce";
import Battlefield from "../ui/battlefield.ce";
import { field, type UnitView } from "./field";
import { installInput } from "./input-controller";
import { branding, CUE_SOUNDS, connectEngine, connectEventHook, connectHost, notice, reduced, sound, t, TEXTS } from "./state";
import { installTacticalStyles } from "./styles";

installTacticalStyles();

export * from "../core";
export type { Stage } from "./choreography";
export type { UnitView } from "./field";

/** What an `onEvent` hook can drive: the battle kit's presets and screen effects, popups, unit views. */
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
 * Client hooks any module can implement:
 *
 * ```ts
 * defineModule<RpgClient>({
 *   tactical: {
 *     onStart(state) {},
 *     onEvent(event, state, stage) {
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
  onStart?(state: BattleState): void | Promise<void>;
  onEvent?(event: BattleEvent, state: BattleState, stage: TacticalStage): boolean | void | Promise<boolean | void>;
  onEnd?(state: BattleState): void | Promise<void>;
}

declare module "@rpgjs/client" {
  interface RpgClient {
    tactical?: TacticalClientHooks;
  }
}

export interface TacticalClientOptions {
  /** HUD branding (defaults to the `t.title` / `t.subtitle` texts). */
  title?: string;
  subtitle?: string;
  /** Override texts by key (`t.victory`, `t.enemyTurn`… see `messages`). */
  texts?: Record<string, string>;
  /** Map GUIs hidden during a battle (restored afterwards). By default every GUI of the game but the battle's and the ones that take the keyboard over it. */
  hideGuis?: string[];
  /** Sounds of the game for the cues of the interface: `select` (a cell, a menu entry), `confirm` (an order given), `hit` (a blow lands), `back` (a cancel). Without one, a short tone is synthesized. */
  sounds?: Partial<Record<"select" | "confirm" | "hit" | "back", string>>;
  /** GUIs that stay visible during a battle (a chat panel, for example); every other GUI of the game is hidden. Ignored when `hideGuis` is set. */
  keepGuis?: string[];
  /**
   * Called when a battle scene starts; return a function that is called when it ends. Use it to reduce or move a GUI of your own
   * (a chat, a quest tracker) while the battle is shown.
   */
  onBattleScene?: () => (() => void) | void;
  /** Start muted / with reduced motion. */
  muted?: boolean;
  reducedMotion?: boolean;
  /** Hooks declared without a module. */
  hooks?: TacticalClientHooks;
}

const BATTLEFIELD = "tactical-battlefield";
/** 1 × 1 transparent PNG: the player's graphic during a battle. */
const TRANSPARENT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const still = { animations: () => [[{ time: 0, frameX: 0, frameY: 0 }]] };
const hiddenSheet = {
  id: TACTICAL_HIDDEN_GRAPHIC,
  image: TRANSPARENT,
  framesWidth: 1,
  framesHeight: 1,
  textures: { default: still, stand: still, walk: still },
};
/** RPGJS GUIs that take the keyboard over the battle (a dialog or choices shown during it…). */
const MODAL_GUIS = ["rpg-dialog", "rpg-main-menu", "rpg-shop", "rpg-save", "rpg-input", "rpg-gameover", "rpg-disconnect"];

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

/** Hooks of the option and of game modules (`client-tactical-<name>`); resolves with their results. */
function callHooks(options: TacticalClientOptions, name: keyof TacticalClientHooks, ...args: unknown[]): Promise<unknown[]> {
  const out: unknown[] = [];
  const run = async () => {
    const own = options.hooks?.[name] as ((...a: unknown[]) => unknown) | undefined;
    if (own) out.push(await own(...args));
    const hooks = inject<any>(ModulesToken);
    if (!hooks?.callHooks) return out;
    await new Promise<void>((resolve) =>
      hooks.callHooks(`client-tactical-${name}`, ...args).subscribe({
        next: (v: unknown) => out.push(...(Array.isArray(v) ? v : [v])),
        error: (error: unknown) => {
          console.warn(`[Tactical] tactical.${name} hook failed`, error);
          resolve();
        },
        complete: () => resolve(),
      }),
    );
    return out;
  };
  return run().catch((error) => {
    console.warn(`[Tactical] tactical.${name} hook failed`, error);
    return out;
  });
}

/**
 * Client side of the tactical plugin: the HUD (GUI opened by `startTactical`),
 * the battlefield drawn on the map (component animation), input and hooks.
 * Install before `provideClientModules([])`.
 */
export function provideTacticalClient(options: TacticalClientOptions = {}) {
  branding.set({ title: options.title, subtitle: options.subtitle });
  Object.assign(TEXTS, options.texts);
  Object.assign(CUE_SOUNDS, options.sounds);
  // The cues are off until the player turns them on (♪), unless the game gave them sounds of its own.
  if (options.sounds) sound.set(true);
  if (options.muted) sound.set(false);
  if (options.reducedMotion) reduced.set(true);
  let removeInput: (() => void) | undefined;

  return createModule("Tactical", [
    {
      client: defineModule<RpgClient>({
        i18n: messages,
        gui: [{ name: TACTICAL_GUI, component: TacticalHud }],
        spritesheets: [hiddenSheet],
        engine: {
          onStart(engine: RpgClientEngine) {
            connectEngine(engine);
            try {
              engine.getComponentAnimation(BATTLEFIELD);
            } catch {
              engine.addComponentAnimation({ id: BATTLEFIELD, component: Battlefield });
            }
            connectEventHook(async (event, state) =>
              (await callHooks(options, "onEvent", event, state, stage)).includes(false),
            );
            connectHost({
              command: (env) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "command", env),
              pace: (value) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "pace", { pace: value }),
              hold: (unitId, cell) => inject(RpgGui).guiInteraction(TACTICAL_GUI, "hold", { unitId, cell }),
              close: () => inject(RpgGui).guiInteraction(TACTICAL_GUI, "close", {}),
              started: (state) => void callHooks(options, "onStart", state),
              ended: (state) => void callHooks(options, "onEnd", state),
              enter: () => {
                // The battlefield: a CanvasEngine component in the map world.
                const battlefield = engine.getComponentAnimation(BATTLEFIELD);
                battlefield.clear();
                void battlefield.displayEffect({}, { x: 0, y: 0 });
                // The field drives the camera: stop following the player.
                engine.setCameraFollow("tactical-camera");
                // Keep map HUDs hidden for the whole battle, even if the map shows them again.
                const hidden = new Set<{ display: { (): boolean; set(v: boolean): void } }>();
                const hide = () => {
                  const guis = inject(RpgGui).gui() as Record<string, any>;
                  // Every GUI of the game but the ones that take the keyboard over the battle (a dialog…) and the battle itself.
                  for (const id of options.hideGuis ?? Object.keys(guis).filter((name) => name !== TACTICAL_GUI && !options.keepGuis?.includes(name) && !MODAL_GUIS.includes(name))) {
                    const g = guis[id];
                    if (!g?.display?.()) continue;
                    g.display.set(false);
                    hidden.add(g);
                  }
                };
                hide();
                const timer = setInterval(hide, 200);
                const leaveScene = options.onBattleScene?.();
                removeInput?.();
                removeInput = installInput(() => {
                  const guis = inject(RpgGui).gui() as Record<string, any>;
                  return MODAL_GUIS.some((id) => guis[id]?.display?.());
                });
                return () => {
                  clearInterval(timer);
                  hidden.forEach((g) => g.display.set(true));
                  leaveScene?.();
                  removeInput?.();
                  removeInput = undefined;
                  battlefield.clear();
                  engine.setCameraFollow(null);
                };
              },
            });
          },
          onDisconnect() {
            notice.set(t("t.error.connection"));
          },
        },
      }),
    },
  ]);
}
