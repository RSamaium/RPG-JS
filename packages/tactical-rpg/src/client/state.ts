import { portraitStyle } from "./portraits";
import { signal, computed } from "canvasengine";
import { BattleCues, synthTone } from "@rpgjs/battle-kit";
import type { RpgClientEngine } from "@rpgjs/client";
import type {
  BattleState,
  Cell,
  Command,
  BattleEvent,
  BattlePacket,
  Team,
  Unit,
} from "../core/types";
import { TACTICAL_I18N } from "../core/messages";
import { affected, damage, taken, targetable } from "../core/rules";
import { distance, reachable, key } from "../core/board";
import { skillFor, skillsOf, skillUnavailable } from "../core/skills";
import { actionTiming, itemTiming } from "./choreography";
import { DEFAULT_ROLES, roleOf } from "../core/roles";
import { keyLabel, keyParams, tacticalBinds, type TacticalControl } from "./keys";

export const battle = signal<BattleState | null>(null);
export const selected = signal("");
export const hovered = signal<Cell|null>(null);
export const skillMenu = signal(false);
export const itemMenu = signal(false);
export const itemIndex = signal(0);
export const selectedItem = signal("");
export const selectedSkill = signal("");
export const skillIndex = signal(0);
export const cursor = signal<Cell>({ x: 4, y: 5 });
/**
 * Command flow of the selected unit: `move` (blue cells) → `menu` (actions
 * next to the unit) → `attack` / `skill` (targets). Escape goes back one step.
 */
export const mode = signal<"move" | "menu" | "attack" | "skill" | "item" | "select">("select");
/**
 * Move previewed locally (not sent yet): the unit walks there at once and can
 * go back with Escape. It is sent with the action that follows.
 */
export const staged = signal<{ unitId: string; from: Cell; cell: Cell; path: Cell[]; at: number } | null>(null);
/** Highlighted entry of the action menu (keyboard / gamepad). */
export const menuIndex = signal(0);
/**
 * Route drawn cell by cell over the blue cells (the arrow follows the
 * pointer); the move uses it instead of the shortest path.
 */
export const route = signal<Cell[]>([]);
/** Danger zone shown (key R): every cell the opposing side can attack next turn. */
export const danger = signal(false);
/** Speed chosen by the local player (1 or 2); 3 while Space fast-forwards the enemy turn. */
export const speed = signal<1 | 2>(1);
/**
 * Animation speed of the battle, shared by every client: from the latest packet
 * received, even one still queued behind an animation (it applies at once).
 */
const livePace = signal(1);
export const pace = computed(() => livePace());
/** Seconds left to the side that plays its phase, when the battle times it (`null`: no limit). */
export const timeLeft = signal<number | null>(null);
/** When the phase being played ends by itself, on the clock of the page (0: not timed). */
let deadline = 0;
let ticking: ReturnType<typeof setInterval> | undefined;
function tick() {
  const left = deadline ? Math.max(0, Math.ceil((deadline - performance.now()) / 1000)) : null;
  if (left !== timeLeft()) timeLeft.set(left);
}
/** Reads the time of the phase from a state the server just sent (`left` is what remained when it left the server). */
function followTimer(state: BattleState) {
  deadline = state.timer && !state.winner ? performance.now() + state.timer.left : 0;
  clearInterval(ticking);
  if (deadline) ticking = setInterval(tick, 250);
  tick();
}
export const planned = signal<Command | null>(null);
export const busy = signal(false),
  loaded = signal(false),
  notice = signal(""),
  banner = signal(""),
  help = signal(false);
export const reduced = signal(
  typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
);
export const sound = signal(false);
export const flourish = signal("");
/** PvP: "X a abandonné." once a side gave up. */
export const lastSurrender = signal("");
/** Skill cut-in: caster portrait band with the skill name (HUD). */
export const cutin = signal<{ key: number; portrait: string; name: string; color: string; team: string } | null>(null);
/** Side of the phase banner (colours). */
export const bannerSide = signal<"ally" | "enemy">("ally");
/** Id of the local player (units they command have `owner` = this id). */
export const myId = signal("");
/** Side of the local player: `enemy` when they are in `versus` (PvP), `ally` otherwise. */
export const myTeam = computed<Team>(() => {
  const state = battle(),
    me = myId();
  return state?.versus?.some((p) => p.id === me) ? "enemy" : "ally";
});
/** A unit of the local player's side. */
export function friendly(unit: Unit, team = myTeam()) {
  return unit.team === team;
}
/** A unit the local player commands (units without owner: anyone of the side). */
export function isMine(unit: Unit, me = myId()) {
  return friendly(unit) && (!unit.owner || unit.owner === me);
}
/** A built-in role is named in the language of the game (`tactical.role.<id>`); a role declared by the game keeps its own name. */
function named(role: ReturnType<typeof roleOf>) {
  const key = `tactical.role.${role.id}`;
  const text = DEFAULT_ROLES[role.id] ? t(key) : key;
  return text === key ? role : { ...role, name: text };
}
/** Role of a unit in the current battle (name, glyph, colour, attack style). */
export function roleInfo(unit: Pick<Unit, "role"> | null | undefined) {
  return named(roleOf(battle(), unit ?? { role: "" }));
}
/** Roles of the local side, once each (intro). */
export const sideRoles = computed(() => {
  const state = battle(),
    team = myTeam();
  const ids = [...new Set(state?.units.filter((u) => u.team === team).map((u) => u.role) ?? [])];
  return ids.map((id) => named(roleOf(state, { role: id })));
});
/** PvP battle (players on both sides). */
export const pvp = computed(() => (battle()?.versus?.length ?? 0) > 0);
/** The local player watches this battle (not one of its players). */
export const spectator = computed(() => {
  const state = battle(),
    me = myId();
  return !!state && state.players.length > 0 && ![...state.players, ...(state.versus ?? [])].some((p) => p.id === me);
});
/** Coop: the other players of the battle. */
export const partners = computed(() => {
  const state = battle(),
    me = myId(),
    team = myTeam();
  const side = team === "enemy" ? state?.versus ?? [] : state?.players ?? [];
  return side.filter((p) => p.id !== me);
});
/** PvP: the players of the other side. */
export const opponents = computed(() => {
  const state = battle(),
    team = myTeam();
  return (team === "enemy" ? state?.players : state?.versus) ?? [];
});
/** Coop: before the start, the local player is ready and waits for the others. */
export const waitingPartners = computed(() => {
  const state = battle(),
    me = myId(),
    others = partners();
  if (!state || state.started || !state.ready.includes(me)) return [];
  // Everyone, both sides: the battle starts when all are ready.
  return [...others, ...opponents()].filter((p) => !state.ready.includes(p.id));
});
/** The battle as the local player sees it: the battle state plus the staged move. */
export const view = computed<BattleState | null>(() => {
  const state = battle(),
    move = staged();
  if (!state || !move) return state;
  return {
    ...state,
    units: state.units.map((u) => (u.id === move.unitId ? { ...u, x: move.cell.x, y: move.cell.y, moved: true } : u)),
  };
});
export const current = computed(() => {
  const state = view(),
    id = selected();
  return state?.units.find((u) => u.id === id) ?? null;
});
// Relative to the local player's side (PvP: the versus side sees itself as allies).
export const allies = computed(() => {
  const state = battle(),
    team = myTeam();
  return state?.units.filter((u) => u.team === team) ?? [];
});
export const enemies = computed(() => {
  const state = battle(),
    team = myTeam();
  return state?.units.filter((u) => u.team !== team) ?? [];
});
export const inspected = computed(()=>{
  const state=view(),cell=hovered();
  return state?.started&&cell?state.units.find(u=>u.hp>0&&u.x===cell.x&&u.y===cell.y)??null:null;
});
export const skillOptions = computed(()=>{
  const unit=current();
  const state=battle();
  return unit&&state?skillsOf(state,unit).map(skill=>({...skill,reason:skillUnavailable(unit,skill)})):[];
});
/** What the heroes may do: a rule of the troop that says `false` forbids it. */
export const allowed = (rule: "canAttack" | "canUseSkills" | "canUseItems" | "canGuard" | "canEscape") => battle()?.rules?.[rule] !== false;
/** The items the selected unit carries, with what each restores. */
export const itemOptions = computed(() => {
  const unit = current(),
    state = battle();
  return unit && state ? Object.entries(unit.items ?? {}).flatMap(([id, count]) => (state.items?.[id] ? [{ ...state.items[id], count }] : [])) : [];
});
export const activeItem = computed(() => itemOptions().find((item) => item.id === selectedItem()));
export const activeSkill = computed(()=>{const state=battle(),unit=current(),id=selectedSkill();return unit&&state?skillFor(state,unit,id):undefined;});
/** Texts of the encounter (name, chapter, objective, intro), with generic fallbacks. */
export const meta = computed(() => battle()?.meta ?? {});
/** Branding of the HUD (client option `title` / `subtitle`). */
// CanvasEngine 2.1 captures computed dependencies on the first evaluation.
// Read every signal before branching, including before the first state arrives.
export const canPlay = computed(() => {
  const state = battle(),
    locked = busy(),
    watching = spectator(),
    team = myTeam();
  return Boolean(
    state?.started && !state.winner && state.phase === team && !locked && !watching,
  );
});
export const controls = computed(() => {
  const playable = canPlay(),
    unit = current();
  return {
    move: !playable || !unit || unit.moved || unit.acted || unit.hp <= 0,
    attack: !playable || !unit || unit.acted || unit.hp <= 0,
    skill: !playable || !unit || unit.acted || unit.hp <= 0,
  };
});
export let engine: RpgClientEngine;
/** Transport to the server: the tactical GUI interactions (set by the client module). */
export interface TacticalHost {
  command(env: { revision: number; command: Command; then?: Command }): void;
  /** Ask the server for another shared speed. */
  pace(value: number): void;
  /** Tell the server the cell a unit is about to move to (`null`: it no longer goes there), so the partners do not aim at it. */
  hold?(unitId: string, cell: Cell | null): void;
  close(): void;
  /** The HUD is shown: show the battlefield, hide map GUIs… Returns the cleanup. */
  enter(): () => void;
  /** First packet of a battle / the HUD closes on a battle. */
  started(state: BattleState): void;
  ended(state: BattleState): void;
}
let host: TacticalHost = { command: () => {}, pace: () => {}, close: () => {}, enter: () => () => {}, started: () => {}, ended: () => {} };
export const enter = () => host.enter();
export function connectHost(value: TacticalHost) {
  host = value;
}
export let animation: {
  event: BattleEvent;
  before: BattleState | null;
  at: number;
  /** A client `onPlay` hook plays the effects itself (units still move). */
  custom?: boolean;
} | null = null;
/**
 * Client `onPlay` hooks (set by the client module): resolve `true` when a
 * hook played the event itself (returned `false`).
 */
let eventHook: (event: BattleEvent, state: BattleState) => Promise<boolean> = async () => false;
export function connectEventHook(fn: typeof eventHook) {
  eventHook = fn;
}
let unlockTimer: ReturnType<typeof setTimeout>,
  bannerTimer: ReturnType<typeof setTimeout>,
  timeout: ReturnType<typeof setTimeout>;
let flourishTimer: ReturnType<typeof setTimeout>;
export function connectEngine(value: RpgClientEngine) {
  engine = value;
}
/** How much a battler is scaled to be drawn at the height of the others, measured from its image by the game (the width of its frame otherwise). */
export const unitScales: Record<string, number> = {};
/** Where the feet of a character are in each of its animations (`stand`, `walk`…), as a fraction of the frame: standing and walking sit at the same place. */
export const unitAnchors: Record<string, Record<string, [number, number]>> = {};
/**
 * A text of the battle in the language of the game: the i18n service of the
 * engine (the game overrides `tactical.*` keys there), the English default
 * before the engine is connected.
 */
export function t(key: string, params?: Record<string, unknown>): string {
  if (!key) return "";
  if (engine) return engine.t(key, params);
  const text = (TACTICAL_I18N.en as Record<string, string>)[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (params && name in params ? String(params[name] ?? "") : match));
}
/** The keyboard controls of the game (`keyboardControls` of the client config). */
const keyboard = () => (engine?.globalConfig as { keyboardControls?: Record<string, unknown> } | undefined)?.keyboardControls ?? {};
/**
 * The keys of the HUD as the i18n parameters of its texts (`{escape}`, `{action}`, `{danger}`…): the keys the game binds, so a
 * hint never names a key the player does not have.
 */
export const keys = (): Record<string, string> => keyParams(keyboard(), (id) => t(id));
/** The label of the key of one control of the HUD (`entry2` → `2`). */
export const keyOf = (control: TacticalControl): string => keyLabel(tacticalBinds(keyboard())[control], (id) => t(id));
/**
 * What the heroes have to do, as the HUD says it: the text of the encounter when it has one, else the one of the objective type (the text of a
 * type a plugin brought is its `tactical.objective.<type>` message), with the limit of rounds when there is one.
 */
export const objectiveText = computed(() => {
  const state = battle();
  const own = state?.meta.objective;
  const objective = state?.objective;
  if (own || !objective) return own ?? t("tactical.objective");
  const name = state?.units.find((u) => u.id === objective.unitId)?.name ?? "";
  const id = `tactical.objective.${objective.type}`;
  const said = t(id, { name, turns: objective.turns ?? "" });
  const goal = objective.type === "eliminate" || said === id ? t("tactical.objective") : said;
  return objective.limit ? t("tactical.objective.withLimit", { goal, limit: objective.limit }) : goal;
});
let lastPacket: BattlePacket | null = null;
let noticeUntil = 0;
/** The players who left the battle, by side: a side that forfeits because of them is named by them. */
let departed: Record<Team, string[]> = { ally: [], enemy: [] };
/** Packets waiting for the current animation to end (played in order). */
const inbox: BattlePacket[] = [];
let playing = false;
function done() {
  playing = false;
  const next = inbox.shift();
  if (next) void play(next);
}
/** Packets arrive as the GUI data (server `gui.open` / `gui.update`). */
export async function receive(packet: BattlePacket) {
  if (!packet?.state || packet === lastPacket) return;
  lastPacket = packet;
  livePace.set(packet.state.pace || 1);
  followTimer(packet.state);
  // A new battle: drop what the previous one had queued.
  if (battle() && battle()!.id !== packet.state.id) {
    inbox.length = 0;
    playing = false;
  }
  if (playing) {
    inbox.push(packet);
    return;
  }
  await play(packet);
}
async function play(packet: BattlePacket) {
  playing = true;
  clearTimeout(timeout);
  // A new battle: forget the previous one.
  if (battle()?.id !== packet.state.id) {
    battle.set(null);
    departed = { ally: [], enemy: [] };
    animation = null;
    loaded.set(false);
    host.started(packet.state);
  }
  myId.set(engine?.playerIdSignal?.() ?? "");
  if (packet.left) {
    if (packet.leftTeam) departed[packet.leftTeam].push(packet.left);
    // A partner's units come to me; an opponent who leaves only leaves, and a spectator commands nobody's units. Kept a few
    // seconds: the next actions would clear it at once.
    const opponent = spectator() || (!!packet.leftTeam && packet.leftTeam !== myTeam());
    notice.set(t(opponent ? "tactical.opponentLeft" : "tactical.partnerLeft", { name: packet.left }));
    noticeUntil = performance.now() + 6000;
  }
  if (packet.error) {
    battle.set(packet.state);
    planned.set(null);
    staged.set(null);
    // The move was not sent, or was refused: its cell is no longer held
    letGo();
    notice.set(t(packet.error));
    busy.set(false);
    // The move of a move + action order may have gone through: back to the menu.
    const unit = current();
    if (unit && isMine(unit) && !unit.acted) mode.set(unit.moved ? "menu" : "move");
    return done();
  }
  // The local player's own move, already walked locally: no second animation.
  const move = staged();
  if (
    packet.event?.kind === "move" && move && packet.event.unitId === move.unitId &&
    packet.event.path?.at(-1)?.x === move.cell.x && packet.event.path?.at(-1)?.y === move.cell.y
  ) {
    // The hooks see it too (it was walked before being sent: what they return is not used).
    await eventHook(packet.event, packet.state);
    battle.set(packet.state);
    staged.set(null);
    animation = null;
    return done();
  }
  // Hooks run before the state is shown, so the event plays from the start.
  const custom = packet.event ? await eventHook(packet.event, packet.state) : false;
  const before = battle();
  battle.set(packet.state);
  // Coop: a partner's action does not cancel the order being prepared.
  const plan = planned(),
    actor = packet.event?.unitId ? packet.state.units.find((u) => u.id === packet.event?.unitId) : undefined,
    planUnit = plan && "unitId" in plan ? packet.state.units.find((u) => u.id === plan.unitId) : undefined,
    planTarget = plan && "targetId" in plan ? packet.state.units.find((u) => u.id === plan.targetId) : undefined;
  // A state refresh without event (a spectator joins…) keeps it too.
  const keep =
    (!packet.event || (!!actor && !isMine(actor) && friendly(actor))) && !!planUnit && planUnit.hp > 0 && !planUnit.acted &&
    (!planTarget || planTarget.hp > 0) && packet.state.phase === myTeam();
  // A surrender being confirmed survives every update until the end.
  const surrendering = plan?.type === "surrender" && !packet.state.winner;
  if (!keep && !surrendering) planned.set(null);
  if (!packet.left && performance.now() > noticeUntil) notice.set("");
  if (packet.event?.timeout) {
    // What was being prepared belonged to the phase that just ended
    staged.set(null);
    holding = "";
    notice.set(t("tactical.timeout"));
    noticeUntil = performance.now() + 4000;
  }
  if (packet.event?.kind === "surrender") {
    const side = packet.event.team === "enemy" ? packet.state.versus : packet.state.players;
    const names = side.map((p) => p.name).join(", ");
    // A side that forfeits because its players left: they are no longer in the state, the result names them as having left.
    const gone = departed[packet.event.team ?? "ally"].join(", ");
    lastSurrender.set(
      names ? t("tactical.surrendered", { names }) : gone ? t("tactical.opponentLeft", { name: gone }) : t("tactical.sideSurrendered"),
    );
  } else if (packet.event?.kind === "start") lastSurrender.set("");
  if (packet.event) {
    const actor = packet.state.units.find(
      (unit) => unit.id === packet.event?.unitId,
    );
    clearTimeout(flourishTimer);
    flourish.set("");
    // The Visual Effects of a skill or an item set when its hits land and how long it plays
    const usedSkill = packet.event.kind === "skill" && actor ? skillFor(packet.state, actor, packet.event.skillId) : undefined;
    const timing = packet.event.kind === "item" ? itemTiming(packet.event.itemId ? packet.state.items?.[packet.event.itemId] : undefined) : actionTiming(usedSkill);
    if (packet.event.kind === "skill" && actor) {
      const skill = usedSkill;
      flourish.set(skill?.name ?? t("tactical.skill"));
      cutin.set({
        key: performance.now(),
        portrait: portraitStyle(actor),
        name: skill?.name ?? t("tactical.skill"),
        color: `#${(skill?.color ?? 0xffd89a).toString(16).padStart(6, "0")}`,
        team: friendly(actor) ? "ally" : "enemy",
      });
      flourishTimer = setTimeout(() => {
        flourish.set("");
        cutin.set(null);
      }, 1250 / pace());
    }
    animation = { event: packet.event, before, at: performance.now(), custom };
    busy.set(true);
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(
      () => {
        busy.set(false);
        // Fast-forward ends when the hand comes back.
        if (packet.state.phase === myTeam() && pace() === 3) setPace(speed());
        if (
          before?.phase !== packet.state.phase ||
          packet.event?.kind === "start"
        )
          showBanner(
            packet.state.phase === myTeam() ? "tactical.yourTurn" : "tactical.enemyTurn",
          );
        const active = packet.state.units.find((u) => u.id === selected());
        if (active?.acted || active?.hp===0 || packet.state.phase!==myTeam()) clearSelection();
        // Chaining: after one of my units acted, the next one is selected.
        const mine = packet.event?.unitId && packet.state.units.find((u) => u.id === packet.event?.unitId);
        if (!selected() && mine && isMine(mine) && packet.state.phase === myTeam() && !packet.state.winner && !inbox.length) {
          const next = packet.state.units.find((u) => isMine(u) && u.hp > 0 && !u.acted);
          if (next) selectUnit(next);
        }
        done();
      },
      (packet.event.kind === "move" ? 1000 : timing.end * 1000) / pace(),
    );
    // The sounds of a Visual Effect replace the sound of the hit
    const effectSounds = !!(usedSkill?.effect ?? usedSkill?.impactEffect)?.sounds?.length;
    if ((packet.event.kind === "attack" || packet.event.kind === "skill") && !effectSounds)
      setTimeout(() => cue("hit"), (usedSkill ? timing.impact * 1000 : 550) / pace());
  } else done();
  if (!packet.state.started) {
    clearTimeout(unlockTimer);
    clearTimeout(flourishTimer);
    animation = null;
    flourish.set("");
    cutin.set(null);
    busy.set(false);
    mode.set("select");
    clearSelection();
    hovered.set(null);
    inbox.length = 0;
    playing = false;
    const first = packet.state.units.find((u) => isMine(u));
    cursor.set(first ? { x: first.x, y: first.y } : { x: 0, y: 0 });
  }
}
export function showBanner(key: string) {
  bannerSide.set(key === "tactical.enemyTurn" ? "enemy" : "ally");
  banner.set(t(key));
  clearTimeout(bannerTimer);
  // Short: the enemy phase starts right after (its first action is 1.65 s later).
  bannerTimer = setTimeout(() => banner.set(""), 1300 / pace());
}
/** The unit whose move is walked locally and whose cell the server holds for it (several players on the side). */
let holding = "";
/** The move being prepared is dropped: the partners may aim at its cell again. */
function letGo() {
  if (!holding) return;
  const unitId = holding;
  holding = "";
  host.hold?.(unitId, null);
}
export function selectUnit(unit: Unit) {
  if (!canPlay() || !isMine(unit) || unit.hp <= 0 || unit.acted) return;
  letGo();
  staged.set(null);
  route.set([]);
  selected.set(unit.id);
  hovered.set(null);
  cursor.set({ x: unit.x, y: unit.y });
  planned.set(null);
  skillMenu.set(false);selectedSkill.set('');itemMenu.set(false);selectedItem.set('');
  // Already moved (an earlier order): straight to its actions.
  mode.set(unit.moved ? "menu" : "move");
  focusMenu();
  notice.set("");
  cue("select");
}
/** Walk the selected unit to a cell, locally (Escape brings it back). */
function stage(unit: Unit, cell: Cell, path: Cell[]) {
  staged.set({ unitId: unit.id, from: { x: unit.x, y: unit.y }, cell, path, at: performance.now() });
  // With partners, the cell is held until the move is sent with the action that follows: nobody else aims at it meanwhile
  if (partners().length) {
    holding = unit.id;
    host.hold?.(unit.id, cell);
  }
  route.set([]);
  mode.set("menu");
  focusMenu();
  cue("select");
}
/** Actions offered next to the selected unit, with whether they can be used now. What the rules of the troop forbid is not offered. */
export const menuItems = computed(() => {
  const state = view(),
    unit = current(),
    options = skillOptions(),
    items = itemOptions();
  if (!state || !unit) return [];
  const targets = state.units.some((u) => u.hp > 0 && targetable(state, unit, u));
  const entries = [
    allowed("canAttack") && { id: "attack" as const, glyph: "⚔", label: t("tactical.attack"), disabled: !targets, count: 0 },
    allowed("canUseSkills") && { id: "skill" as const, glyph: "✧", label: t("tactical.skills"), disabled: !options.some((o) => !o.reason), count: options.filter((o) => !o.reason).length },
    allowed("canUseItems") && { id: "item" as const, glyph: "⚗", label: t("tactical.items"), disabled: !items.length, count: items.reduce((n, item) => n + item.count, 0) },
    allowed("canGuard") && { id: "guard" as const, glyph: "⛨", label: t("tactical.guard"), disabled: false, count: 0 },
    { id: "wait" as const, glyph: "◷", label: t("tactical.wait"), disabled: false, count: 0 },
  ].flatMap((entry) => (entry ? [entry] : []));
  // `entry1` goes back to the move: the entries take the keys that follow.
  return entries.map((entry, index) => ({ ...entry, slot: index + 2, key: keyOf(`entry${index + 2}` as TacticalControl) }));
});
/** Focus the first action that can be used (an attack without a target in range is not): confirming at once does something. */
export function focusMenu() {
  const index = menuItems().findIndex((item) => !item.disabled);
  menuIndex.set(Math.max(0, index));
}
/** Move the focus of the action menu up or down, over the actions that cannot be used. */
export function stepMenu(delta: 1 | -1) {
  const items = menuItems();
  const n = items.length;
  if (!n) return;
  let index = menuIndex();
  for (let i = 0; i < n; i++) {
    index = (index + delta + n) % n;
    if (!items[index].disabled) break;
  }
  menuIndex.set(index);
}
/** The heroes may flee a battle when its troop lets them (never a duel: there they surrender). */
export const canFlee = computed(() => {
  const state = battle();
  return !!state?.started && !state.winner && !spectator() && !pvp() && allowed("canEscape") && state.phase === myTeam();
});
/** Send an action; a staged move goes first, in the same order. */
export function commit(command: Command) {
  const move = staged();
  planned.set(null);
  // No more aiming while the action plays (the forecast would follow the new HP).
  mode.set("select");
  skillMenu.set(false);
  itemMenu.set(false);
  if (move && "unitId" in command && command.unitId === move.unitId) {
    // The move goes with the action: the server frees its cell itself
    holding = "";
    send({ type: "move", unitId: move.unitId, cell: move.cell, path: move.path }, command);
  } else send(command);
}
export function nextUnit() {
  if(!canPlay())return;
  const units = allies().filter((u) => isMine(u) && u.hp > 0 && !u.acted);
  if (!units.length) {
    mode.set("select");
    return;
  }
  const index = units.findIndex((u) => u.id === selected());
  const unit = units[(index + 1) % units.length];
  selectUnit(unit);
}
export function clearSelection(){letGo();staged.set(null);route.set([]);selected.set('');selectedSkill.set('');skillMenu.set(false);itemMenu.set(false);selectedItem.set('');mode.set('select');planned.set(null);}
export function hoverCell(cell:Cell|null){
  const previous=hovered();
  if(previous?.x!==cell?.x||previous?.y!==cell?.y){
    hovered.set(cell);
    if(cell) drawRoute(cell);
  }
}
/**
 * The move arrow follows the pointer: a blue cell next to the end of the
 * route extends it (within the move), a cell already on it cuts it there,
 * any other blue cell takes the shortest path.
 */
function drawRoute(cell: Cell) {
  const state = battle(),
    unit = current();
  if (mode() !== "move" || !state || !unit || staged()) return;
  const origin = state.units.find((u) => u.id === unit.id)!;
  const paths = reachable(state, origin);
  if (!paths.has(key(cell))) return;
  const r = route();
  const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
  if (same(cell, origin)) return void route.set([]);
  const index = r.findIndex((c) => same(c, cell));
  if (index >= 0) return void route.set(r.slice(0, index + 1));
  const last = r.at(-1) ?? origin;
  if (r.length < origin.move && Math.abs(last.x - cell.x) + Math.abs(last.y - cell.y) === 1) return void route.set([...r, cell]);
  route.set(paths.get(key(cell)) ?? []);
}
/** The route to a cell: the drawn one if it ends there, otherwise the shortest. */
export function routeTo(cell: Cell): Cell[] | undefined {
  const state = battle(),
    unit = current();
  if (!state || !unit) return undefined;
  const r = route();
  if (r.length && r.at(-1)!.x === cell.x && r.at(-1)!.y === cell.y) return r;
  return reachable(state, state.units.find((u) => u.id === unit.id)!).get(key(cell));
}
/** Speed: the local choice, or 3 while fast-forwarding (sent to the server, shared). */
export function setPace(value: 1 | 2 | 3) {
  if (spectator() || !battle()) return;
  if (value !== 3) speed.set(value);
  if (value !== pace()) host.pace(value);
}
export function pickSkill(id:string){
  const state=battle(),unit=current(),skill=unit&&state?skillFor(state,unit,id):undefined;
  if(!unit||!skill||!canPlay()||unit.acted||skillUnavailable(unit,skill))return;
  selectedSkill.set(id);skillMenu.set(false);mode.set('skill');planned.set(null);notice.set('');cue('select');
}
export function pickItem(id: string) {
  const unit = current();
  if (!unit || !canPlay() || unit.acted || !(unit.items?.[id] > 0) || !allowed("canUseItems")) return;
  selectedItem.set(id);
  itemMenu.set(false);
  mode.set("item");
  planned.set(null);
  notice.set("");
  cue("select");
}
export function action(kind: "move" | "attack" | "skill" | "item" | "guard" | "wait") {
  const unit = current();
  if (!canPlay() || !unit || unit.acted || unit.hp <= 0) return;
  notice.set("");
  // Every entry of the action menu has its sound, whatever it opens (the orders that end the turn play the confirm of `commit` too).
  cue("select");
  if (kind === "move") {
    // Back to the move (undo the staged one).
    if (!staged() && unit.moved) return;
    letGo();
    staged.set(null);
    skillMenu.set(false);
    itemMenu.set(false);
    mode.set("move");
    return;
  }
  if (kind === "item") {
    skillMenu.set(false);
    itemMenu.set(true);
    itemIndex.set(0);
    planned.set(null);
    return;
  }
  if (kind === "guard") return commit({ type: "guard", unitId: unit.id });
  // From the move step, an action means "act from here".
  if (kind === "skill") {
    itemMenu.set(false);
    skillMenu.set(true);
    skillIndex.set(0);
    planned.set(null);
    return;
  }
  skillMenu.set(false);
  itemMenu.set(false);
  selectedSkill.set("");
  if (kind === "wait") return commit({ type: "wait", unitId: unit.id });
  mode.set("attack");
  planned.set(null);
}
/**
 * A cell is clicked (or Enter on the cursor). `touch`: a first tap on a target
 * only shows the forecast, a second tap on it attacks.
 */
export function chooseCell(cell: Cell, o: { touch?: boolean } = {}) {
  cursor.set(cell);
  hoverCell(cell);
  if(skillMenu()||itemMenu())return;
  if (!canPlay()) return;
  const state = view()!,
    unit = current(),
    occupant = state.units.find(
      (u) => u.hp > 0 && u.x === cell.x && u.y === cell.y,
    );
  // An item goes to a unit next to the one that uses it, itself included.
  if (mode() === "item") {
    const item = selectedItem();
    if (unit && !unit.acted && occupant && item && occupant.team === unit.team && distance(unit, occupant) <= 1) commit({ type: "item", unitId: unit.id, targetId: occupant.id, itemId: item });
    return;
  }
  if (occupant && friendly(occupant) && (!unit || occupant.id !== unit.id)) {
    // Another of my units: switch to it (a staged move is dropped). A partner's is only inspected.
    if (isMine(occupant)) selectUnit(occupant);
    return;
  }
  if (!unit || unit.acted || unit.hp <= 0) return;
  if (mode() === "move") {
    // Its own cell: act from here. A blue cell: walk there at once.
    if (cell.x === unit.x && cell.y === unit.y) {
      mode.set("menu");
      focusMenu();
      cue("select");
      return;
    }
    const path = routeTo(cell);
    if (path?.length) stage(battle()!.units.find((u) => u.id === unit.id)!, cell, path);
    return;
  }
  // In the menu, clicking a reachable enemy attacks it directly.
  const aiming = mode() === "attack" || mode() === "skill" || mode() === "menu";
  const skill = mode() === "skill" ? selectedSkill() : false;
  if (!aiming || !occupant || (mode() === "skill" && !activeSkill())) return;
  if (!targetable(state, unit, occupant, skill)) return;
  const command: Command = skill
    ? { type: "skill", unitId: unit.id, targetId: occupant.id, skillId: skill }
    : { type: "attack", unitId: unit.id, targetId: occupant.id };
  const shown = planned();
  if (o.touch && !(shown && "targetId" in shown && shown.targetId === occupant.id)) {
    planned.set(command);
    cue("select");
    return;
  }
  commit(command);
}
/** Escape / B / right click: back one step (target → menu → move undone → deselect). */
export function cancel() {
  notice.set("");
  if (skillMenu()) return void skillMenu.set(false);
  if (itemMenu()) return void itemMenu.set(false);
  if (planned()) return void planned.set(null);
  const unit = current();
  if (mode() === "attack" || mode() === "skill" || mode() === "item") {
    mode.set("menu");
    selectedSkill.set("");
    selectedItem.set("");
    return void cue("select");
  }
  if (mode() === "menu" && unit) {
    // The unit walks back to its cell (nothing was sent).
    if (staged() || !unit.moved) {
      letGo();
      staged.set(null);
      route.set([]);
      mode.set("move");
      return void cue("select");
    }
  }
  clearSelection();
  hovered.set(null);
}
export function send(command: Command, then?: Command) {
  const state = battle();
  if (!state || busy() || spectator()) return;
  busy.set(true);
  notice.set("");
  host.command(then ? { revision: state.revision, command, then } : { revision: state.revision, command });
  cue("confirm");
  timeout = setTimeout(() => {
    busy.set(false);
    notice.set(t("tactical.error.connection"));
  }, 12000);
}
/** Enter / A: the shown order, the highlighted menu entry, or the cursor's cell. */
export function confirm() {
  const command = planned();
  if (command) return command.type === "endPhase" || command.type === "surrender" || command.type === "escape" ? send(command) : commit(command);
  if (mode() === "menu") {
    const item = menuItems()[menuIndex()];
    if (item && !item.disabled) action(item.id);
    return;
  }
  chooseCell(cursor());
}
/** PvP: prepare to give up (confirmed like any order). */
export function surrender() {
  const state = battle();
  if (!state?.started || state.winner || spectator() || !pvp()) return;
  planned.set({ type: "surrender" });
}
/** The heroes flee the battle (confirmed like any order). */
export function flee() {
  if (canPlay() && canFlee()) planned.set({ type: "escape" });
}
export function endPhase() {
  if (canPlay()) planned.set({ type: "endPhase" });
}
/**
 * The attack being aimed: the order shown (touch), otherwise the targetable
 * enemy under the pointer / cursor in attack or skill mode (hover = forecast).
 */
export const aimed = computed<Command | null>(() => {
  const state = view(),
    unit = current(),
    shown = planned(),
    kind = mode(),
    skill = selectedSkill(),
    cell = hovered() ?? cursor();
  if (shown) return shown;
  if (!state || !unit || (kind !== "attack" && kind !== "skill")) return null;
  const target = state.units.find((u) => u.hp > 0 && u.x === cell.x && u.y === cell.y);
  if (!target || !targetable(state, unit, target, kind === "skill" ? skill : false)) return null;
  return kind === "skill"
    ? { type: "skill", unitId: unit.id, targetId: target.id, skillId: skill }
    : { type: "attack", unitId: unit.id, targetId: target.id };
});
export const forecast = computed(() => {
  const state = view(),
    unit = current(),
    command = aimed();
  if (!state || !unit || !command || !("targetId" in command)) return null;
  const target = state.units.find((u) => u.id === command.targetId)!;
  // What the rules take: half on guard, never the last HP of an invincible unit (the server's damage hooks are not known here).
  const amount = taken(target, damage(state, unit, command.type === "skill" ? command.skillId : false));
  return {
    target,
    amount,
    remaining: target.hp - amount,
    hits: affected(state, unit, target, command.type === "skill"?command.skillId:false).length,
  };
});
// Keep the target's sheet visible while the pointer moves to Confirm.
export const details = computed(() => {
  const hover = inspected(), unit = current(), state = view(), preview = forecast();
  const shown = preview?.target ?? hover ?? unit;
  return state?.started && !state.winner && shown ? [shown] : [];
});
export const hint = computed(() => {
  const message = notice(),
    locked = busy(),
    state = battle(),
    command = planned(),
    kind = mode(),
    me = myId();
  if (!message && state && spectator()) {
    return t("tactical.spectatorHint", { names: state.players.map((p) => p.name).join(", ") });
  }
  // Coop: my units have all acted, a partner still plays.
  const mineLeft = state?.units.filter((u) => isMine(u, me) && u.hp > 0 && !u.acted) ?? [];
  const team = myTeam();
  const others = state?.units.filter((u) => u.team === team && !isMine(u, me) && u.hp > 0 && !u.acted) ?? [];
  if (!message && !locked && state?.started && !state.winner && state.phase === team && !mineLeft.length && others.length) {
    const names = [...new Set(others.map((u) => [...state.players, ...state.versus].find((p) => p.id === u.owner)?.name ?? ""))].filter(Boolean);
    return t("tactical.partnerHint", { names: names.join(", ") });
  }
  return (
    message ||
    t(
      locked
        ? "tactical.busyHint"
        : state && state.phase !== team
          ? "tactical.enemyHint"
          : command?.type === "surrender"
            ? "tactical.surrenderHint"
            : command?.type === "escape"
            ? "tactical.escapeHint"
            : command?.type === "endPhase"
            ? "tactical.endPhaseHint"
            : command
            ? "tactical.confirmHint"
            : kind === "move"
              ? "tactical.moveHint"
              : kind === "menu"
              ? "tactical.menuHint"
              : kind === "attack"
                ? "tactical.attackHint"
                : kind === "skill"
                  ? "tactical.skillHint"
                  : kind === "item"
                    ? "tactical.itemHint"
                    : "tactical.selectHint",
      keys(),
    )
  );
});
/**
 * The sound cues of the tactical HUD: a cell or an entry selected, an order confirmed, a blow, a cancel. Client only.
 *
 * @example
 * ```ts
 * provideTacticalClient({ sounds: { select: "cursor", confirm: "ok", hit: "impact", back: false } satisfies Partial<Record<TacticalCue, unknown>> });
 * ```
 */
export type TacticalCue = "select" | "confirm" | "hit" | "back";

/**
 * The cues of the HUD (configured by `provideTacticalClient`): the sound the game gives in the `sounds` option, or a short synthesized
 * tone. They play while the sound of the HUD is on (♪).
 */
export const cues = new BattleCues<TacticalCue>({
  select: (v) => synthTone(440, 0.18, { type: "sine", gain: 0.055 * v, slide: 2 }),
  confirm: (v) => synthTone(660, 0.18, { type: "sine", gain: 0.055 * v, slide: 4 / 3 }),
  hit: (v) => synthTone(160, 0.18, { type: "triangle", gain: 0.055 * v, slide: 35 / 160 }),
  back: (v) => synthTone(440, 0.18, { type: "triangle", gain: 0.055 * v, slide: 2 }),
});

export function cue(kind: TacticalCue) {
  if (!sound()) return;
  cues.play(kind);
}

/** The HUD is closed: forget the battle (the next one starts clean). */
export function teardown() {
  const state = battle();
  if (state) host.ended(state);
  inbox.length = 0;
  playing = false;
  staged.set(null);
  holding = "";
  deadline = 0;
  clearInterval(ticking);
  timeLeft.set(null);
  clearTimeout(timeout);
  clearTimeout(unlockTimer);
  clearTimeout(bannerTimer);
  clearTimeout(flourishTimer);
  lastPacket = null;
  animation = null;
  battle.set(null);
  loaded.set(false);
  busy.set(false);
  banner.set("");
  flourish.set("");
  cutin.set(null);
  notice.set("");
  lastSurrender.set("");
  departed = { ally: [], enemy: [] };
  clearSelection();
  hovered.set(null);
}

/** Result screen confirmed: give control back to the map (resolves `startTacticalBattle`). */
export function leave() {
  host.close();
}
