import type { BattleEvent, BattleState, Cell, Unit } from "../core/types";
import { world } from "../core/board";
import { skillFor } from "../core/skills";
import { EFFECT_START, actionTiming, itemTiming } from "../core/timing";

export { actionTiming, itemTiming };
import { effectCues, type PlayableVisualEffect, type PresetOptions } from "@rpgjs/battle-kit/pure";

/**
 * What the choreography drives: the shared kit's preset player and screen
 * effects (`@rpgjs/battle-kit`), plus the field's floating numbers.
 */
export interface Stage {
  fx: {
    play(name: string, x: number, y: number, o?: PresetOptions): () => void;
    aimed(name: string, from: { x: number; y: number }, to: { x: number; y: number }, o?: PresetOptions): () => void;
    /** A Visual Effect of the Studio from `from` toward `to` (see `FxPlayer.playEffect`). */
    playEffect(effect: PlayableVisualEffect, from: { x: number; y: number }, to: { x: number; y: number }, o?: { scale?: number }): () => void;
    update(dt: number): void;
  };
  /** Plays a sound of a Visual Effect (an RPGJS sound id, `volume` from 0 to 1). Without it, the effects are silent. */
  sound?(id: string, volume: number): void;
  screen: {
    hitstop: number;
    update(dt: number): void;
    freeze(ms: number): void;
    shakeScreen(power: number, ms?: number): void;
    zoomBlurAt(x: number, y: number, strength: number, ms?: number): void;
    shockwaveAt(x: number, y: number, ms?: number): void;
    chromatic(amount: number, ms?: number): void;
  };
  popup(text: string, x: number, y: number, o?: { color?: number; big?: boolean }): void;
}

/**
 * Turns a battle event (attack, skill, item…) into what the battlefield shows at its time: numbers, the flash of a unit that is hit, the
 * Visual Effects of the Studio. Times are seconds of the event's own clock.
 */

const CHEST = 34; // sprite chest above the tile centre

interface Cue {
  at: number;
  run: () => void;
}

export class Choreography {
  private event: BattleEvent | null = null;
  private cues: Cue[] = [];
  private clock = 0;
  private last = 0;
  private flashes = new Map<string, number>();
  private knocks = new Map<string, { dx: number; dy: number; at: number }>();

  constructor(
    private stage: Stage,
    private reduced: () => boolean,
    /** Shared speed (1 normal, 2 fast, 3 fast-forward): scales the event clock and effects. */
    private pace: () => number = () => 1,
  ) {}

  private get fx() {
    return this.stage.fx;
  }
  private get screen() {
    return this.stage.screen;
  }

  /**
   * Called every frame with the current animation; returns the event clock
   * (seconds, hitstop-aware) used by the renderer.
   */
  frame(now: number, animation: { event: BattleEvent; before: BattleState | null; custom?: boolean } | null, state: BattleState): number {
    const dt = (this.last ? Math.min(50, now - this.last) : 16) * this.pace();
    this.last = now;
    this.fx.update(dt);
    this.screen.update(dt);
    if (!animation) {
      this.event = null;
      return 10;
    }
    if (animation.event !== this.event) {
      this.event = animation.event;
      this.clock = 0;
      this.cues = animation.custom ? [] : this.plan(animation.event, animation.before, state).sort((a, b) => a.at - b.at);
    }
    // Hitstop: the action freezes for a few frames on impact.
    this.clock += dt * (this.screen.hitstop > 0 ? 0.07 : 1);
    const t = this.clock / 1000;
    while (this.cues.length && this.cues[0].at <= t) this.cues.shift()!.run();
    return t;
  }

  /** Visual offset and flash of a unit (knockback, hit flash). */
  unitFx(id: string): { dx: number; dy: number; flash: number } {
    const t = this.clock;
    const k = this.knocks.get(id);
    let dx = 0;
    let dy = 0;
    if (k) {
      const p = (t - k.at) / 260;
      if (p >= 1 || p < 0) this.knocks.delete(id);
      else {
        const s = Math.sin(Math.PI * (1 - p) * 0.5) * (1 - p);
        dx = k.dx * s;
        dy = k.dy * s;
      }
    }
    const until = this.flashes.get(id) ?? 0;
    return { dx, dy, flash: until > t ? (until - t) / 140 : 0 };
  }

  /**
   * What an event shows, as on the map: the characters play their own animations (the field does it), the numbers rise, a unit that is hit
   * flashes and is pushed back a little. Only the Visual Effects of the Studio a skill or an item names are played on top: nothing of the
   * turn-based battle (no slash, burst, shake or zoom).
   */
  private plan(event: BattleEvent, before: BattleState | null, state: BattleState): Cue[] {
    const board = state.board;
    const unit = (id?: string) => (id ? state.units.find((u) => u.id === id) ?? before?.units.find((u) => u.id === id) : undefined);
    const origin = event.unitId ? before?.units.find((u) => u.id === event.unitId) : undefined;
    const pos = (c: Cell) => world(board, c);
    const chest = (c: Cell) => ({ x: pos(c).x, y: pos(c).y - CHEST });
    const cues: Cue[] = [];
    const at = (time: number, run: () => void) => cues.push({ at: time, run });

    /** Plays a Visual Effect at `start` (seconds) and its sounds at their start on the event clock. */
    const effectAt = (start: number, effect: PlayableVisualEffect, aims: { from: { x: number; y: number }; to: { x: number; y: number } }[]) => {
      at(start, () => aims.forEach(({ from: a, to: b }) => this.fx.playEffect(effect, a, b, { scale: 0.6 })));
      for (const cue of effectCues(effect))
        if (cue.type === "sound") at(start + cue.at / 1000, () => this.stage.sound?.(cue.sound, cue.volume));
    };

    if (event.kind === "item") {
      // The item heals: its Visual Effect from the user to the unit it heals, and the numbers on each unit that got something back.
      const item = event.itemId ? state.items?.[event.itemId] ?? before?.items?.[event.itemId] : undefined;
      const timing = itemTiming(item);
      const user = unit(event.unitId);
      const aimed = unit(event.targetId) ?? user;
      if (item?.effect && user && aimed) effectAt(timing.release, item.effect, [{ from: chest(origin ?? user), to: chest(aimed) }]);
      for (const heal of event.heals ?? []) {
        const healed = unit(heal.unitId);
        if (!healed) continue;
        const c = chest(healed);
        at(timing.impact, () => {
          if (heal.hp) this.stage.popup(`+${heal.hp}`, c.x, c.y - 40, { color: 0x8dffb4, big: true });
          if (heal.sp) this.stage.popup(`+${heal.sp}`, c.x, c.y - (heal.hp ? 62 : 40), { color: 0x8fd0ff });
        });
      }
      return cues;
    }
    if (event.kind === "guard" && origin) {
      at(0, () => this.stage.popup("⛨", chest(origin).x, chest(origin).y - 40, { color: 0x9fd0ff }));
      return cues;
    }

    const attacker = unit(event.unitId);
    const target = unit(event.targetId);
    if (!attacker || !target || (event.kind !== "attack" && event.kind !== "skill")) return cues;
    const from = chest(origin ?? attacker);
    const to = chest(target);
    const skill = event.kind === "skill" ? skillFor(state, attacker, event.skillId) : undefined;
    const timing = actionTiming(skill);
    const victims = (event.hits ?? []).map((hit) => unit(hit.unitId)).filter((u): u is Unit => !!u);

    // The Visual Effect of the skill goes from the caster to the aimed unit; split, the cast plays on the caster and the impact on each unit hit.
    if (skill?.effect) effectAt(EFFECT_START, skill.effect, [{ from, to }]);
    if (skill?.castEffect) effectAt(0, skill.castEffect, [{ from, to }]);
    if (skill?.impactEffect) effectAt(timing.release, skill.impactEffect, victims.map((victim) => ({ from: chest(victim), to: chest(victim) })));

    // Impact: the number, and the unit hit flashes and is pushed back a little.
    const hits = event.hits ?? [];
    at(timing.impact, () => {
      for (const hit of hits) {
        const victim = unit(hit.unitId);
        if (!victim) continue;
        const c = chest(victim);
        this.stage.popup(`${hit.damage}`, c.x, c.y - 40, { big: !!skill, color: skill ? 0xffe39a : 0xfff0c5 });
        this.flashes.set(victim.id, this.clock + 140);
        if (this.reduced()) continue;
        const d = Math.hypot(c.x - from.x, c.y - from.y) || 1;
        this.knocks.set(victim.id, { dx: ((c.x - from.x) / d) * 8, dy: ((c.y - from.y) / d) * 4, at: this.clock });
      }
    });
    at(timing.impact + 0.12, () => {
      for (const hit of hits.filter((h) => h.killed)) {
        const victim = unit(hit.unitId);
        if (victim) this.stage.popup("K.O.", chest(victim).x, chest(victim).y - 72, { color: 0xff8a7a, big: true });
      }
    });
    return cues;
  }
}

/** Unit accent colour (CSS) for tints. */
export const unitColor = (u: Unit) => (u.team === "ally" ? "#8ddbd2" : "#f3867c");
