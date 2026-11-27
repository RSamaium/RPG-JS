import { distance, key, reachable, lineClear, inside, validPath, heldByOther } from "./board";
import type { BattleState, Unit, Command, BattleEvent, Team, SkillDef, Cell } from "./types";
import { skillFor, skillArea, skillUnavailable } from "./skills";
import { outcome } from "./objectives";

/**
 * Synchronous rule hooks, called while a command is resolved. On the server
 * they come from `defineModule({ tactical: { onDamage… } })` and the plugin
 * options (see `TacticalServerHooks`, which adds `player` and `battle` to each
 * context). Server only: the state they change is the authoritative one.
 *
 * @example
 * ```ts
 * defineModule<RpgServer>({
 *   tactical: {
 *     onDamage: ({ target, amount }) => (target.guarding ? Math.floor(amount / 2) : amount),
 *     onPhase: ({ state, phase }) => {
 *       for (const unit of state.units) if (unit.team === phase && unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp + 2);
 *     },
 *   },
 * });
 * ```
 */
export interface RulesHooks {
  /** Adjust damage: return a number to replace it. */
  onDamage?(ctx: { state: BattleState; attacker: Unit; target: Unit; skill?: SkillDef; amount: number }): number | void;
  /** Who has won, when a plugin decides it (any way it likes): the side, nothing to leave the battle on. */
  onJudge?(ctx: { state: BattleState }): Team | null | void;
  /** A command was resolved (its event is final). */
  onAction?(ctx: { state: BattleState; command: Command; event: BattleEvent }): void;
  /** A unit has moved (`from` is where it was): traps, zones, terrain effects. The state may be changed. */
  onMove?(ctx: { state: BattleState; unit: Unit; from: Cell; path: Cell[] }): void;
  /** A unit fell, struck by `by` (nobody when something else killed it): loot, a last wish, a revival. The state may be changed. */
  onDefeat?(ctx: { state: BattleState; unit: Unit; by?: Unit }): void;
  /** The phase of a side begins, its units ready (`round` counts from 1): poison, regeneration, reinforcements. The state may be changed. */
  onPhase?(ctx: { state: BattleState; phase: Team; round: number }): void;
}

const skillOf = (state: BattleState, unit: Unit, skill: boolean | string) =>
  skill ? skillFor(state, unit, typeof skill === "string" ? skill : unit.skillIds[0]) : undefined;

export function targetable(state: BattleState, source: Unit, target: Unit, skill: boolean | string = false): boolean {
  const definition = skillOf(state, source, skill);
  if (skill && !definition) return false;
  const range = definition?.range ?? source.range;
  return target.hp > 0 && source.team !== target.team && distance(source, target) <= range && lineClear(state.board, source, target);
}

export function affected(state: BattleState, source: Unit, target: Unit, skill: boolean | string): Unit[] {
  if (!skill) return [target];
  const definition = skillOf(state, source, skill);
  if (!definition) return [];
  const cells = new Set(skillArea(state, source, target, definition).map(key));
  return state.units.filter((u) => u.hp > 0 && u.team !== source.team && cells.has(key(u)));
}

/** Base damage of an attack or skill (before hooks). */
export const damage = (state: BattleState, unit: Unit, skill: boolean | string) =>
  skill ? skillOf(state, unit, skill)?.power ?? 0 : unit.power;

/** The HP a unit loses to `amount` of damage: half on guard (rounded up), and never its last HP when it is invincible. */
export const taken = (victim: Unit, amount: number) =>
  Math.max(0, Math.min(victim.hp - (victim.invincible ? 1 : 0), victim.guarding ? Math.ceil(amount / 2) : amount));

function advance(state: BattleState, hooks: RulesHooks[] = []) {
  const judges = hooks.flatMap((h) => (h.onJudge ? [(s: BattleState) => h.onJudge!({ state: s })] : []));
  let winner = outcome(state, judges);
  if (winner) {
    state.winner = winner;
    return;
  }
  if (state.units.filter((u) => u.team === state.phase && u.hp > 0).every((u) => u.acted)) {
    state.phase = state.phase === "ally" ? "enemy" : "ally";
    if (state.phase === "ally") state.round++;
    // The moves being prepared belonged to the phase that ends
    delete state.holds;
    for (const unit of state.units.filter((u) => u.team === state.phase)) {
      unit.acted = false;
      unit.moved = false;
      unit.guarding = false;
    }
    for (const h of hooks) h.onPhase?.({ state, phase: state.phase, round: state.round });
    // A new round can be the one that decides it (survive N rounds, the limit of rounds)
    winner = outcome(state, judges);
    if (winner) state.winner = winner;
  }
}

/**
 * A player holds the cell their unit is about to move to (`cell`), or lets it go (`null`): the move is walked on their screen before it is
 * sent, and the others must not aim at the same cell meanwhile. Refused like a move (`tactical.error.held` when another unit holds the cell).
 */
export function hold(previous: BattleState, unitId: string, cell: Cell | null, team: Team, actor: string): BattleState {
  if (!previous.started || previous.winner || previous.phase !== team) throw new Error("tactical.error.turn");
  const unit = previous.units.find((u) => u.id === unitId);
  if (!unit || unit.team !== team || unit.hp <= 0 || unit.acted) throw new Error("tactical.error.unit");
  if (unit.owner && unit.owner !== actor) throw new Error("tactical.error.owner");
  const others = (previous.holds ?? []).filter((h) => h.unitId !== unitId);
  if (!cell) return { ...previous, holds: others };
  if (heldByOther(previous, unit, cell)) throw new Error("tactical.error.held");
  if (unit.moved || !inside(previous.board, cell) || !reachable(previous, unit).get(key(cell))?.length) throw new Error("tactical.error.move");
  return { ...previous, holds: [...others, { unitId, x: cell.x, y: cell.y, owner: actor }] };
}

/** Pure authoritative transition. Invalid commands cannot partially mutate the source state. */
/**
 * `actor`: the player giving the order (allies). They may only command their
 * own units, and `endPhase` ends only their units' turn (coop).
 */
export function transition(
  previous: BattleState,
  command: Command,
  team: Team,
  hooks: RulesHooks[] = [],
  actor?: string,
): { state: BattleState; event: BattleEvent } {
  const state = structuredClone(previous);
  const done = (event: BattleEvent) => {
    for (const h of hooks) h.onAction?.({ state, command, event });
    return { state, event };
  };
  if (command.type === "start") {
    if (state.started) throw new Error("tactical.error.started");
    state.started = true;
    state.revision++;
    return done({ kind: "start" });
  }
  if (command.type === "surrender") {
    // PvP: a side gives up at any time. Against the AI (solo, co-op) the heroes flee instead (`escape`, if the troop allows it).
    if (!state.started || state.winner) throw new Error("tactical.error.turn");
    if (!state.versus.length) throw new Error("tactical.error.forbidden");
    state.winner = team === "ally" ? "enemy" : "ally";
    state.revision++;
    return done({ kind: "surrender", team });
  }
  if (!state.started || state.winner || state.phase !== team) throw new Error("tactical.error.turn");
  // What the troop forbids is forbidden to the players, on both sides of a duel; the AI of the enemies plays what it wants.
  const forbidden = (rule: keyof NonNullable<BattleState["rules"]>) => {
    if ((team === "ally" || !!actor) && state.rules?.[rule] === false) throw new Error("tactical.error.forbidden");
  };
  if (command.type === "escape") {
    forbidden("canEscape");
    // A duel is left by surrendering: there is no one to flee from but a player
    if (state.versus.length) throw new Error("tactical.error.forbidden");
    state.winner = team === "ally" ? "enemy" : "ally";
    state.escaped = true;
    state.revision++;
    return done({ kind: "escape", team });
  }
  const commands = (u: Unit) => !actor || !u.owner || u.owner === actor;
  if (command.type === "endPhase") {
    state.units.filter((u) => u.team === team && commands(u)).forEach((u) => (u.acted = true));
    advance(state, hooks);
    state.revision++;
    return done({ kind: "phase" });
  }
  if (!("unitId" in command)) throw new Error("tactical.error.action");
  const unit = state.units.find((u) => u.id === command.unitId);
  if (!unit || unit.team !== team || unit.hp <= 0 || unit.acted) throw new Error("tactical.error.unit");
  if (!commands(unit)) throw new Error("tactical.error.owner");
  // Whatever the unit does now, the cell held for the move it was preparing is free again
  if (state.holds) state.holds = state.holds.filter((hold) => hold.unitId !== unit.id);
  let event: BattleEvent = { kind: "wait", unitId: unit.id };
  if (command.type === "move") {
    if (!inside(state.board, command.cell)) throw new Error("tactical.error.move");
    if (heldByOther(state, unit, command.cell)) throw new Error("tactical.error.held");
    // A chosen route must be valid and end on the cell; otherwise the shortest path.
    const chosen = command.path;
    const path = chosen
      ? validPath(state, unit, chosen) && key(chosen.at(-1)!) === key(command.cell) ? chosen.map((c) => ({ x: c.x, y: c.y })) : undefined
      : command.cell && reachable(state, unit).get(key(command.cell));
    if (unit.moved || !path?.length) throw new Error("tactical.error.move");
    const from = { x: unit.x, y: unit.y };
    unit.x = command.cell.x;
    unit.y = command.cell.y;
    unit.moved = true;
    event = { kind: "move", unitId: unit.id, path };
    for (const h of hooks) h.onMove?.({ state, unit, from, path });
  } else if (command.type === "wait") {
    unit.acted = true;
  } else if (command.type === "guard") {
    forbidden("canGuard");
    unit.acted = true;
    unit.guarding = true;
    event = { kind: "guard", unitId: unit.id };
  } else if (command.type === "item") {
    forbidden("canUseItems");
    const item = state.items?.[command.itemId];
    if (!item || !(unit.items?.[command.itemId] > 0)) throw new Error("tactical.error.item");
    const target = state.units.find((u) => u.id === command.targetId);
    // An item goes to a standing ally, the unit itself or next to it
    if (!target || target.hp <= 0 || target.team !== unit.team || distance(unit, target) > 1) throw new Error("tactical.error.target");
    const heal = { unitId: target.id, hp: Math.min(item.hp, target.maxHp - target.hp), sp: Math.min(item.sp, target.maxSp - target.sp) };
    // An item that restores HP or SP is not spent on a unit that has nothing to get back.
    if ((item.hp > 0 || item.sp > 0) && heal.hp <= 0 && heal.sp <= 0) throw new Error("tactical.error.full");
    target.hp += heal.hp;
    target.sp += heal.sp;
    unit.items[command.itemId] -= 1;
    if (unit.items[command.itemId] <= 0) delete unit.items[command.itemId];
    unit.acted = true;
    event = { kind: "item", unitId: unit.id, targetId: target.id, itemId: item.id, heals: [heal] };
  } else if (command.type === "attack" || command.type === "skill") {
    const special = command.type === "skill";
    forbidden(special ? "canUseSkills" : "canAttack");
    const target = state.units.find((u) => u.id === command.targetId);
    const skill = special ? skillFor(state, unit, command.skillId) : undefined;
    if (special && !skill) throw new Error("tactical.error.action");
    if (skill) {
      const error = skillUnavailable(unit, skill);
      if (error) throw new Error(error);
    }
    if (!target || !targetable(state, unit, target, skill?.id ?? false)) throw new Error("tactical.error.target");
    event = {
      kind: command.type,
      unitId: unit.id,
      targetId: target.id,
      skillId: skill?.id,
      hits: affected(state, unit, target, skill?.id ?? false).map((victim) => {
        let amount = damage(state, unit, skill?.id ?? false);
        for (const h of hooks) {
          const next = h.onDamage?.({ state, attacker: unit, target: victim, skill, amount });
          if (typeof next === "number" && Number.isFinite(next)) amount = Math.max(0, Math.round(next));
        }
        amount = taken(victim, amount);
        victim.hp -= amount;
        if (victim.hp === 0) for (const h of hooks) h.onDefeat?.({ state, unit: victim, by: unit });
        return { unitId: victim.id, damage: amount, killed: victim.hp === 0 };
      }),
    };
    unit.acted = true;
    if (skill) {
      unit.usedSkills.push(skill.id);
      unit.sp -= skill.spCost;
    }
  } else throw new Error("tactical.error.action");
  advance(state, hooks);
  state.revision++;
  return done(event);
}
