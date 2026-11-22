import { signal, type WritableSignal } from "canvasengine";
import type { BattleResult, Side } from "../core";
import type { TargetInfo } from "./target-info";

export { followLocale, t, TEXTS } from "./texts";

/** UI-facing signals. The director writes them, the .ce components read them. */

export interface UiCombatant {
  id: string;
  name: string;
  side: Side;
  battler: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  limit: number | null;
  limitMax: number;
  stagger: number | null;
  staggerMax: number;
  broken: boolean;
  guarding: boolean;
  dead: boolean;
  /** Increments on each hit taken (restarts the panel shake animation). */
  hits: number;
  /** Coop: name of the player commanding this unit ("" in solo). */
  tag: string;
  /** Unit of the local player (coop). */
  mine: boolean;
}

export interface OrderChip {
  key: string;
  id: string;
  side: Side;
  battler: string;
  name: string;
  current: boolean;
  /** Position where the acting hero lands if the hovered command is used. */
  landing: boolean;
}

export interface MenuEntry {
  id: string;
  label: string;
  icon?: string;
  hint?: string;
  detail?: string;
  disabled?: boolean;
  special?: boolean;
}

export interface FaceData {
  url: string;
  cols: number;
  rows: number;
  cw: number;
  ch: number;
  x: number;
  y: number;
  size: number;
  /** Cell of the idle pose. */
  col: number;
  row: number;
  flip: boolean;
}

export type Phase = "closed" | "loading" | "playing" | "command" | "target" | "waiting" | "result";

export const phase = signal<Phase>("closed");
/** How dark the map is while the battle loads (0 clear, 1 dark): the map fades out at once, instead of staying still until the battle is drawn. */
export const entering = signal(0);
/**
 * One signal per combatant: `@for … track id` keeps DOM nodes alive, so the
 * rows read their numbers from these signals (bars animate with CSS).
 */
export const partyIds = signal<string[]>([]);
export const foeIds = signal<string[]>([]);
const members = new Map<string, WritableSignal<UiCombatant>>();
export function member(id: string): WritableSignal<UiCombatant> {
  let s = members.get(id);
  if (!s) {
    // Typed as a plain value signal: rows always replace the whole object.
    s = signal<UiCombatant | null>({
      id, name: "", side: "ally", battler: "", hp: 0, maxHp: 1, sp: 0, maxSp: 1,
      limit: null, limitMax: 0, stagger: null, staggerMax: 0, broken: false, guarding: false, dead: false, hits: 0,
      tag: "", mine: true,
    }) as unknown as WritableSignal<UiCombatant>;
    members.set(id, s);
  }
  return s;
}
export const actorId = signal<string | null>(null);
/** Coop: local player id and the names of the players in the battle. */
export const viewer = signal<string>("");
export const players = signal<Record<string, string>>({});
/** Coop: whose turn it is while the local player waits. */
export const waitingFor = signal<{ unit: string; player: string } | null>(null);
/** The local player only watches the battle. */
export const spectating = signal(false);
/** Number of players watching. */
export const audience = signal(0);
/** Player versus player battle: "Abandonner" is offered. */
export const pvp = signal(false);
/** "Abandonner" pressed once: the next press confirms (a few seconds). */
export const surrenderArmed = signal(false);
/** This player already gave up (waiting for the team, or the end). */
export const surrendered = signal(false);
/** Seconds left to choose a command (coop turn timer), null when untimed. */
export const countdown = signal<number | null>(null);
export const order = signal<OrderChip[]>([]);
export const previewing = signal(false);
export const menuLevel = signal<"root" | "skills" | "items" | "options">("root");
/** Command whose sub-menu is open (menu level `options`). */
export const menuCommand = signal<string | null>(null);
export const menuIndex = signal(0);
export const menuEntries = signal<MenuEntry[]>([]);
export const menuTitle = signal("");
export const targetName = signal("");
/** What the HUD tells of the one target being chosen; null when choosing all, or nothing. */
export const targetInfo = signal<TargetInfo | null>(null);


export const banner = signal<{ text: string; side: Side; key: number } | null>(null);
export const cutin = signal<{ name: string; line: string; battler: string; key: number } | null>(null);
export const result = signal<BattleResult | null>(null);
/** Rolling counters shown on the result screen. */
export const shownExp = signal(0);
export const shownGold = signal(0);
export const muted = signal(false);
/** RPGJS cinematic currently played (limit burst video). */
export const cinematic = signal<{ src: string; allowSkip: boolean; bgm: "duck" } | null>(null);
export const speed = signal<1 | 2 | 3>(1);
export const toast = signal<{ text: string; key: number } | null>(null);
export const faces = signal<Record<string, FaceData>>({});
export const reduced = signal(
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
);

/** CSS for a battler portrait cropped from its atlas (idle frame 0). */
export function faceStyle(battler: string, size: number) {
  const f = faces()[battler];
  if (!f) return {};
  const scale = size / (f.size * f.cw);
  return {
    backgroundImage: `url("${f.url}")`,
    backgroundSize: `${f.cols * f.cw * scale}px ${f.rows * f.ch * scale}px`,
    backgroundPosition: `${-((f.col + f.x) * f.cw * scale - size / 2)}px ${-((f.row + f.y) * f.ch * scale - size / 2)}px`,
    transform: f.flip ? "scaleX(-1)" : "none",
  };
}

let seq = 0;
export const nextKey = () => ++seq;

export function showToast(text: string) {
  const key = nextKey();
  toast.set({ text, key });
  setTimeout(() => toast()?.key === key && toast.set(null), 2200);
}
