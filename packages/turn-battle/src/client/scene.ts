import { signal, type WritableSignal } from "canvasengine";
import type { BattleView, Combatant, StagePosition } from "../core";
import { Clock, ease } from "@rpgjs/battle-kit/pure";
import { heroesShift, stagePlace } from "./stage-place";
import { anim, animDuration, animName, impactDelay, TICK_MS, type BattlerInfo } from "./sheets";
import { AnimationPool, type SkillAnimation } from "./animation-pool";

/**
 * Reactive battle scene. The director (TypeScript) writes these signals, the
 * CanvasEngine components (`ui/*.ce`) render them. Nothing here touches Pixi.
 */

/** Particle burst config for `@canvasengine/presets` `<Fx preset>`. */
export type FxPreset = { duration?: number; emitters: Record<string, unknown>[] };

export type EffectSpec =
  | { type: "particles"; x: number; y: number; preset: FxPreset }
  | { type: "arc"; x: number; y: number; color: number; radius: number; rotation: number; width: number; life: number }
  | { type: "ring"; x: number; y: number; color: number; from: number; to: number; width: number; life: number; squash?: number }
  | { type: "beam"; x: number; y: number; color: number; width: number; height: number; life: number }
  | { type: "bolt"; x: number; y: number; color: number; life: number }
  | { type: "label"; x: number; y: number; text: string; color: number; size: number; life: number };

export type Effect = EffectSpec & { key: number };
/** Shape effects are all drawn by one Graphics; `born` is scene time. */
export type Shape = Exclude<EffectSpec, { type: "particles" } | { type: "label" }> & { born: number };
export type Label = Extract<EffectSpec, { type: "label" }> & { key: number };

/** Particle effects are played by the stage's `@canvasengine/presets` FxRuntime; returns a stop function. */
export type ParticleSink = (
  preset: FxPreset,
  x: number,
  y: number,
  o?: { flipX?: boolean; rotation?: number; loop?: boolean },
) => () => void;

export interface Popup {
  key: number;
  x: number;
  y: number;
  value: number;
  kind: "damage" | "heal" | "sp" | "miss";
  crit?: boolean;
  weak?: boolean;
  scale: number;
}

export interface Burst {
  key: number;
  text: string;
  sub?: string;
  color: number;
}

export interface Backdrop {
  /** Painted background (far layer). */
  bg: string;
  /** Transparent foreground overlay (near layer, blurred). */
  fg?: string;
  bgSize?: { w: number; h: number };
  fgSize?: { w: number; h: number };
  /** CanvasEngine `<Weather>` presets layered over the background (max 2), e.g. `["volcanoEmbers", "ashfall"]`. */
  weather?: string[];
}

let keySeq = 0;
const nextKey = () => ++keySeq;

export class BattlerModel {
  readonly id: string;
  readonly side: Combatant["side"];
  readonly name: string;
  readonly homeX = signal(0);
  readonly homeY = signal(0);
  readonly scale = signal(1);
  /** 0.8 (far) … 1.2 (near): drives character parallax. */
  readonly depth = signal(1);
  readonly offX = signal(0);
  readonly offY = signal(0);
  /** Horizontal parallax offset from the camera, by depth (set by the scene). */
  readonly parallax = signal(0);
  readonly alpha = signal(1);
  /** RPGJS spritesheet texture currently played. */
  readonly anim = signal("idle");
  readonly flash = signal(0);
  readonly blur = signal(0);
  readonly active = signal(false);
  readonly targeted = signal(false);
  readonly hp: WritableSignal<number>;
  readonly maxHp: number;
  readonly stagger: WritableSignal<number>;
  readonly staggerMax: number;
  readonly broken = signal(false);
  readonly dead = signal(false);
  readonly visible = signal(true);
  /** Scanned (a "Scan" command): the enemy HUD shows its HP. */
  readonly revealed = signal(false);
  /** A player's character (PvP opponents lie down instead of dissolving). */
  readonly owned: boolean;
  /** Where the troop places it on the stage; the formation places the others. */
  readonly position?: StagePosition;
  /** Summoned creature (dissolves when it falls or leaves). */
  readonly summoned: boolean;
  private pending: { name: string; hold: boolean; resolve: () => void } | null = null;

  constructor(
    c: Combatant,
    readonly info: BattlerInfo,
    private clock: Clock,
  ) {
    this.id = c.id;
    this.position = c.position;
    this.side = c.side;
    this.name = c.name;
    this.hp = signal(c.hp);
    this.maxHp = c.stats.maxHp;
    this.stagger = signal(c.stagger?.value ?? 0);
    this.staggerMax = c.stagger?.max ?? 0;
    this.owned = !!c.owner;
    this.summoned = !!c.summon;
    this.revealed.set(!!c.revealed);
    this.dead.set(c.hp <= 0);
    if (c.hp <= 0) this.anim.set(`${animName(info, "dead")}@hold`);
    // Joining mid-battle (spectator): fallen monsters have already dissolved.
    if (c.hp <= 0 && c.side === "enemy" && !this.owned) this.alpha.set(0);
  }

  get facingLeft() {
    return this.side === "ally";
  }
  get x() {
    return this.homeX() + this.offX() + this.parallax();
  }
  get y() {
    return this.homeY() + this.offY();
  }
  get height() {
    return this.info.bounds.h * this.scale();
  }
  get width() {
    return this.info.bounds.w * this.scale();
  }
  get chest() {
    return { x: this.x, y: this.y - this.height * 0.5 };
  }
  get head() {
    return { x: this.x, y: this.y - this.height - 8 };
  }

  /**
   * Ticks of the sprite since the animation began, to know which frame it really draws: it advances as the Sprite does, by the
   * `deltaRatio` of each frame (canvasengine is patched for it, see docs/pending/canvasengine-sprite-frame-rate.md).
   */
  private spriteTicks = 0;
  private frameWaiters: { ticks: number; resolve: () => void }[] = [];

  /** Called by the battler component once per rendered frame, with the step the Sprite advances by. */
  onSpriteTick(deltaRatio = 1) {
    this.spriteTicks += deltaRatio;
    this.frameWaiters = this.frameWaiters.filter((waiter) => {
      if (this.spriteTicks < waiter.ticks) return true;
      waiter.resolve();
      return false;
    });
  }

  /**
   * Resolves when the animation that plays reaches its impact frame as the sprite draws it: a projectile, a Visual Effect or
   * a hit then leaves at the moment the strike or the cast is seen, at any frame rate. Never blocks (safety timer).
   */
  reachImpact(name: string): Promise<void> {
    const a = this.info.anims.get(animName(this.info, name));
    if (!a) return Promise.resolve();
    const delay = impactDelay(a);
    return new Promise<void>((resolve) => {
      if (this.spriteTicks * TICK_MS >= delay) return resolve();
      this.frameWaiters.push({ ticks: Math.ceil(delay / TICK_MS), resolve });
      void this.clock.wait(delay * 2 + 250).then(resolve);
    });
  }

  /** Play an animation; resolves when a one-shot animation ends (or holds). */
  play(name: string, o: { hold?: boolean } = {}): Promise<void> {
    this.pending?.resolve();
    this.pending = null;
    // A new animation starts from its first frame: what waited on the previous one goes on.
    this.spriteTicks = 0;
    this.frameWaiters.forEach((waiter) => waiter.resolve());
    this.frameWaiters = [];
    const n = animName(this.info, name);
    const a = this.info.anims.get(n)!;
    // Replaying the same texture needs a change for the Sprite to restart it.
    if (this.anim() === n) this.anim.set(`${n}@hold`);
    this.anim.set(n);
    if (a.loop) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const pending = { name: n, hold: !!o.hold, resolve };
      this.pending = pending;
      // Safety net: never let a sprite animation block the battle (the end of the animation normally comes from the Sprite).
      void this.clock.wait(animDuration(a) * 2 + 250).then(() => this.pending === pending && this.finish());
    });
  }

  /** Called by `<Sprite sheet onFinish>` at the end of each cycle. */
  onSheetFinish() {
    if (this.pending && this.anim() === this.pending.name) this.finish();
  }

  private finish() {
    const p = this.pending!;
    this.pending = null;
    if (p.hold) this.anim.set(`${p.name}@hold`);
    else this.idle();
    p.resolve();
  }

  idle() {
    if (this.dead()) return;
    this.anim.set(this.broken() ? `${animName(this.info, "staggered")}@hold` : animName(this.info, "idle"));
  }
}

export class Scene {
  readonly clock = new Clock();
  readonly active = signal(false);
  readonly size = signal({ w: 1280, h: 720 });
  readonly battlers = signal<BattlerModel[]>([]);
  readonly backdrop = signal<Backdrop | null>(null);
  /** Where the troop puts the party (the heroes that have no place of their own follow it). */
  private heroesAt?: StagePosition;
  readonly camX = signal(640);
  readonly camY = signal(360);
  readonly zoom = signal(1);
  readonly shakeX = signal(0);
  readonly shakeY = signal(0);
  /** Slow idle camera sway so the parallax layers always breathe. */
  readonly driftX = signal(0);
  readonly driftY = signal(0);
  // Transient visuals use fixed pools created once (stable CanvasEngine trees).
  readonly shapes = signal<Shape[]>([]);
  /** The animations of the skills (sprite sheets of the project) playing where the hits land. */
  readonly animations = signal<SkillAnimation[]>([]);
  private readonly animationPool = new AnimationPool((items) => this.animations.set(items));
  /** Set by the stage component once its particle layer is mounted. */
  particles: ParticleSink = () => () => {};
  readonly labelSlots = Array.from({ length: 10 }, () => signal<Label | null>(null));
  readonly popupSlots = Array.from({ length: 14 }, () => signal<Popup | null>(null));
  private labelIndex = 0;
  private popupIndex = 0;
  readonly flash = signal({ alpha: 0, color: 0xffffff });
  readonly frozen = signal(false);
  /** Black overlay (defeat). */
  readonly fade = signal(0);
  /** Stage opacity: 0 shows the map, 1 the battle (battle transition). */
  readonly reveal = signal(0);
  readonly zoomBlur = signal({ strength: 0, x: 0.5, y: 0.5 });
  readonly rgbSplit = signal(0);
  readonly burst = signal<Burst | null>(null);
  readonly time = signal(0);
  reduced = false;
  private shakeLeft = 0;
  private shakePower = 0;

  /** Battler assets of this battle (summons included). */
  private infos = new Map<string, BattlerInfo>();

  start(view: BattleView, infos: Map<string, BattlerInfo>, backdrop: Backdrop | null) {
    this.infos = infos;
    this.clock.flush();
    this.clearTransient();
    this.burst.set(null);
    this.flash.set({ alpha: 0, color: 0xffffff });
    this.backdrop.set(backdrop);
    this.heroesAt = view.heroesPosition;
    this.battlers.set(view.combatants.map((c) => new BattlerModel(c, infos.get(c.battler)!, this.clock)));
    this.layout();
    this.resetCameraNow();
    this.reveal.set(0);
    this.fade.set(0);
    this.active.set(true);
  }

  stop() {
    this.active.set(false);
    this.backdrop.set(null);
    this.clock.flush();
    this.battlers.set([]);
    this.clearTransient();
  }

  private clearTransient() {
    this.shapes.set([]);
    this.animationPool.clear();
    this.labelSlots.forEach((s) => s.set(null));
    this.popupSlots.forEach((s) => s.set(null));
  }

  /**
   * A combatant joins mid-battle (summon): the formation is recomputed and the
   * others slide to their new places. Returns its model.
   */
  addBattler(c: Combatant): BattlerModel | undefined {
    const info = this.infos.get(c.battler);
    if (!info || this.actor(c.id)) return this.actor(c.id);
    const before = new Map(this.battlers().map((b) => [b.id, b.homeX() + b.offX()]));
    const model = new BattlerModel(c, info, this.clock);
    this.battlers.set([...this.battlers(), model]);
    this.relayout(before);
    return model;
  }

  /** A combatant leaves (summon gone): the others close ranks. */
  removeBattler(id: string) {
    const before = new Map(this.battlers().map((b) => [b.id, b.homeX() + b.offX()]));
    this.battlers.set(this.battlers().filter((b) => b.id !== id));
    this.relayout(before);
  }

  private relayout(before: Map<string, number>) {
    const oldY = new Map(this.battlers().map((b) => [b.id, b.homeY()]));
    this.layout();
    for (const b of this.battlers()) {
      const x0 = before.get(b.id);
      if (x0 === undefined) continue;
      const dx = x0 - b.homeX();
      const dy = (oldY.get(b.id) ?? b.homeY()) - b.homeY();
      if (!dx && !dy) continue;
      b.offX.set(dx);
      b.offY.set(dy);
      void this.clock.tween(420, (k) => {
        b.offX.set(dx * (1 - k));
        b.offY.set(dy * (1 - k));
      });
    }
  }

  actor(id: string) {
    return this.battlers().find((b) => b.id === id);
  }

  get center() {
    const { w, h } = this.size();
    return { x: w / 2, y: h / 2 };
  }

  get uiScale() {
    return this.size().h / 720;
  }

  /** FFBE-like formation: heroes in a slanted column on the right, foes on the left. */
  layout() {
    const { w, h } = this.size();
    const cellScale = (h * 0.3) / 256;
    const shift = heroesShift(this.heroesAt);
    for (const side of ["ally", "enemy"] as const) {
      const list = this.battlers().filter((b) => b.side === side);
      const n = list.length;
      list.forEach((b, i) => {
        const placed = b.position ? stagePlace(b.position, { w, h }) : undefined;
        const t = n === 1 ? 0.5 : i / (n - 1);
        const spread = side === "ally" ? 0.22 : 0.27;
        const moved = side === "ally" ? shift : { x: 0, y: 0 };
        const y = placed?.y ?? h * ((n === 1 ? 0.62 : 0.47 + (side === "ally" ? 0.03 : 0) + t * spread) + moved.y);
        const x = placed?.x ?? w * ((side === "ally" ? 0.64 + (i % 2) * 0.07 : 0.3 - (i % 2) * 0.1 - (n > 3 ? t * 0.04 : 0)) + moved.x);
        b.homeX.set(x);
        b.homeY.set(y);
        b.depth.set(placed?.depth ?? 0.85 + ((y / h - 0.47) / 0.27) * 0.3);
        const depthScale = placed?.depthScale ?? 0.92 + ((y / h - 0.47) / 0.27) * 0.12;
        b.scale.set(cellScale * (b.info.hints.scale ?? 1) * depthScale * (side === "enemy" && n > 3 && !placed ? 0.9 : 1));
      });
    }
  }

  /** Per-frame update, called from the stage component's `tick`. */
  update(realMs: number) {
    const dt = this.clock.tick(realMs);
    this.time.set(this.time() + dt);
    const t = this.time();
    const { w, h } = this.size();
    const sway = this.reduced ? 0 : 1;
    this.driftX.set(Math.sin(t / 5200) * w * 0.012 * sway);
    this.driftY.set(Math.sin(t / 3700) * h * 0.006 * sway);
    if (this.shakeLeft > 0) {
      this.shakeLeft -= realMs;
      const p = this.shakePower * Math.min(1, this.shakeLeft / 120);
      this.shakeX.set((Math.random() - 0.5) * 2 * p);
      this.shakeY.set((Math.random() - 0.5) * 2 * p);
    } else if (this.shakeX() || this.shakeY()) {
      this.shakeX.set(0);
      this.shakeY.set(0);
    }
    // Expire shape effects.
    const shapes = this.shapes();
    if (shapes.length && shapes.some((e) => t - e.born > e.life)) this.shapes.set(shapes.filter((e) => t - e.born <= e.life));
    // Far characters follow the camera less than near ones.
    const pan = this.camX() + this.driftX() - w / 2;
    for (const b of this.battlers()) {
      const p = pan * (1 - b.depth()) * 0.9;
      if (Math.abs(p - b.parallax()) > 0.05) b.parallax.set(p);
    }
    return dt;
  }

  // ------------------------------------------------------------- camera

  focus(x: number, y: number, zoom: number, ms = 380) {
    if (this.reduced) zoom = 1 + (zoom - 1) * 0.3;
    const from = { x: this.camX(), y: this.camY(), z: this.zoom() };
    return this.clock.tween(ms, (k) => {
      this.camX.set(from.x + (x - from.x) * k);
      this.camY.set(from.y + (y - from.y) * k);
      this.zoom.set(from.z + (zoom - from.z) * k);
    }, ease.inOutCubic);
  }

  resetCamera(ms = 420) {
    return this.focus(this.center.x, this.center.y, 1, ms);
  }

  resetCameraNow() {
    this.camX.set(this.center.x);
    this.camY.set(this.center.y);
    this.zoom.set(1);
  }

  shake(power: number, ms = 220) {
    if (this.reduced) power *= 0.25;
    this.shakePower = Math.max(this.shakeLeft > 0 ? this.shakePower : 0, power);
    this.shakeLeft = Math.max(this.shakeLeft, ms);
  }

  flashScreen(color: number, alpha: number, ms = 200) {
    if (this.reduced) alpha *= 0.4;
    return this.clock.tween(ms, (k) => this.flash.set({ color, alpha: alpha * (1 - k) }), ease.outCubic);
  }

  /** Hit-stop: sprites, particles and choreography freeze for a few real ms. */
  hitstop(ms: number) {
    if (this.reduced) return;
    this.clock.freeze(ms);
    this.frozen.set(true);
    setTimeout(() => this.frozen.set(false), ms);
  }

  /** Radial zoom blur centred on a world point (dash, limit, break). */
  zoomBlurAt(x: number, y: number, strength: number, ms: number) {
    if (this.reduced) return Promise.resolve();
    const s = this.toScreen(x, y);
    const { w, h } = this.size();
    return this.clock.tween(ms, (k) => this.zoomBlur.set({ strength: strength * (1 - k), x: s.x / w, y: s.y / h }), ease.outCubic);
  }

  chromatic(amount: number, ms: number) {
    if (this.reduced) return Promise.resolve();
    return this.clock.tween(ms, (k) => this.rgbSplit.set(amount * (1 - k)), ease.outCubic);
  }

  toScreen(x: number, y: number) {
    const { w, h } = this.size();
    return {
      x: (x - this.camX()) * this.zoom() + w / 2,
      y: (y - this.camY()) * this.zoom() + h / 2,
    };
  }

  // ------------------------------------------------------------- effects

  spawn(spec: EffectSpec) {
    if (spec.type === "particles") {
      this.particles(spec.preset, spec.x, spec.y);
    } else if (spec.type === "label") {
      this.labelSlots[this.labelIndex++ % this.labelSlots.length].set({ ...spec, key: nextKey() });
    } else {
      this.shapes.set([...this.shapes(), { ...spec, born: this.time() }]);
    }
  }

  /** Plays an animation of the project (a sprite sheet of the engine) at a point of the stage; it goes away when it ends. */
  playAnimation(sheet: string, x: number, y: number, scale: number) {
    return this.animationPool.play(sheet, x, y, scale);
  }

  endAnimation(key: number) {
    this.animationPool.end(key);
  }

  popup(p: Omit<Popup, "key">) {
    this.popupSlots[this.popupIndex++ % this.popupSlots.length].set({ ...p, key: nextKey() });
  }

  showBurst(text: string, color: number, sub?: string) {
    this.burst.set({ key: nextKey(), text, color, sub });
  }

  setTargets(ids: string[]) {
    for (const b of this.battlers()) b.targeted.set(ids.includes(b.id));
  }

  setActive(id: string | null) {
    for (const b of this.battlers()) b.active.set(b.id === id);
  }

  /** Current animation data of an actor (impact timing). */
  animOf(b: BattlerModel, name: string) {
    return anim(b.info, name);
  }
}

export const scene = new Scene();
