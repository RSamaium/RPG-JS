import { snapshot, type Beat, type BattleView, type Combatant, type FxName, type Hit, type Snap } from "../core";
import { ease, runVisualEffect, type PlayableVisualEffect, type VisualEffectPlayback } from "@rpgjs/battle-kit/pure";
import { FxPlayer } from "@rpgjs/battle-kit";
import { elementColor } from "@rpgjs/battle-kit/pure";
import { ATTACK_SCALE, breakFx, builtinFx, burst, dissolveFx, hasPreset, isAttackPreset, playPreset, type FxFn } from "./fx";
import { FORMATION_SLIDE_MS, type BattlerModel, type FxPreset, type Scene } from "./scene";
import { sfx, sfxSound } from "./sfx";
import {
  banner,
  cutin,
  foeIds,
  member,
  nextKey,
  order,
  partyIds,
  players,
  result,
  spectating,
  shownExp,
  shownGold,
  t,
  viewer,
  type OrderChip,
  type UiCombatant,
} from "./state";

type ActionBeat = Extract<Beat, { t: "action" }>;

/** Given to `battle.onBeat(beat, scene, steps)` for every beat. */
export interface BeatSteps {
  /** Beat type: `steps.t === "action"` narrows to `ActionSteps`. */
  t: Exclude<Beat["t"], "action">;
  beat: Beat;
  /** Play the default choreography of this beat (then add your own touches). */
  play(): Promise<void>;
  /** True once a step ran: the default choreography is then skipped. */
  used: boolean;
}

/** Steps of an `action` beat (attack, skill, item, limit), in their default order. */
export interface ActionSteps extends Omit<BeatSteps, "t"> {
  t: "action";
  beat: ActionBeat;
  actor: BattlerModel;
  targets: BattlerModel[];
  /** Highlight the actor, show the action name banner. */
  announce(): void;
  /** Limit bursts: cinematic video and cut-in line (no-op otherwise). */
  cutin(): Promise<void>;
  /** Wind-up: flash, charge effect (the cast Visual Effect, or `fx`), camera push on the actor. */
  charge(o?: { fx?: FxName; color?: string }): Promise<void>;
  /** Run next to a target (default: the first one), with dust and motion blur. */
  dashTo(targetId?: string): Promise<void>;
  /** Melee: `dashTo()`; otherwise frame actor and targets. */
  approach(): Promise<void>;
  /** Play the actor animation up to its impact frame (projectile for ranged attacks); with a Visual Effect, start it toward the targets. */
  swing(anim?: string): Promise<void>;
  /** Every hit of the beat: effect (`fx` overrides), numbers, flashes, stagger breaks; the first hit waits for the `hitAt` of the Visual Effect. */
  strike(o?: { fx?: FxName; waveDelay?: number }): Promise<void>;
  /** Knocked-out targets fall (monsters dissolve). */
  fall(): Promise<void>;
  /** Back to the slot, banner cleared, camera reset. */
  returnHome(): Promise<void>;
  /** The whole default sequence. */
  all(): Promise<void>;
}

export interface DirectorHooks {
  /** Play a cinematic video (RPGJS cinematic player); resolves when it ends or is skipped. */
  cinematic(src: string): Promise<void>;
  /** Client hooks (`battle.onBeat`): resolve `false` (or use `steps`) to replace the default choreography. */
  beat(beat: Beat, steps: BeatSteps | ActionSteps): Promise<boolean>;
  fx: Record<string, FxFn>;
  /** The heroes won: plays the music of the victory. Returns false when the battle has none. */
  victoryMusic?(): boolean;
}

const hitCounts = new Map<string, number>();
/** Looping status effects per battler (CanvasEngine STATUS / AURA presets). */
const loops = new Map<string, () => void>();
const stopLoop = (key: string) => {
  loops.get(key)?.();
  loops.delete(key);
};

/**
 * Plays server beats on the scene. It never decides anything: it only turns
 * "what happened" into timing, camera, impacts and numbers.
 */
export class Director {
  private skipCutin: (() => void) | null = null;

  constructor(
    private scene: Scene,
    public display: BattleView,
    private hooks: DirectorHooks,
  ) {}

  private get clock() {
    return this.scene.clock;
  }
  private get s() {
    return this.scene.uiScale;
  }

  skip() {
    this.skipCutin?.();
  }

  async play(beat: Beat) {
    const steps = this.stepsFor(beat);
    const keep = await this.hooks.beat(beat, steps);
    // A hook that returned false or used the steps has played the beat itself:
    // only converge on the authoritative numbers.
    if (!keep || steps.used) return this.applySnap(beat.snap);
    await this.perform(beat);
  }

  /** Default choreography of a beat. */
  private async perform(beat: Beat) {
    switch (beat.t) {
      case "intro":
        publish(this.display);
        await this.intro();
        break;
      case "turn":
        await this.turn(beat.actor, beat.order);
        break;
      case "action":
        await this.action(beat);
        break;
      case "guard":
        await this.guard(beat.actor);
        break;
      case "recover":
        await this.recover(beat.actor);
        break;
      case "leave":
        await this.leave(beat.actor);
        break;
      case "escape":
        await this.escape(beat.success);
        break;
      case "end":
        this.applySnap(beat.snap);
        await this.end(beat.result.outcome);
        result.set(beat.result);
        rollCounters(beat.result.exp, beat.result.gold);
        return;
    }
    this.applySnap(beat.snap);
  }

  /**
   * After a beat cut short: the screen takes the state of the server. Its battlers (a summon that came is added, one that left is
   * removed), each back home and at rest, its numbers, and its result with the counters of the result screen.
   */
  resync(state: BattleView) {
    // A battler gone from the server (a summon that left) takes its looping effects with it, as in `leave`.
    for (const b of this.scene.battlers())
      if (!state.combatants.some((c) => c.id === b.id)) {
        stopLoop(`stun:${b.id}`);
        stopLoop(`guard:${b.id}`);
      }
    const before = this.scene.battlers().map((b) => b.id).join();
    this.scene.settleBattlers(state.combatants);
    if (this.scene.battlers().map((b) => b.id).join() !== before) this.replaceLoopsAfterSlide();
    this.display = structuredClone(state);
    this.applySnap(snapshot(state));
    if (state.result && !result()) {
      // As at the end of a battle played to its end: no status effect loops behind the result screen.
      Director.clearLoops();
      result.set(state.result);
      rollCounters(state.result.exp, state.result.gold);
    }
  }

  /** Converge on authoritative numbers after each beat. */
  applySnap(snap: Snap[]) {
    for (const s of snap) {
      const c = this.display.combatants.find((x) => x.id === s.id);
      if (!c) continue;
      c.hp = s.hp;
      c.sp = s.sp;
      c.guarding = s.guarding;
      if (c.stagger && s.stagger !== null) {
        c.stagger.value = s.stagger;
        c.stagger.broken = s.broken;
      }
      if (c.limit && s.limit !== null) c.limit.value = s.limit;
      const b = this.scene.actor(s.id);
      if (b) {
        b.hp.set(s.hp);
        b.stagger.set(s.stagger ?? 0);
        if (b.broken() !== s.broken) {
          b.broken.set(s.broken);
          b.idle();
        }
        this.syncStatus(b, s.broken, s.guarding);
      }
    }
    publish(this.display);
  }

  /** Stunned enemies get `statusStun`, guarding heroes `shieldBarrier` (looping presets). */
  private syncStatus(b: BattlerModel, broken: boolean, guarding: boolean) {
    const stun = `stun:${b.id}`;
    const guard = `guard:${b.id}`;
    if (broken && !b.dead() && !loops.has(stun))
      loops.set(stun, playPreset(this.scene, "statusStun", b.head.x, b.head.y + 6, { loop: true, scale: this.s }));
    if ((!broken || b.dead()) && loops.has(stun)) stopLoop(stun);
    if (guarding && !b.dead() && !loops.has(guard))
      loops.set(guard, playPreset(this.scene, "shieldBarrier", b.chest.x, b.chest.y, { loop: true, scale: this.s }));
    if ((!guarding || b.dead()) && loops.has(guard)) stopLoop(guard);
  }

  /** Stop every looping effect (battle closed). */
  static clearLoops() {
    for (const key of [...loops.keys()]) stopLoop(key);
  }

  /** The result counters stop rolling (battle closed): a later battle starts from its own numbers. */
  static stopCounters() {
    if (countersFrame !== null) cancelAnimationFrame(countersFrame);
    countersFrame = null;
  }

  /**
   * The status loops are played at a fixed place: once the formation has slid to its new places (a summon came or left), each one
   * is played again where its battler now stands.
   */
  private replaceLoopsAfterSlide() {
    const scene = this.scene;
    void this.clock.wait(FORMATION_SLIDE_MS).then(() => {
      if (!scene.active()) return;
      for (const b of scene.battlers()) {
        const stun = loops.has(`stun:${b.id}`);
        const guard = loops.has(`guard:${b.id}`);
        if (!stun && !guard) continue;
        stopLoop(`stun:${b.id}`);
        stopLoop(`guard:${b.id}`);
        this.syncStatus(b, stun, guard);
      }
    });
  }

  setOrder(ids: string[]) {
    order.set(chips(this.display, ids));
  }

  // ------------------------------------------------------------- beats

  private async intro() {
    const sc = this.scene;
    const { w } = sc.size();
    const all = sc.battlers();
    all.forEach((b) => b.offX.set((b.facingLeft ? 1 : -1) * w * 0.5));
    sc.zoom.set(1.3);
    void sc.flashScreen(0xffffff, 1, 420);
    sc.showBurst(t("turnBattle.encounter"), 0xffd45c);
    void sc.zoomBlurAt(sc.center.x, sc.center.y, 0.35, 700);
    const fade = this.clock.tween(380, (k) => sc.reveal.set(k));
    const zoom = this.clock.tween(1000, (k) => sc.zoom.set(1.3 - 0.3 * k), ease.outCubic);
    const slides = all.map((b, i) =>
      this.clock.wait(120 + i * 80).then(() => {
        const from = b.offX();
        return this.clock.tween(560, (k) => b.offX.set(from * (1 - k)), ease.outExpo);
      }),
    );
    await Promise.all([fade, zoom, ...slides]);
  }

  private async turn(id: string, ids: string[]) {
    this.setOrder(ids);
    const b = this.scene.actor(id);
    this.scene.setActive(id);
    if (!b) return;
    if (b.facingLeft) {
      // Hero steps forward, awaiting orders; the camera leans towards them.
      void this.clock.tween(200, (k) => b.offX.set(-26 * this.s * k), ease.outCubic);
      const c = this.scene.center;
      void this.scene.focus(c.x + (b.x - c.x) * 0.2, c.y, 1.05, 380);
    } else {
      b.flash.set(140);
      this.scene.spawn({ type: "ring", x: b.x, y: b.y, color: 0xff6a6a, from: 10, to: b.width, width: 5, life: 360, squash: 0.3 });
      await this.clock.wait(280);
    }
  }

  private async action(beat: ActionBeat) {
    await this.stepsFor(beat).all();
  }

  stepsFor(beat: ActionBeat): ActionSteps;
  stepsFor(beat: Beat): BeatSteps | ActionSteps;

  /**
   * The default choreography, cut into steps a client `battle.onBeat` hook can
   * reuse (`steps.announce()`, `steps.dashTo()`, `steps.strike({ fx })`…).
   */
  stepsFor(beat: Beat): BeatSteps | ActionSteps {
    const director = this;
    const base: BeatSteps = {
      t: beat.t as BeatSteps["t"],
      beat,
      used: false,
      async play() {
        base.used = true;
        await director.perform(beat);
      },
    };
    if (beat.t !== "action") return base;

    const sc = this.scene;
    const clock = this.clock;
    const s = this.s;
    const a = sc.actor(beat.actor)!;
    const targets = beat.targets.map((id) => sc.actor(id)).filter((x): x is BattlerModel => !!x);
    const dir = a.facingLeft ? -1 : 1;
    const main = targets[0];
    const center = targets.length
      ? {
          x: targets.reduce((sum, b) => sum + b.x, 0) / targets.length,
          y: targets.reduce((sum, b) => sum + b.chest.y, 0) / targets.length,
        }
      : a.chest;
    let playing: Promise<void> = Promise.resolve();
    // The animation the actor plays for this action, started once: by the charge for a spell (it is the wind-up the cast
    // effect goes with), else by the swing.
    let started: string | null = null;
    const startAnim = (name: string) => {
      if (started === name) return;
      started = name;
      playing = a.play(name);
    };
    let swung = false;
    let dashed = false;
    const use = <T>(fn: () => T) => {
      steps.used = true;
      return fn();
    };
    // Visual Effects (the server resolved them from the database): one from the caster to the targets, or split in two parts
    const effect = beat.effect;
    const castEffect = effect ? undefined : beat.castEffect;
    const impactEffect = effect ? undefined : beat.impactEffect;
    const onCaster = effect ?? castEffect;
    let flight: { hit: Promise<void>; done: Promise<void> } | undefined;
    // The effect of the cast on the caster: the impact waits for it to end, so the animation is seen and then the impact, not both at once
    let casting: Promise<void> | undefined;
    /** Plays the Visual Effect toward each target once (its sounds once): the first hit lands at its hitAt. */
    const startEffect = () => {
      if (flight || !effect) return flight;
      const aims = targets.length ? targets : [a];
      const runs = aims.map((t, i) => director.playEffect(effect, a.chest, t.chest, i === 0));
      flight = { hit: runs[0].hit, done: Promise.all(runs.map((r) => r.done)).then(() => undefined) };
      return flight;
    };

    const steps: ActionSteps = {
      t: "action",
      beat,
      used: false,
      play: () => use(() => director.perform(beat)),
      actor: a,
      targets,
      announce: () =>
        use(() => {
          sc.setActive(beat.actor);
          if (beat.label) banner.set({ text: actionLabel(beat), side: a.facingLeft ? "ally" : "enemy", key: nextKey() });
        }),
      cutin: () => use(async () => {
        if (beat.cutin) await director.cutin(beat, a);
      }),
      charge: (o = {}) =>
        use(async () => {
          // Wind-up: flash, charge effect, camera push on the actor.
          a.flash.set(90);
          // Not running to the target: the actor begins its animation with the wind-up, so the cast effect never plays on a
          // character still standing idle. A melee actor begins it once it reaches the target (see `swing`).
          if (!beat.melee) startAnim(beat.anim);
          // Wind-up sound: the weapon for an attack, the spell for a skill.
          if (beat.kind === "attack") sfx("attack");
          else if (beat.kind === "skill" || beat.kind === "limit" || beat.kind === "custom") {
            // The sounds of the Visual Effect of the cast replace the sound the skill chose, else the one of the battle
            if (!onCaster?.sounds?.length && (!beat.castSound || !sfxSound(beat.castSound))) sfx("cast");
          }
          const tint = o.color ?? beat.color ?? elementColor(beat.element ?? (beat.kind === "item" ? "heal" : undefined));
          const castFx = o.fx ?? beat.castFx;
          // Split: the effect of the cast plays on the caster (aimed at the main target), with the gesture of the actor: the spell
          // leaves when the actor animation reaches its impact frame (see `swing`), not at the hitAt of this effect
          const cast = !o.fx && castEffect ? director.playEffect(castEffect, a.chest, main?.chest ?? a.chest, true) : undefined;
          if (cast) casting = cast.done;
          if (!cast && castFx) playPreset(sc, castFx, a.chest.x, a.chest.y, { scale: s, color: tint });
          // The Visual Effect from the caster to the target has its own wind-up
          else if (!cast && beat.kind !== "attack" && !effect)
            director.chargeUp(a, beat.kind, beat.kind === "skill" && !beat.element && !o.color ? "#bfa8ff" : tint);
          await sc.focus(a.x + dir * 40 * s, a.chest.y, beat.kind === "limit" ? 1.22 : 1.12, 220);
        }),
      dashTo: (targetId) =>
        use(async () => {
          const to = (targetId && sc.actor(targetId)) || main;
          if (!to) return;
          // Dash next to the target: motion blur, zoom blur, dust.
          const startX = a.offX();
          const destX = to.x - dir * (to.width * 0.5 + a.width * 0.32) - a.homeX();
          const destY = to.y + 2 - a.homeY();
          sfx("dash");
          playPreset(sc, "dashDust", a.x, a.y, { scale: s, flip: !a.facingLeft });
          void sc.focus((a.x + to.x) / 2, to.chest.y, 1.18, 260);
          void sc.zoomBlurAt(to.x, to.chest.y, 0.18, 320);
          a.blur.set(1);
          await clock.tween(240, (k) => {
            a.offX.set(startX + (destX - startX) * k);
            a.offY.set(destY * k - Math.sin(k * Math.PI) * 18 * s);
          }, ease.inCubic);
          a.blur.set(0);
          dashed = true;
        }),
      approach: () =>
        use(async () => {
          if (beat.melee && main) return steps.dashTo();
          void sc.focus((a.x + center.x) / 2, (a.chest.y + center.y) / 2, beat.kind === "limit" ? 1.15 : 1.08, 300);
        }),
      swing: (anim) =>
        use(async () => {
          swung = true;
          const name = anim ?? beat.anim;
          startAnim(name);
          // What the action sends (a Visual Effect, a projectile, the hit) leaves when the actor is seen striking or casting.
          await a.reachImpact(name);
          if (effect) {
            // The Visual Effect carries the spell to the targets: no projectile, the hit comes at its hitAt (see `strike`)
            startEffect();
            if (!beat.melee && targets.length) void sc.focus((a.chest.x + center.x) / 2, (a.chest.y + center.y) / 2, targets.length > 1 ? 1.06 : 1.12, 260);
            return;
          }
          if (!beat.melee && !dashed && beat.kind === "attack" && main) await director.projectile(a, main, beat.element);
          // Spells: the camera whips to the targets as the hit lands, on the impact frame.
          if (!beat.melee && beat.kind !== "attack" && targets.length) void sc.focus(center.x, center.y, targets.length > 1 ? 1.06 : 1.16, 200);
        }),
      strike: (o = {}) =>
        use(async () => {
          const shown = o.fx ? { ...beat, fx: o.fx } : beat;
          // A Visual Effect shows the hits itself, unless the hook names its own `fx`
          const replaced = !o.fx && !!(effect || impactEffect);
          const flying = effect ? startEffect() : undefined;
          if (casting) await casting;
          for (let i = 0; i < beat.waves.length; i++) {
            if (i > 0) await clock.wait(o.waveDelay ?? (beat.waves.length > 3 ? 90 : 140));
            // The first hit lands when the Visual Effect reaches the target (its hitAt)
            else if (flying) await flying.hit;
            // Split: the effect of the impact plays on each target of the wave, the hit lands at its hitAt
            if (impactEffect) {
              const hitTargets = beat.waves[i].map((hit) => sc.actor(hit.target)).filter((b): b is BattlerModel => !!b);
              const runs = hitTargets.map((b, n) => director.playEffect(impactEffect, b.chest, b.chest, n === 0));
              await runs[0]?.hit;
            }
            // Each extra hit punches the camera a little further in.
            if (i > 0) void sc.focus(sc.camX(), sc.camY(), sc.zoom() + 0.025, 80);
            await director.impact(shown, beat.waves[i], a, i === beat.waves.length - 1, i, replaced);
          }
          // The actor finishes its animation before going home: `playing` ends with the sprite (and never blocks: `play` has a safety net).
          if (swung) await playing;
          // The effect ends before the actor goes home
          if (flying) await flying.done;
        }),
      fall: () =>
        use(async () => {
          const fallen = beat.waves.flat().filter((h) => h.ko);
          await Promise.all(fallen.map((h) => director.fall(h.target)));
        }),
      returnHome: () =>
        use(async () => {
          const fromX = a.offX();
          const fromY = a.offY();
          if (dashed || Math.abs(fromX) > 60 * s) {
            await clock.tween(320, (k) => {
              a.offX.set(fromX * (1 - k));
              a.offY.set(fromY * (1 - k) - Math.sin(k * Math.PI) * 46 * s);
            }, ease.outCubic);
          } else if (a.facingLeft) {
            void clock.tween(200, (k) => a.offX.set(fromX * (1 - k)));
          }
          a.offX.set(0);
          a.offY.set(0);
          banner.set(null);
          sc.setActive(null);
          await sc.resetCamera(320);
        }),
      all: () =>
        use(async () => {
          steps.announce();
          await steps.cutin();
          await steps.charge();
          await steps.approach();
          await steps.swing();
          await steps.strike();
          await steps.fall();
          await steps.returnHome();
        }),
    };
    return steps;
  }

  /** A summoned creature appears: portal, flash, it fades in at its slot. */
  private async summonEnter(unit: Combatant) {
    const sc = this.scene;
    if (!this.display.combatants.some((c) => c.id === unit.id)) this.display.combatants.push(structuredClone(unit));
    const b = sc.addBattler(unit);
    if (!b) return;
    this.replaceLoopsAfterSlide();
    b.alpha.set(0);
    sfx("limit");
    // The portal preset loops: close it once the creature is out.
    const closePortal = playPreset(sc, "summonPortal", b.x, b.y, { scale: this.s * 1.2 });
    void this.clock.wait(900).then(closePortal);
    playPreset(sc, "magicCircle", b.x, b.y, { scale: this.s });
    void sc.flashScreen(0xfff1c8, 0.45, 260);
    void sc.focus(b.x, b.chest.y, 1.16, 320);
    b.offY.set(-60 * this.s);
    await this.clock.tween(520, (k) => {
      b.alpha.set(k);
      b.offY.set(-60 * this.s * (1 - k));
    }, ease.outCubic);
    b.flash.set(160);
    publish(this.display);
    await this.clock.wait(260);
  }

  /** A summon's time is over: it fades away and the formation closes. */
  private async leave(id: string) {
    const sc = this.scene;
    const b = sc.actor(id);
    this.display.combatants = this.display.combatants.filter((c) => c.id !== id);
    stopLoop(`stun:${id}`);
    stopLoop(`guard:${id}`);
    if (b) {
      if (b.visible()) {
        playPreset(sc, "teleport", b.chest.x, b.chest.y, { scale: this.s });
        await this.clock.tween(420, (k) => {
          b.alpha.set(1 - k);
          b.offY.set(-40 * this.s * k);
        });
      }
      sc.removeBattler(id);
      this.replaceLoopsAfterSlide();
    }
    publish(this.display);
    await this.clock.wait(200);
  }

  /** Wind-up before a skill: gathering orb, a sigil under limit bursts. */
  private chargeUp(a: BattlerModel, kind: ActionBeat["kind"], color: string) {
    const s = this.s;
    if (kind === "limit") playPreset(this.scene, "summonSigil", a.x, a.y, { scale: s, color: "#ffe9a8" });
    else if (kind === "item") playPreset(this.scene, "pickup", a.chest.x, a.chest.y, { scale: s, color });
    else playPreset(this.scene, "chargeOrb", a.chest.x, a.chest.y, { scale: s * 0.8, color });
  }

  /** A Visual Effect played from `from` toward `to` (stage positions), on the battle clock; `sounds` false keeps it silent. */
  private playEffect(effect: PlayableVisualEffect, from: { x: number; y: number }, to: { x: number; y: number }, sounds: boolean): VisualEffectPlayback {
    const preset = FxPlayer.visualEffect(effect, { x: to.x - from.x, y: to.y - from.y }, this.s) as FxPreset | undefined;
    return runVisualEffect(effect, {
      spawn: (loop) => (preset ? this.scene.particles(preset, from.x, from.y, { loop }) : () => {}),
      wait: (ms) => this.clock.wait(ms),
      sound: sounds ? (id, volume) => void sfxSound(id, volume) : undefined,
      // A skill plays its effect once, even an effect made to loop
      once: true,
    });
  }

  /** `replaced`: a Visual Effect shows the hits, the effect of the skill (`fx`) is not played. */
  private async impact(beat: ActionBeat, wave: Hit[], attacker: BattlerModel, last: boolean, waveIndex = 0, replaced = false) {
    const sc = this.scene;
    let power = 0;
    let crit = false;
    let heal = false;
    let broke = false;
    for (const hit of wave) {
      if (hit.kind === "summon" && hit.unit) {
        await this.summonEnter(hit.unit);
        continue;
      }
      const target = sc.actor(hit.target);
      if (!target) continue;
      const p = target.chest;
      const c = this.display.combatants.find((x) => x.id === hit.target)!;
      if (hit.kind === "damage") {
        if (!replaced)
          this.playFx(beat.fx ?? (beat.melee ? "slash" : "hit"), p.x, p.y, {
            element: beat.element,
            color: beat.color,
            crit: hit.crit,
            flip: attacker.facingLeft,
            wave: waveIndex,
          });
        if (beat.impactAnimation) sc.playAnimation(beat.impactAnimation, p.x, p.y, this.s);
        if (hit.crit) playPreset(sc, "criticalHit", p.x, p.y, { scale: this.s });
        target.flash.set(hit.crit ? 150 : 100);
        c.hp = Math.max(0, c.hp - hit.amount);
        target.hp.set(c.hp);
        hitCounts.set(c.id, (hitCounts.get(c.id) ?? 0) + 1);
        if (!target.broken() && !hit.ko) void target.play("hurt");
        const push = (attacker.facingLeft ? -1 : 1) * (hit.crit ? 30 : 16) * this.s;
        void this.clock.tween(280, (k) => target.offX.set(push * Math.sin(Math.PI * (1 - k) * 0.5) * (1 - k)), ease.outCubic);
        sc.popup({ x: p.x + (Math.random() - 0.5) * 24, y: p.y - 10, value: hit.amount, kind: "damage", crit: hit.crit, weak: hit.weak, scale: this.s });
        if (hit.weak) sc.spawn({ type: "label", x: p.x, y: p.y - 70 * this.s, text: t("turnBattle.weak"), color: 0xffa24a, size: 17 * this.s, life: 900 });
        if (hit.resist) sc.spawn({ type: "label", x: p.x, y: p.y - 70 * this.s, text: t("turnBattle.resist"), color: 0x9fb6ff, size: 16 * this.s, life: 900 });
        if (hit.crit) sc.spawn({ type: "label", x: p.x, y: p.y - 92 * this.s, text: t("turnBattle.crit"), color: 0xffd45c, size: 20 * this.s, life: 900 });
        power = Math.max(power, hit.amount / Math.max(1, c.stats.maxHp));
        crit ||= !!hit.crit;
        if (hit.broke) {
          broke = true;
          target.broken.set(true);
          void target.play("staggered", { hold: true });
          breakFx(sc, p.x, p.y, this.s);
        }
      } else if (hit.kind === "heal") {
        heal = true;
        if (hit.revive || !replaced) this.playFx(hit.revive ? "revive" : beat.fx ?? "heal", p.x, p.y, { element: "heal" });
        if (beat.impactAnimation) sc.playAnimation(beat.impactAnimation, p.x, p.y, this.s);
        if (hit.revive) {
          target.dead.set(false);
          target.visible.set(true);
          void this.clock.tween(300, (k) => target.alpha.set(0.4 + 0.6 * k));
          target.idle();
        }
        c.hp = Math.min(c.stats.maxHp, hit.revive ? hit.amount : c.hp + hit.amount);
        target.hp.set(c.hp);
        sc.popup({ x: p.x, y: p.y - 10, value: hit.amount, kind: "heal", scale: this.s });
      } else if (hit.kind === "text") {
        // A line over the target ("Missed!", "Potion stolen!").
        sc.spawn({ type: "label", x: p.x, y: target.head.y - 8 * this.s, text: hit.text ? t(hit.text, hit.textParams) : "", color: 0xfff4c8, size: 22 * this.s, life: 1500 });
      } else if (hit.kind === "reveal") {
        // Scan: HP, weaknesses and resistances, then kept on the enemy HUD.
        target.revealed.set(true);
        playPreset(sc, "magicCircle", target.x, target.y, { scale: this.s * 0.8, color: "#9fd8ff" });
        sc.spawn({ type: "label", x: p.x, y: target.head.y - 8 * this.s, text: scanText(c), color: 0x9fd8ff, size: 18 * this.s, life: 2600 });
      } else if (hit.kind === "sp") {
        c.sp = Math.min(c.stats.maxSp, c.sp + hit.amount);
        playPreset(sc, "manaRestore", p.x, p.y, { scale: this.s });
        sc.popup({ x: p.x + 26, y: p.y + 14, value: hit.amount, kind: "sp", scale: this.s * 0.8 });
      }
    }
    publish(this.display);
    // The sounds of a Visual Effect replace the ones of the hit (not the cry of the one hurt)
    const effectSounds = !!(beat.effect ?? beat.impactEffect)?.sounds?.length;
    if (heal && !power && !effectSounds) sfx("heal");
    if (power <= 0) return;
    // The sound the skill chose for its hits replaces the one of the hit, not the cry of the one hurt
    if (!effectSounds && (!beat.impactSound || !sfxSound(beat.impactSound, Math.min(1, 0.6 + power)))) sfx(crit ? "crit" : "hit", Math.min(1, 0.6 + power));
    if (!heal) sfx("hurt", Math.min(1, 0.6 + power));
    const main = sc.actor(wave[0].target)!.chest;
    sc.shake(5 + Math.min(1, power) * 24 * (crit ? 1.5 : 1), crit ? 320 : 200);
    if (crit || beat.kind === "limit") {
      void sc.chromatic(crit ? 10 : 7, 380);
      void sc.flashScreen(0xffffff, 0.35, 180);
    }
    sc.hitstop(crit ? 140 : 60 + Math.min(1, power) * 80);
    await this.clock.wait(10);
    if (broke && last) await this.breakMoment(main.x, main.y);
  }

  /** "SWEEPING STAGGER" moment: full-screen burst, zoom blur, slow motion. */
  private async breakMoment(x: number, y: number) {
    const sc = this.scene;
    sfx("break");
    sc.showBurst(t("turnBattle.break"), 0x9fd0ff, t("turnBattle.staggered"));
    void sc.flashScreen(0xcfe0ff, 0.5, 300);
    void sc.zoomBlurAt(x, y, 0.4, 700);
    void sc.chromatic(12, 700);
    this.clock.boost = 0.35;
    await this.clock.wait(260);
    this.clock.boost = 1;
  }

  /**
   * Resolve a skill / weapon `fx`: game recipes (client option), then a
   * CanvasEngine preset of that name, then plugin recipes, then the element.
   */
  private playFx(
    id: string | undefined,
    x: number,
    y: number,
    o: { element?: string; color?: string; crit?: boolean; flip?: boolean; wave?: number },
  ) {
    const color = o.color ?? elementColor(o.element);
    const own = this.hooks.fx[id ?? ""];
    if (own) return own(this.scene, x, y, { color, scale: this.s, crit: o.crit, flip: o.flip });
    if (hasPreset(id)) {
      // Successive hits alternate their angle a little: combos read as combos.
      const rotation = o.wave ? (o.wave % 2 ? -0.35 : 0.3) : 0;
      // Plain physical colour keeps the preset's own palette.
      const tint = o.color ?? (o.element ? color : undefined);
      const size = this.s * (isAttackPreset(id) ? ATTACK_SCALE : 1) * (o.crit ? 1.2 : 1);
      playPreset(this.scene, id!, x, y, {
        color: tint,
        flip: o.flip,
        rotation,
        scale: size,
        intensity: o.crit ? 1.5 : 1,
        lifetimeScale: isAttackPreset(id) ? 1.4 : 1,
      });
      return;
    }
    const fn = builtinFx[id ?? ""] ?? builtinFx[o.element ?? ""] ?? builtinFx.hit;
    fn(this.scene, x, y, { color, scale: this.s, crit: o.crit, flip: o.flip });
  }

  private async fall(id: string) {
    const b = this.scene.actor(id);
    if (!b || b.dead()) return;
    b.dead.set(true);
    b.broken.set(false);
    sfx("ko");
    await Promise.race([b.play("dead", { hold: true }), this.clock.wait(1600)]);
    stopLoop(`stun:${b.id}`);
    stopLoop(`guard:${b.id}`);
    if (b.dissolves) {
      dissolveFx(this.scene, b.chest.x, b.chest.y, this.s);
      await this.clock.tween(560, (k) => {
        b.alpha.set(1 - k);
        b.offY.set(-14 * k);
      });
      b.visible.set(false);
    }
  }

  private async projectile(from: BattlerModel, to: BattlerModel, element?: string) {
    const a = from.chest, b = to.chest;
    const color = elementColor(element);
    let last = -1;
    await this.clock.tween(160, (k) => {
      if (k - last < 0.2) return;
      last = k;
      this.scene.spawn({
        type: "particles",
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        preset: burst(color, { count: 6, speed: [20, 80], size: 0.35, shape: "softCircle", life: [150, 260] }),
      });
    }, ease.inQuad);
  }

  /** Limit burst: the skill's cinematic video (RPGJS player), or the illustrated cut-in band. */
  private async cutin(beat: ActionBeat, a: BattlerModel) {
    const c = this.display.combatants.find((x) => x.id === beat.actor)!;
    sfx("limit");
    void this.scene.flashScreen(0xffffff, 0.9, 300);
    if (beat.cutin?.video) {
      await this.hooks.cinematic(beat.cutin.video);
    } else {
      cutin.set({ name: c.name, line: beat.cutin!.line, battler: c.battler, key: nextKey() });
      await Promise.race([this.clock.wait(1900), new Promise<void>((resolve) => (this.skipCutin = resolve))]);
      this.skipCutin = null;
      cutin.set(null);
    }
    this.scene.showBurst(beat.label, 0xffe9a8, t("turnBattle.limit"));
    playPreset(this.scene, "limitBurst", this.scene.camX(), this.scene.camY(), { scale: this.s });
    void this.scene.flashScreen(0xffffff, 1, 340);
    void this.scene.zoomBlurAt(a.x, a.chest.y, 0.45, 800);
    this.scene.shake(12, 300);
  }

  private async guard(id: string) {
    const b = this.scene.actor(id);
    if (!b) return;
    this.syncStatus(b, b.broken(), true);
    this.scene.spawn({ type: "label", x: b.x, y: b.head.y - 10 * this.s, text: t("turnBattle.guarding"), color: 0x9fd0ff, size: 18 * this.s, life: 900 });
    await this.clock.wait(420);
    if (b.facingLeft) {
      const from = b.offX();
      await this.clock.tween(180, (k) => b.offX.set(from * (1 - k)));
    }
    this.scene.setActive(null);
  }

  private async recover(id: string) {
    const b = this.scene.actor(id);
    if (!b) return;
    b.broken.set(false);
    b.idle();
    this.syncStatus(b, false, false);
    playPreset(this.scene, "impactBurst", b.chest.x, b.chest.y, { scale: this.s, color: "#ffd45c" });
    this.scene.spawn({ type: "label", x: b.x, y: b.head.y - 10 * this.s, text: t("turnBattle.recover"), color: 0xffd45c, size: 18 * this.s, life: 900 });
    await this.clock.wait(460);
  }

  private async escape(success: boolean) {
    const heroes = this.scene.battlers().filter((b) => b.facingLeft && !b.dead());
    const first = heroes[0];
    if (!success) {
      if (first) this.scene.spawn({ type: "label", x: first.x, y: first.head.y, text: t("turnBattle.escapeFail"), color: 0xffffff, size: 20 * this.s, life: 1000 });
      this.scene.shake(5, 160);
      await this.clock.wait(600);
      return;
    }
    if (first) this.scene.spawn({ type: "label", x: first.x, y: first.head.y, text: t("turnBattle.escapeOk"), color: 0xffffff, size: 22 * this.s, life: 1000 });
    await Promise.all(
      heroes.map((b, i) =>
        this.clock.wait(i * 60).then(() => this.clock.tween(520, (k) => b.offX.set(760 * this.s * k), ease.inCubic)),
      ),
    );
  }

  private async end(outcome: "victory" | "defeat" | "escape") {
    const sc = this.scene;
    sc.setActive(null);
    sc.setTargets([]);
    const heroes = sc.battlers().filter((b) => b.facingLeft && !b.dead());
    if (outcome === "victory") {
      await this.clock.wait(250);
      // The music of the victory replaces the small jingle.
      if (!this.hooks.victoryMusic?.()) sfx("victory");
      void sc.flashScreen(0xffe9a8, 0.4, 420);
      heroes.forEach((b) => {
        void b.play("victory", { hold: true });
        playPreset(sc, "levelUp", b.x, b.y, { scale: this.s });
      });
      Director.clearLoops();
      const cx = heroes.reduce((s, b) => s + b.x, 0) / Math.max(1, heroes.length);
      await sc.focus(cx - 40, heroes[0]?.chest.y ?? 0, 1.18, 800);
      await this.clock.wait(400);
    } else if (outcome === "defeat") {
      await this.clock.tween(900, (k) => sc.fade.set(0.6 * k));
    }
  }
}

/** Push display numbers to the UI signals. */
/** Coop: who commands a unit ("Vous", the other player's name, "· IA" once they left). */
function ownerTag(c: BattleView["combatants"][number]): string {
  if (c.summon) return t("turnBattle.summonTag", { turns: c.summon.turns });
  const name = c.owner && players()[c.owner];
  // Solo fighter: no tags; coop or spectator: who commands what.
  if (!name || (Object.keys(players()).length < 2 && !spectating())) return "";
  const who = c.owner === viewer() ? t("turnBattle.you") : name;
  return c.auto ? t("turnBattle.autoTag", { player: who }) : who;
}

export function publish(view: BattleView) {
  const ui = (c: BattleView["combatants"][number]): UiCombatant => ({
    id: c.id,
    name: c.name,
    side: c.side,
    battler: c.battler,
    hp: c.hp,
    maxHp: c.stats.maxHp,
    sp: c.sp,
    maxSp: c.stats.maxSp,
    limit: c.limit ? c.limit.value : null,
    limitMax: c.limit?.max ?? 0,
    stagger: c.stagger ? c.stagger.value : null,
    staggerMax: c.stagger?.max ?? 0,
    broken: !!c.stagger?.broken,
    guarding: c.guarding,
    dead: c.hp <= 0,
    hits: hitCounts.get(c.id) ?? 0,
    tag: ownerTag(c),
    mine: !c.owner || !viewer() || c.owner === viewer(),
  });
  for (const c of view.combatants) {
    const next = ui(c);
    const s = member(c.id);
    const prev = s();
    if ((Object.keys(next) as (keyof UiCombatant)[]).some((k) => prev[k] !== next[k])) s.set(next);
  }
  const sync = (sig: typeof partyIds, ids: string[]) => {
    if (sig().join("|") !== ids.join("|")) sig.set(ids);
  };
  sync(partyIds, view.combatants.filter((c) => c.side === "ally").map((c) => c.id));
  sync(foeIds, view.combatants.filter((c) => c.side === "enemy").map((c) => c.id));
}

/** The banner of an action: its label, with the picked option of a custom command ("Summon: Phoenix"). */
export function actionLabel(beat: Pick<ActionBeat, "label" | "option">): string {
  return beat.option ? t("turnBattle.commandOption", { command: beat.label, option: beat.option }) : beat.label;
}

/** What a scan shows over the target: "HP 180/250 · Weak: Fire, Light · Resists: Ice" (each part is an i18n key). */
export function scanText(c: BattleView["combatants"][number]): string {
  const el = (ids: string[]) => ids.map((id) => t(`turnBattle.el.${id}`)).join(", ");
  const parts = [t("turnBattle.scan.hp", { hp: c.hp, maxHp: c.stats.maxHp })];
  if (c.weaknesses.length) parts.push(t("turnBattle.scan.weak", { elements: el(c.weaknesses) }));
  if (c.resists.length) parts.push(t("turnBattle.scan.resists", { elements: el(c.resists) }));
  return parts.join(" · ");
}

/** EXP / gold roll up on the result screen. */
let countersFrame: number | null = null;
function rollCounters(exp: number, gold: number) {
  Director.stopCounters();
  shownExp.set(0);
  shownGold.set(0);
  const start = performance.now() + 450;
  const step = (now: number) => {
    const k = Math.min(1, Math.max(0, (now - start) / 900));
    const e = 1 - (1 - k) ** 3;
    shownExp.set(Math.round(exp * e));
    shownGold.set(Math.round(gold * e));
    countersFrame = k < 1 ? requestAnimationFrame(step) : null;
  };
  countersFrame = requestAnimationFrame(step);
}

export function chips(view: BattleView, ids: string[], landingIndex = -1): OrderChip[] {
  const seen = new Map<string, number>();
  return ids.map((id, i) => {
    const c = view.combatants.find((x) => x.id === id)!;
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    return {
      key: `${id}#${n}`,
      id,
      side: c.side,
      battler: c.battler,
      name: c.name,
      current: i === 0,
      landing: i === landingIndex,
    };
  });
}
