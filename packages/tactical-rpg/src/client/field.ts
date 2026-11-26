import { signal, type WritableSignal } from "canvasengine";
import type { Container } from "pixi.js";
import { FxPlayer, ScreenEffects, imageSize } from "@rpgjs/battle-kit";
import type { AttackStyle, BattleState, Board, Cell, Role, Team, Unit } from "../core/types";
import { dangerZone, threatOf, type Threat } from "../core/danger";

/** The parts of the HUD that take the pointer: a click on them never reaches the grid below. */
const HUD_PANELS = [
  ".rpg-ui-tactical-controls",
  ".rpg-ui-tactical-loading",
  ".rpg-ui-tactical-intro",
  ".rpg-ui-tactical-status",
  ".rpg-ui-tactical-unit-menu",
  ".rpg-ui-tactical-skill-menu",
  ".rpg-ui-tactical-dock",
  ".rpg-ui-tactical-modal-backdrop",
].join(", ");
import { roleOf } from "../core/roles";
import { distance, key, reachable, world } from "../core/board";
import { targetable } from "../core/rules";
import { skillArea } from "../core/skills";
import { Choreography } from "./choreography";
import { facingBetween, movementAt, movementFacing, type Facing } from "./motion";
import {
  aimed,
  danger,
  pace,
  route,
  routeTo,
  cancel,
  staged,
  view,
  activeSkill,
  engine,
  animation,
  battle,
  chooseCell,
  current,
  cursor,
  help,
  hoverCell,
  hovered,
  isMine,
  myId,
  friendly,
  myTeam,
  loaded,
  mode,
  notice,
  planned,
  reduced,
  selected,
  selectedSkill,
  skillMenu,
  t,
  selectedItem,
  unitScales,
} from "./state";

/**
 * Reactive model of the tactical battlefield. `frame()` runs every tick (from
 * the battlefield component): it advances the choreography, drives the Studio
 * camera, and writes signals that the CanvasEngine components render
 * (`ui/battlefield.ce`, `field-grid.ce`, `field-unit.ce`, `field-popup.ce`).
 * Positions are world coordinates of the map.
 */

/**
 * Reactive view of a unit on the battlefield, as an `onPlay` hook gets it with
 * `stage.unit(id)`: its position and look are signals the battlefield draws.
 * Client only: changing it changes what is shown, never the battle.
 *
 * @example
 * ```ts
 * const view = stage.unit(event.unitId!);
 * view?.anim.set("attack");
 * ```
 */
export interface UnitView {
  id: string;
  team: Team;
  role: Role;
  /** Role badge glyph, accent colour and attack style (from `state.roles`). */
  glyph: string;
  color: number;
  attack: AttackStyle;
  /** RPGJS spritesheet id (stand-<dir> / walk-<dir> textures). */
  battler: string;
  /** Sprite tint (0xffffff = none). */
  tint: number;
  x: WritableSignal<number>;
  y: WritableSignal<number>;
  /** Animation of the character played now: `stand`, `walk`, `attack`… (only what its sprite has). */
  anim: WritableSignal<string>;
  /** Direction the character looks at: `up`, `down`, `left`, `right`. */
  facing: WritableSignal<string>;
  alpha: WritableSignal<number>;
  visible: WritableSignal<boolean>;
  /** Hit flash 0..1. */
  flash: WritableSignal<number>;
  hp: WritableSignal<number>;
  acted: WritableSignal<boolean>;
  selected: WritableSignal<boolean>;
  /** Unit of the local player's side (PvP: relative colours). */
  friendly: WritableSignal<boolean>;
  /** Coop: name of the partner commanding this ally ("" for mine and enemies). */
  partner: WritableSignal<string>;
  /** Pulse of the selection ring (0..1), when the unit is selected. */
  pulse: WritableSignal<number>;
}

export interface CellMark {
  x: number;
  y: number;
  color: number;
  alpha: number;
  stroke: number;
}

export interface Popup {
  key: number;
  text: string;
  x: number;
  y: number;
  born: number;
  color: number;
  big: boolean;
}

/** Only notify when the value changes (every frame writes). */
function put<T>(s: WritableSignal<T>, value: T) {
  if (s() !== value) s.set(value);
}

interface Viewport extends Container {
  toWorld(x: number, y: number): Cell;
  moveCenter(x: number, y: number): void;
  plugins: { remove(name: string): void };
}
const viewportOf = (node: Container | null): Viewport | null => {
  while (node) {
    if ("toWorld" in node && "moveCenter" in node) return node as Viewport;
    node = node.parent;
  }
  return null;
};

class Field {
  readonly unitIds = signal<string[]>([]);
  private readonly views = new Map<string, UnitView>();
  readonly cells = signal<CellMark[]>([]);
  /** Aim reticle or selection corners on the pointed cell. */
  readonly cursorMark = signal<{ x: number; y: number; kind: "select" | "target"; valid: boolean } | null>(null);
  readonly cursorPulse = signal(1);
  readonly trail = signal<{ x: number; y: number }[]>([]);
  readonly projectile = signal<{ x: number; y: number; ax: number; ay: number; color: number; size: number } | null>(null);
  /** Pooled floating numbers. */
  readonly popups = Array.from({ length: 10 }, () => signal<Popup | null>(null));
  /** Field clock (ms), read by popups and ambient embers. */
  readonly time = signal(0);
  /** Frame size (px) per battler spritesheet, known once its image is loaded. */
  readonly frames = signal<Record<string, { w: number; h: number }>>({});
  /** The animations each registered sprite has. */
  private textures = new Map<string, Set<string>>();
  private loading = new Set<string>();

  readonly fx = new FxPlayer({ maxParticles: 2500 });
  readonly screen = new ScreenEffects((x, y) => this.root?.toGlobal({ x, y }) ?? { x, y });
  readonly choreo = new Choreography(
    {
      fx: this.fx,
      screen: this.screen,
      popup: (text, x, y, o) => this.popup(text, x, y, o),
      // The sounds of the Visual Effects of the skills, on the sfx channel of the game (audio never breaks the battle)
      sound: (id, volume) => {
        try {
          void Promise.resolve(engine?.playSound?.(id, { volume, channel: "sfx" })).catch(() => undefined);
        } catch {
          // no sound
        }
      },
    },
    () => reduced(),
    () => pace(),
  );
  private root: Container | null = null;
  private vp: Viewport | null = null;
  private popupIndex = 0;
  /** Camera centre; `null` until the first frame, which starts it on the arena. */
  private cam: Cell | null = null;
  private facings = new Map<string, Facing>();
  private gridKey = "";
  private listeners: (() => void) | null = null;

  view(unit: Unit): UnitView {
    let v = this.views.get(unit.id);
    if (!v) {
      v = {
        id: unit.id,
        team: unit.team,
        role: unit.role,
        ...(({ glyph, color, attack }) => ({ glyph, color, attack }))(roleOf(battle(), unit)),
        battler: unit.battler,
        tint: unit.tint ?? 0xffffff,
        x: signal(0),
        y: signal(0),
        anim: signal("stand"),
        facing: signal(unit.team === "ally" ? "up" : "down"),
        alpha: signal(1),
        visible: signal(true),
        flash: signal(0),
        hp: signal(1),
        acted: signal(false),
        selected: signal(false),
        partner: signal(""),
        friendly: signal(unit.team === "ally"),
        pulse: signal(0),
      };
      this.views.set(unit.id, v);
    }
    return v;
  }

  board() {
    return battle()?.board;
  }

  unit(id: string): UnitView | undefined {
    return this.views.get(id);
  }

  popup(text: string, x: number, y: number, o: { color?: number; big?: boolean } = {}) {
    const slot = this.popups[this.popupIndex++ % this.popups.length];
    slot.set({ key: performance.now() + this.popupIndex, text, x, y, born: this.time(), color: o.color ?? 0xfff0c5, big: !!o.big });
  }

  /** The battlefield component is mounted in the map world container. */
  mount(root: Container) {
    this.root = root;
    this.vp = null;
    this.listen();
  }

  unmount() {
    this.listeners?.();
    this.listeners = null;
    this.screen.detach();
    this.root = null;
    this.vp = null;
    this.cam = null;
    this.views.clear();
    this.facings.clear();
    this.unitIds.set([]);
    this.gridKey = "";
    this.cells.set([]);
    this.cursorMark.set(null);
    this.trail.set([]);
    this.projectile.set(null);
  }

  /** Load the image of every battler of the battle (RPGJS spritesheets). */
  private sheets(state: BattleState) {
    const ids = [...new Set(state.units.map((u) => u.battler))];
    const missing = ids.filter((id) => !this.frames()[id]);
    if (!missing.length) {
      if (!loaded()) loaded.set(true);
      return;
    }
    for (const id of missing) {
      if (this.loading.has(id)) continue;
      this.loading.add(id);
      void (async () => {
        const raw = await engine?.getSpriteSheet(id);
        const sheet = (typeof raw === "function" ? { ...raw.prototype } : raw) as
          | { image?: string; framesWidth?: number; framesHeight?: number; width?: number; height?: number }
          | undefined;
        if (!sheet) throw new Error(`[Tactical] Battler "${id}" is not a registered RPGJS spritesheet`);
        this.textures.set(id, new Set(Object.keys((sheet as { textures?: object }).textures ?? {})));
        let [w, h] = [48, 48];
        if (sheet.image) {
          const image = await imageSize(sheet.image);
          w = (sheet.width ?? image.width) / (sheet.framesWidth ?? 1);
          h = (sheet.height ?? image.height) / (sheet.framesHeight ?? 1);
        }
        this.frames.set({ ...this.frames(), [id]: { w, h } });
      })()
        .catch((error) => {
          console.warn(error);
          notice.set(t("tactical.error.load"));
          // Drawn with the default size rather than never: one missing image must not keep the battle on its loading screen.
          this.frames.set({ ...this.frames(), [id]: { w: 48, h: 48 } });
        })
        .finally(() => this.loading.delete(id));
    }
  }

  // ------------------------------------------------------------- pointer

  /** Unit under a screen point: sprites extend above their tile, the front row wins. */
  private pointed(world: Cell) {
    // Positions as seen locally (a staged move included).
    return view()
      ?.units.filter((u) => u.hp > 0)
      .sort((a, b) => b.y - a.y)
      .find((u) => {
        const v = this.views.get(u.id);
        if (!v) return false;
        // The sprite as the map draws it: as wide as a cell, as tall as its frame.
        const half = (battle()?.board.cellSize ?? 64) / 2;
        const frame = this.frames()[u.battler];
        const height = (frame?.h ?? 48) * (unitScales[u.battler] ?? 1);
        return Math.abs(world.x - v.x()) < half && world.y > v.y() - height && world.y < v.y() + half / 4;
      });
  }

  private cellAt(event: PointerEvent): Cell | null {
    const state = battle();
    if (!state || !this.vp) return null;
    const p = this.vp.toWorld(event.clientX, event.clientY);
    const b = state.board;
    const raw = { x: Math.floor((p.x - b.origin.x) / b.cellSize), y: Math.floor((p.y - b.origin.y) / b.cellSize) };
    const inside = raw.x >= 0 && raw.y >= 0 && raw.x < b.columns && raw.y < b.rows;
    // Moving: a blue cell wins over a sprite standing below it (sprites overlap the cell above).
    const active = current();
    if (inside && mode() === "move" && active) {
      const origin = state.units.find((u) => u.id === active.id);
      if (origin && reachable(state, origin).has(key(raw))) return raw;
    }
    // Aiming (attack, skill, item, move) is the cell under the pointer, never the sprite that overlaps it from the cell below.
    // Only picking a unit (select) may click its head, above its cell.
    const occupied = inside && state.units.some((u) => u.hp > 0 && u.x === raw.x && u.y === raw.y);
    if (mode() === "select" && !occupied) {
      const unit = this.pointed(p);
      if (unit) return { x: unit.x, y: unit.y };
    }
    return inside ? raw : null;
  }

  private listen() {
    this.listeners?.();
    const blocked = (event: PointerEvent) =>
      help() || skillMenu() || !!(event.target as HTMLElement)?.closest?.(`button, ${HUD_PANELS}, .rpg-ui-chat`);
    const click = (event: PointerEvent) => {
      if (blocked(event)) return;
      // Right click: back one step, like Escape.
      if (event.button === 2) return void cancel();
      const cell = this.cellAt(event);
      if (cell) chooseCell(cell, { touch: event.pointerType === "touch" });
    };
    const menu = (event: MouseEvent) => {
      if (battle()?.started && !(event.target as HTMLElement)?.closest?.(".rpg-ui-tactical-modal-backdrop")) event.preventDefault();
    };
    const hover = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hoverCell(blocked(event) ? null : this.cellAt(event));
    };
    const leave = () => hoverCell(null);
    window.addEventListener("pointermove", hover);
    document.addEventListener("pointerleave", leave);
    window.addEventListener("pointerup", click);
    window.addEventListener("contextmenu", menu);
    this.listeners = () => {
      window.removeEventListener("contextmenu", menu);
      window.removeEventListener("pointermove", hover);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", click);
    };
  }

  // ------------------------------------------------------------- frame

  frame(now: number) {
    const state = battle();
    if (!state || !this.root) return;
    this.sheets(state);
    if (!loaded()) return;
    this.vp ??= viewportOf(this.root);
    if (!this.vp) return;
    this.screen.reduced = reduced();
    this.screen.attach(this.vp);
    const b = state.board;
    const event = animation?.event;
    // Event clock from the choreography (slows down during hitstop).
    const elapsed = this.choreo.frame(now, animation, state);
    this.time.set(now);
    const attacker = event?.unitId ? state.units.find((u) => u.id === event.unitId) : undefined;
    const target = event?.targetId ? state.units.find((u) => u.id === event.targetId) : undefined;

    // Camera: centre the arena above the HUD, at the zoom of the map (the battle is drawn as the map is: no zoom of its own).
    const mobile = window.innerWidth < 850;
    const zoom = Math.abs(this.vp.scale.x) || 1;
    const center = world(b, { x: (b.columns - 1) / 2, y: (b.rows - 1) / 2 });
    // The HUD is a thin dock at the bottom: lift the arena by half of it, in map pixels.
    const lift = (mobile ? 40 : 28) / zoom;
    const targetX = center.x;
    const targetY = center.y + lift;
    const ease = reduced() ? 1 : 0.09;
    this.cam ??= { x: targetX, y: targetY };
    this.cam.x += (targetX - this.cam.x) * ease;
    this.cam.y += (targetY - this.cam.y) * ease;
    this.vp.plugins.remove("follow");
    this.vp.plugins.remove("animate");
    const shake = this.screen.shakeOffset();
    this.vp.moveCenter(this.cam.x + shake.x, this.cam.y + shake.y);

    this.grid(now);
    this.units(now, elapsed);
    this.placeMenu();

    // Ranged basic attacks: a bolt flies before the preset impact.
    const attackerRole = attacker ? roleOf(state, attacker) : undefined;
    if (attacker && target && attackerRole && event?.kind === "attack" && attackerRole.attack !== "melee" && elapsed > 0.2 && elapsed < 0.65) {
      const a = world(b, attacker);
      const v = world(b, target);
      const k = Math.min(1, (elapsed - 0.2) / 0.35);
      const boltLift = (30 / 64) * b.cellSize;
      this.projectile.set({ ax: a.x, ay: a.y - boltLift, x: a.x + (v.x - a.x) * k, y: a.y - boltLift + (v.y - a.y) * k, color: attackerRole.color, size: attackerRole.attack === "magic" ? 10 : 4 });
    } else if (this.projectile()) this.projectile.set(null);
  }

  /** Highlighted cells, path and cursor (recomputed only when the inputs change). */
  private grid(now: number) {
    const real = battle()!;
    // Targets and areas from the local view (a staged move included).
    const state = view()!;
    const b = real.board;
    const active = current();
    const p = hovered() ?? cursor();
    const command = aimed();
    const skill = activeSkill();
    const kind = mode();
    const move = staged();
    const drawn = route();
    const visible = real.started && !real.winner;
    const show = visible && !!active && real.phase === myTeam();
    const zoneOn = danger();
    // Nothing selected: hovering an opposing unit shows what it threatens.
    const foe = visible && !active ? state.units.find((u) => u.hp > 0 && !friendly(u) && u.x === p.x && u.y === p.y) : undefined;
    this.cursorPulse.set(reduced() ? 1 : 0.75 + Math.sin(now / 180) * 0.25);
    const signature = [real.revision, active?.id, p.x, p.y, kind, skill?.id, selectedSkill(), selectedItem(), JSON.stringify(command), JSON.stringify(move?.cell), JSON.stringify(drawn), show, zoneOn, foe?.id, visible, JSON.stringify(real.objective?.cell), JSON.stringify(real.holds)].join("|");
    if (signature === this.gridKey) return;
    this.gridKey = signature;
    const zone = zoneOn && visible ? dangerZone(state, myTeam() === "ally" ? "enemy" : "ally") : null;
    const threat = foe ? threatOf(state, foe) : null;
    if (!show || !active) {
      this.trail.set([]);
      this.menuUnit = "";
      if (!zone && !threat) {
        this.cells.set(this.withGoal(b, real, []));
        this.cursorMark.set(null);
        return;
      }
      this.cells.set(this.withGoal(b, real, this.overlay(b, zone, threat)));
      const cp = world(b, p);
      this.cursorMark.set(visible ? { x: cp.x, y: cp.y, kind: "select", valid: false } : null);
      return;
    }
    const origin = real.units.find((u) => u.id === active.id)!;
    const paths = kind === "move" && !origin.moved && !origin.acted ? reachable(real, origin) : new Map<string, Cell[]>();
    const previewTarget =
      command && "targetId" in command
        ? state.units.find((u) => u.id === command.targetId)
        : state.units.find((u) => u.hp > 0 && u.x === p.x && u.y === p.y);
    const area = new Set(
      skill && kind === "skill" && previewTarget && targetable(state, active, previewTarget, skill.id)
        ? skillArea(state, active, previewTarget, skill).map(key)
        : [],
    );
    const marks: CellMark[] = [];
    for (let y = 0; y < b.rows; y++)
      for (let x = 0; x < b.columns; x++) {
        const cell = { x, y };
        if (b.blocked.includes(key(cell))) continue;
        // One colour per meaning: blue = where it walks, red = what it can strike (strong on a foe standing there), violet = reach of a
        // skill, green = who an item goes to, orange = what the skill hits around its target. The empty grid stays faint.
        let color = 0xdbbb7d;
        let alpha = 0.025;
        let stroke = 0.24;
        if (zone?.has(key(cell))) {
          color = 0xff4d5e;
          alpha = 0.1;
        }
        if (kind === "move" && paths.has(key(cell))) {
          color = 0x50c9f1;
          alpha = 0.3;
          stroke = 0.85;
        }
        if (kind === "attack" || kind === "skill" || kind === "menu") {
          const dummy = { ...active, ...cell, id: "preview", team: active.team === "ally" ? "enemy" : "ally" } as Unit;
          if ((kind !== "skill" || skill) && targetable(state, active, dummy, kind === "skill" ? selectedSkill() : false)) {
            // The menu does not paint the reach: only the foes that could be struck
            const foe = state.units.some((u) => u.hp > 0 && u.team !== active.team && u.x === x && u.y === y);
            if (kind !== "menu" || foe) {
              color = kind === "skill" ? 0xc698fb : 0xff697b;
              alpha = foe ? 0.5 : 0.2;
              stroke = foe ? 1 : 0.7;
            }
          }
        }
        // An item goes to a unit next to the one that uses it, itself included.
        if (kind === "item" && distance(active, cell) <= 1) {
          color = 0x7fe3a0;
          alpha = state.units.some((u) => u.hp > 0 && u.team === active.team && u.x === x && u.y === y) ? 0.5 : 0.2;
          stroke = 0.9;
        }
        if (area.has(key(cell))) {
          color = skill?.color ?? 0xfda464;
          alpha = 0.55;
          stroke = 1;
        }
        const pos = world(b, cell);
        marks.push({ x: pos.x, y: pos.y, color, alpha, stroke });
      }
    this.cells.set(this.withGoal(b, real, marks));
    const aiming = kind === "attack" || kind === "skill" || kind === "item";
    const cp = world(b, p);
    this.cursorMark.set({
      x: cp.x,
      y: cp.y,
      kind: aiming ? "target" : "select",
      valid: !!previewTarget && aiming && (kind === "item" ? previewTarget.team === active.team && previewTarget.hp > 0 && distance(active, previewTarget) <= 1 : targetable(state, active, previewTarget, kind === "skill" ? selectedSkill() : false)),
    });
    // The path follows the pointer over the blue cells (the drawn route when it ends there).
    const path = kind === "move" && paths.has(key(p)) ? routeTo(p) : undefined;
    this.trail.set(path?.length ? [world(b, origin), ...path.map((c) => world(b, c))] : []);
    this.menuUnit = kind === "menu" ? active.id : "";
  }

  /** The cell a hero has to reach (objective `reach`) is lit in gold over whatever else is drawn there. */
  private withGoal(b: Board, state: BattleState, marks: CellMark[]): CellMark[] {
    // The cells the partners are about to move to, in their blue: they are not offered to my units
    for (const held of (state.holds ?? []).filter((h) => h.owner !== myId())) {
      const pos = world(b, held);
      marks = [...marks.filter((m) => m.x !== pos.x || m.y !== pos.y), { x: pos.x, y: pos.y, color: 0x8fb2ff, alpha: 0.32, stroke: 1 }];
    }
    const goal = state.objective?.type === "reach" ? state.objective.cell : undefined;
    if (!goal) return marks;
    const pos = world(b, goal);
    return [...marks.filter((m) => m.x !== pos.x || m.y !== pos.y), { x: pos.x, y: pos.y, color: 0xffd45e, alpha: 0.5, stroke: 1 }];
  }

  /** Danger zone and / or a hovered enemy's reach (move in orange, attack in red). */
  private overlay(b: Board, zone: Set<string> | null, threat: Threat | null): CellMark[] {
    const marks: CellMark[] = [];
    for (let y = 0; y < b.rows; y++)
      for (let x = 0; x < b.columns; x++) {
        const k = key({ x, y });
        if (b.blocked.includes(k)) continue;
        let color = 0xdbbb7d;
        let alpha = 0.025;
        if (zone?.has(k)) {
          color = 0xff4d5e;
          alpha = 0.1;
        }
        if (threat?.attack.has(k)) {
          color = 0xff4d5e;
          alpha = 0.16;
        }
        if (threat?.move.has(k)) {
          color = 0xff9a4d;
          alpha = 0.18;
        }
        const pos = world(b, { x, y });
        marks.push({ x: pos.x, y: pos.y, color, alpha, stroke: 0.24 });
      }
    return marks;
  }

  /**
   * Screen position (CSS px) of the unit whose action menu is open, for the
   * HUD to place the menu next to it; null when no menu is shown.
   */
  readonly menuAt = signal<{ x: number; y: number } | null>(null);
  /** Screen position (CSS px) of the centre of a cell. */
  screenOf(cell: Cell) {
    const b = battle()?.board;
    if (!b || !this.root) return null;
    const w = world(b, cell);
    const p = this.root.toGlobal({ x: w.x, y: w.y });
    const r = document.querySelector("canvas")?.getBoundingClientRect();
    return { x: Math.round((r?.left ?? 0) + p.x), y: Math.round((r?.top ?? 0) + p.y) };
  }
  private menuUnit = "";
  private placeMenu() {
    const v = this.menuUnit ? this.views.get(this.menuUnit) : undefined;
    if (!v || !this.root) {
      if (this.menuAt()) this.menuAt.set(null);
      return;
    }
    const p = this.root.toGlobal({ x: v.x() + 38, y: v.y() - 34 });
    // Pixi screen coordinates are CSS pixels from the canvas corner.
    const r = document.querySelector("canvas")?.getBoundingClientRect();
    const at = { x: Math.round((r?.left ?? 0) + p.x), y: Math.round((r?.top ?? 0) + p.y) };
    const old = this.menuAt();
    if (!old || Math.abs(old.x - at.x) > 1 || Math.abs(old.y - at.y) > 1) this.menuAt.set(at);
  }

  /** Unit positions, facing, walk cycle, knockback, flash, death fade. */
  private units(now: number, elapsed: number) {
    const state = battle()!;
    const b = state.board;
    const event = animation?.event;
    const attacker = event?.unitId ? state.units.find((u) => u.id === event.unitId) : undefined;
    const target = event?.targetId ? state.units.find((u) => u.id === event.targetId) : undefined;
    const show = state.started && !state.winner && state.phase === myTeam();
    for (const unit of state.units) {
      const v = this.view(unit);
      const pos = world(b, unit);
      const old = animation?.before?.units.find((u) => u.id === unit.id);
      let facing = this.facings.get(unit.id) ?? (unit.team === "ally" ? "up" : "down");
      if (!state.started) facing = unit.team === "ally" ? "up" : "down";
      const hit = event?.hits?.find((h) => h.unitId === unit.id);
      const dying = unit.hp <= 0 && !!hit?.killed && elapsed < 1.3;
      put(v.visible, unit.hp > 0 || dying);
      let px = pos.x;
      let py = pos.y;
      let walking = false;
      if (event?.kind === "move" && event.unitId === unit.id && old) {
        if (elapsed < 0.9) {
          const at = world(b, movementAt(old, event.path ?? [], elapsed));
          px = at.x;
          py = at.y;
          walking = true;
        }
        facing = movementFacing(old, event.path ?? [], Math.min(elapsed, 0.9), facing);
      }
      // The local player's staged move: walked on the local clock, then held.
      const move = staged();
      if (move?.unitId === unit.id) {
        const t = Math.min(0.9, (now - move.at) / 1000);
        const at = world(b, movementAt(move.from, move.path, t));
        px = at.x;
        py = at.y;
        walking = t < 0.9 && !reduced();
        facing = movementFacing(move.from, move.path, t, facing);
      }
      if (attacker?.id === unit.id && target && event?.kind !== "move") facing = facingBetween(unit, target, facing);
      this.facings.set(unit.id, facing);
      const hitFx = this.choreo.unitFx(unit.id);
      put(v.x, px + hitFx.dx);
      put(v.y, py + hitFx.dy);
      put(v.flash, Math.round(hitFx.flash * 20) / 20);
      // What it does while the event plays: an animation the character really has (linked in the Character Editor), else it stands.
      const has = (name: string) => this.textures.get(unit.battler)?.has(name);
      let play = walking ? "walk" : "stand";
      if (event && event.unitId === unit.id && (event.kind === "attack" || event.kind === "skill") && elapsed < 0.7) {
        play = event.kind === "skill" && has("castspell") ? "castspell" : has("attack") ? "attack" : play;
      } else if (hit && elapsed >= 0.5) {
        const name = hit.killed ? "die" : "hurt";
        if (has(name)) play = name;
      }
      put(v.anim, has(play) ? play : walking && has("stand") ? "stand" : play);
      put(v.facing, facing);
      put(v.alpha, dying ? Math.max(0, 1 - (elapsed - 0.55) / 0.7) : unit.acted ? 0.58 : 1);
      const displayHp = hit && old && elapsed < 0.55 ? old.hp : unit.hp;
      put(v.hp, Math.max(0, displayHp / unit.maxHp));
      put(v.acted, unit.acted);
      put(v.friendly, friendly(unit));
      put(v.partner, friendly(unit) && !isMine(unit) ? ([...state.players, ...state.versus].find((p) => p.id === unit.owner)?.name ?? "") : "");
      const isSelected = unit.id === selected();
      put(v.selected, isSelected);
      put(v.pulse, isSelected && show ? Math.round((Math.sin(now / 300) + 1) * 10) / 20 : 0);
    }
    // After the views exist: the component list renders one FieldUnit per id.
    const ids = state.units.map((u) => u.id);
    if (ids.join("|") !== this.unitIds().join("|")) this.unitIds.set(ids);
  }
}

export const field = new Field();

// Debug handle for automated playtests: screen position (CSS px) of a grid cell.
