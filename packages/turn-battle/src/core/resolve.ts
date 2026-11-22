import type {
  Beat,
  BattleResult,
  BattleState,
  BattleView,
  Catalog,
  Combatant,
  CombatantDef,
  Command,
  CommandEnvelope,
  ForbiddenCommand,
  CommandType,
  Hit,
  Side,
  SkillDef,
  SkillPhase,
  Snap,
  StagePosition,
  TargetScope,
} from "./types";
import { createRng, type Rng } from "./rng";
import { defaultFormulas, type Formulas } from "./formulas";
import { DEFAULT_WEIGHTS, nextActor, previewTimeline, turnDelay, alive } from "./timeline";
import { defaultAi, type AiContext, type AiFn } from "./ai";
import type { CommandActions, CustomCommand, Loot } from "./commands";
import { visualEffectsOf } from "@rpgjs/battle-kit/pure";

/**
 * Synchronous rule hooks, called while a turn is resolved. On the server they
 * are fed by `defineModule({ battle: { onDamage… } })` from any game module.
 */
export interface RulesHooks {
  /** A combatant's turn begins (before it acts or recovers). */
  onTurnStart?(ctx: { state: BattleState; actor: Combatant }): void;
  /** Override an enemy decision: return a command, or nothing to keep the AI's. */
  onChooseAction?(ctx: AiContext): Command | void;
  /** Adjust a damage amount (after elements, guard and stagger): return a number to replace it. */
  onDamage?(ctx: {
    state: BattleState;
    attacker: Combatant;
    target: Combatant;
    skill?: SkillDef;
    amount: number;
    crit: boolean;
    weak: boolean;
    resist: boolean;
  }): number | void;
  /** An action was resolved (its beat is final). */
  onAction?(ctx: { state: BattleState; actor: Combatant; command: Command; beat: Beat }): void;
}

type HookLists = { [K in keyof RulesHooks]-?: NonNullable<RulesHooks[K]>[] };

export interface RulesContext {
  formulas: Formulas;
  ai: Record<string, AiFn>;
  weights: Record<CommandType, number>;
  hooks: HookLists;
  /** Custom commands by id (`turnBattleCommand`). */
  commands: Record<string, CustomCommand>;
}

export function createRules(overrides: {
  formulas?: Partial<Formulas>;
  ai?: Record<string, AiFn>;
  weights?: Partial<Record<CommandType, number>>;
  hooks?: RulesHooks | RulesHooks[];
  commands?: Record<string, CustomCommand>;
} = {}): RulesContext {
  const list = [overrides.hooks ?? []].flat();
  const pick = <K extends keyof RulesHooks>(k: K) =>
    list.map((h) => h[k]).filter(Boolean) as NonNullable<RulesHooks[K]>[];
  return {
    formulas: { ...defaultFormulas, ...overrides.formulas },
    ai: { default: defaultAi, ...overrides.ai },
    weights: { ...DEFAULT_WEIGHTS, ...overrides.weights },
    commands: { ...overrides.commands },
    hooks: {
      onTurnStart: pick("onTurnStart"),
      onChooseAction: pick("onChooseAction"),
      onDamage: pick("onDamage"),
      onAction: pick("onAction"),
    },
  };
}

/** Same rules with extra hooks (e.g. collected from game modules for one battle). */
export function withHooks(rules: RulesContext, hooks: RulesHooks[]): RulesContext {
  if (!hooks.length) return rules;
  const extra = createRules({ hooks }).hooks;
  return {
    ...rules,
    hooks: {
      onTurnStart: [...rules.hooks.onTurnStart, ...extra.onTurnStart],
      onChooseAction: [...rules.hooks.onChooseAction, ...extra.onChooseAction],
      onDamage: [...rules.hooks.onDamage, ...extra.onDamage],
      onAction: [...rules.hooks.onAction, ...extra.onAction],
    },
  };
}

export interface BattleSetup {
  id: string;
  seed?: number;
  allies: CombatantDef[];
  enemies: CombatantDef[];
  catalog: Catalog;
  /** Shared bag (solo / owner-less allies). */
  inventory?: Record<string, number>;
  /** Per-player bags, by owner id (coop). */
  inventories?: Record<string, Record<string, number>>;
  canEscape?: boolean;
  /** Commands the heroes cannot use in this battle (`escape` is the same as `canEscape: false`). */
  forbid?: ForbiddenCommand[];
  heroesPosition?: StagePosition;
  background?: string;
  bgm?: string;
  victoryBgm?: string;
}

export interface Outcome {
  state: BattleState;
  beats: Beat[];
  error?: string;
}

const LETTERS = "ABCDEFGH";

export function createBattle(setup: BattleSetup): BattleState {
  const rng = createRng(setup.seed ?? Math.floor(Math.random() * 2 ** 31));
  const names = new Map<string, number>();
  for (const e of setup.enemies) names.set(e.name, (names.get(e.name) ?? 0) + 1);
  const seen = new Map<string, number>();

  const build = (def: CombatantDef, slot: number): Combatant => {
    let name = def.name;
    if (def.side === "enemy" && (names.get(def.name) ?? 0) > 1) {
      const n = seen.get(def.name) ?? 0;
      seen.set(def.name, n + 1);
      name = `${def.name} ${LETTERS[n] ?? n + 1}`;
    }
    const c = buildCombatant({ ...def, name }, slot, setup.catalog);
    // Allies get a slight initiative edge; everyone starts a bit shuffled.
    // Player characters (both sides in PvP) share the same initiative edge.
    const spread = def.side === "ally" || def.owner ? 0.15 + rng.next() * 0.55 : 0.35 + rng.next() * 0.65;
    c.nextAt = turnDelay(c) * spread;
    return c;
  };


  return {
    id: setup.id,
    revision: 0,
    rng: rng.seed(),
    time: 0,
    turns: 0,
    actor: null,
    combatants: [
      ...setup.allies.map((d, i) => build({ ...d, side: "ally" }, i)),
      ...setup.enemies.map((d, i) => build({ ...d, side: "enemy" }, i)),
    ],
    catalog: setup.catalog,
    inventory: {
      ...(setup.inventory ? { "": { ...setup.inventory } } : {}),
      ...Object.fromEntries(Object.entries(setup.inventories ?? {}).map(([o, bag]) => [o, { ...bag }])),
    },
    used: {},
    gains: {},
    canEscape: (setup.canEscape ?? true) && !setup.forbid?.includes("escape"),
    ...(setup.forbid?.length ? { forbid: [...setup.forbid] } : {}),
    ...(setup.heroesPosition ? { heroesPosition: { ...setup.heroesPosition } } : {}),
    background: setup.background,
    bgm: setup.bgm,
    ...(setup.victoryBgm ? { victoryBgm: setup.victoryBgm } : {}),
    tally: { damageTaken: 0, staggerFinishes: 0 },
    result: null,
  };
}

const efficient = (def: CombatantDef, test: (rate: number) => boolean) =>
  (def.elementsEfficiency ?? []).filter((e) => test(e.rate)).map((e) => e.element);

/** A combatant from its definition (start of battle, or summoned later). */
function buildCombatant(def: CombatantDef, slot: number, catalog: Catalog): Combatant {
  return {
      id: def.id,
      ...(def.mapId ? { mapId: def.mapId } : {}),
      name: def.name,
      tags: [...(def.tags ?? [])],
      side: def.side,
      battler: def.battler,
      slot,
      stats: { ...def.stats },
      hp: clamp(def.hp ?? def.stats.maxHp, 0, def.stats.maxHp),
      sp: clamp(def.sp ?? def.stats.maxSp, 0, def.stats.maxSp),
      skills: [...(def.skills ?? [])].filter((id) => catalog.skills[id]),
      weaknesses: [...new Set([...(def.weaknesses ?? []), ...efficient(def, (rate) => rate > 1)])],
      resists: [...new Set([...(def.resists ?? []), ...efficient(def, (rate) => rate < 1)])],
      efficiency: Object.fromEntries((def.elementsEfficiency ?? []).map((e) => [e.element, e.rate])),
      nextAt: 0,
      guarding: false,
      stagger:
        // Stagger is for monsters: player characters (PvP) never get a gauge.
        def.side === "enemy" && !def.owner && (def.stagger ?? 100) > 0
          ? { value: def.stagger ?? 100, max: def.stagger ?? 100, broken: false }
          : null,
      limit:
        def.limit && catalog.skills[def.limit.skill]
          ? {
              value: clamp(def.limit.value ?? 0, 0, def.limit.max ?? 100),
              max: def.limit.max ?? 100,
              skill: def.limit.skill,
            }
          : null,
      ai: def.ai,
      rewards: def.rewards,
      owner: def.owner,
      ...(def.invincible ? { invincible: true } : {}),
      ...(def.position ? { position: { ...def.position } } : {}),
      attack: { melee: true, ...def.attack },
      // The skills that are commands (several effects, a recharge…) are in the menu as commands
      commands: [...new Set([...(def.commands ?? []), ...(def.skills ?? [])])].filter((id) => catalog.commands?.[id]),
      ...(def.commandRules ? { commandRules: { ...def.commandRules } } : {}),
  };
}

/** Opening: intro beat, then whatever happens until the first hero turn. */
export function beginBattle(state: BattleState, rules: RulesContext): Outcome {
  const next = structuredClone(state);
  const rng = createRng(next.rng);
  next.weights = rules.weights;
  const beats: Beat[] = [{ t: "intro", snap: snapshot(next) }];
  advance(next, rules, rng, beats);
  next.rng = rng.seed();
  next.revision++;
  return { state: next, beats };
}

/** Validate and run a hero command, then play enemy turns until the next hero turn. */
export function runCommand(
  state: BattleState,
  env: CommandEnvelope,
  rules: RulesContext,
  ownerId?: string,
): Outcome {
  const error = validate(state, env, ownerId, rules);
  if (error) return { state, beats: [], error };
  const next = structuredClone(state);
  const rng = createRng(next.rng);
  const beats: Beat[] = [];
  const actor = next.combatants.find((c) => c.id === env.actor)!;
  next.actor = null;
  perform(next, actor, env.command, rules, rng, beats);
  next.turns++;
  endTurn(next, actor, beats);
  advance(next, rules, rng, beats);
  next.rng = rng.seed();
  next.revision++;
  return { state: next, beats };
}

/**
 * The life and the SP the game gave a unit (what a trigger of a skill set on the player), within the limits of the unit. A
 * unit stays standing with at least 1 life: only a hit makes it fall. Nothing happens when nothing changes.
 */
export function syncVitals(state: BattleState, id: string, vitals: { hp?: number; sp?: number }): Outcome {
  const unit = state.combatants.find((c) => c.id === id);
  if (!unit || unit.hp <= 0) return { state, beats: [] };
  const clampTo = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));
  const hp = vitals.hp === undefined || !Number.isFinite(vitals.hp) ? unit.hp : clampTo(vitals.hp, 1, unit.stats.maxHp);
  const sp = vitals.sp === undefined || !Number.isFinite(vitals.sp) ? unit.sp : clampTo(vitals.sp, 0, unit.stats.maxSp);
  if (hp === unit.hp && sp === unit.sp) return { state, beats: [] };
  const next = structuredClone(state);
  const changed = next.combatants.find((c) => c.id === id)!;
  changed.hp = hp;
  changed.sp = sp;
  next.revision++;
  return { state: next, beats: [{ t: "sync", snap: snapshot(next) }] };
}

/** The troop forbids this command to the heroes (the limit burst is a skill; the escape has its own error). */
export function forbids(state: Pick<BattleState, "forbid">, command: CommandType): boolean {
  const kind = command === "limit" ? "skill" : command === "custom" ? "action" : command;
  return kind !== "escape" && !!state.forbid?.includes(kind);
}

export function validate(
  state: BattleState | BattleView,
  env: CommandEnvelope,
  ownerId?: string,
  rules?: RulesContext,
): string | null {
  if (state.result) return "turnBattle.error.ended";
  if (!env || typeof env !== "object" || !env.command) return "turnBattle.error.invalid";
  if (env.revision !== state.revision) return "turnBattle.error.stale";
  if (env.actor !== state.actor) return "turnBattle.error.notYourTurn";
  const actor = state.combatants.find((c) => c.id === env.actor);
  if (!actor || !controlled(actor) || !alive(actor)) return "turnBattle.error.notYourTurn";
  if (ownerId && actor.owner && actor.owner !== ownerId) return "turnBattle.error.notYourTurn";
  const cmd = env.command;
  // What the troop forbids concerns the heroes: the enemies are not asked.
  if (actor.side === "ally" && forbids(state, cmd.type)) return "turnBattle.error.forbidden";
  switch (cmd.type) {
    case "attack":
      return targetError(state, actor, "enemy", cmd.target);
    case "skill": {
      const skill = state.catalog.skills[cmd.skill];
      if (!skill || !actor.skills.includes(cmd.skill)) return "turnBattle.error.unknownSkill";
      if ((skill.spCost ?? 0) > actor.sp) return "turnBattle.error.noSp";
      return targetError(state, actor, skill.scope, cmd.target);
    }
    case "limit": {
      if (!actor.limit || actor.limit.value < actor.limit.max) return "turnBattle.error.limitNotReady";
      const skill = state.catalog.skills[actor.limit.skill];
      return targetError(state, actor, skill.scope, cmd.target);
    }
    case "item": {
      const item = state.catalog.items[cmd.item];
      if (!item || (bagOf(state, actor)[cmd.item] ?? 0) <= 0) return "turnBattle.error.noItem";
      return targetError(state, actor, item.scope, cmd.target);
    }
    case "guard":
      return null;
    case "escape":
      return state.canEscape ? null : "turnBattle.error.cannotEscape";
    case "custom": {
      const info = state.catalog.commands?.[cmd.command];
      if (!info || !actor.commands.includes(cmd.command)) return "turnBattle.error.unknownCommand";
      const option = info.options?.find((o) => o.id === cmd.option);
      if (info.options && !option) return "turnBattle.error.unknownCommand";
      if ((option?.spCost ?? info.spCost ?? 0) > actor.sp) return "turnBattle.error.noSp";
      if (state.blocked?.includes(cmd.command) || (option && state.blocked?.includes(`${cmd.command}:${option.id}`)))
        return "turnBattle.error.unavailable";
      const def = rules?.commands[cmd.command];
      if (rules && !def) return "turnBattle.error.unknownCommand";
      if (def?.available && !def.available({ state: state as BattleState, actor, option: option?.id }))
        return "turnBattle.error.unavailable";
      return targetError(state, actor, option?.scope ?? info.scope, cmd.target);
    }
    default:
      return "turnBattle.error.invalid";
  }
}

/** Commanded by a player: allies, and player characters on the other side (PvP). */
export function controlled(c: Combatant): boolean {
  return !c.auto && (c.side === "ally" || !!c.owner);
}

/** One side gives up (PvP: every player of that side left). */
export function forfeit(state: BattleState, loser: Side): Outcome {
  if (state.result) return { state, beats: [] };
  const next = structuredClone(state);
  next.actor = null;
  next.result = {
    outcome: loser === "ally" ? "defeat" : "victory",
    exp: 0,
    gold: 0,
    items: [],
    bonuses: [],
    turns: next.turns,
  };
  next.revision++;
  return { state: next, beats: [{ t: "end", result: next.result, snap: snapshot(next) }] };
}

/** The same result seen from the other side (PvP). */
export function mirrorResult(result: BattleResult): BattleResult {
  const outcome = result.outcome === "victory" ? "defeat" : result.outcome === "defeat" ? "victory" : result.outcome;
  return outcome === "victory" ? { ...result, outcome } : { ...result, outcome, exp: 0, gold: 0, items: [], bonuses: [] };
}

/**
 * The battle seen from the other side (PvP): each player sees their own
 * team on the right as `ally`. Ids are unchanged, so commands still apply.
 */
export function mirrorView(view: BattleView): BattleView {
  return {
    ...view,
    combatants: view.combatants.map((c) => ({ ...c, side: c.side === "ally" ? "enemy" : "ally" })),
    result: view.result && mirrorResult(view.result),
  };
}

export function mirrorBeats(beats: Beat[]): Beat[] {
  return beats.map((b) => (b.t === "end" ? { ...b, result: mirrorResult(b.result) } : b));
}

/** Owner key of the bag an ally uses (its player's, or the shared one). */
function bagOwner(state: BattleState | BattleView, actor: Combatant): string {
  return actor.owner && state.inventory[actor.owner] ? actor.owner : "";
}

/** Items an ally may use (its player's inventory in coop). */
export function bagOf(state: BattleState | BattleView, actor: Combatant): Record<string, number> {
  return state.inventory[bagOwner(state, actor)] ?? {};
}

/**
 * Let the AI (or a given command) play the current hero turn: AFK timer,
 * player disconnected in coop.
 */
export function runAuto(state: BattleState, rules: RulesContext, command?: Command): Outcome {
  if (state.result || !state.actor) return { state, beats: [] };
  const next = structuredClone(state);
  const rng = createRng(next.rng);
  const beats: Beat[] = [];
  const actor = next.combatants.find((c) => c.id === next.actor)!;
  next.actor = null;
  let cmd = command ?? rules.ai[actor.ai ?? "default"]?.({ state: next, self: actor, rng }) ?? { type: "guard" as const };
  if (!validEnemy(next, actor, cmd, rules)) cmd = { type: "guard" };
  perform(next, actor, cmd, rules, rng, beats);
  next.turns++;
  endTurn(next, actor, beats);
  advance(next, rules, rng, beats);
  next.rng = rng.seed();
  next.revision++;
  return { state: next, beats };
}

/** Hand a player's units to the AI (disconnected) or back. */
export function setAuto(state: BattleState, owner: string, auto: boolean): BattleState {
  const next = structuredClone(state);
  for (const c of next.combatants) if (c.owner === owner) c.auto = auto || undefined;
  return next;
}

/** Candidates a command may target (client menus use the same helper). */
export function candidates(
  state: Pick<BattleView, "combatants">,
  actor: Combatant,
  scope: TargetScope,
): Combatant[] {
  const foes = state.combatants.filter((c) => c.side !== actor.side && alive(c));
  const friends = state.combatants.filter((c) => c.side === actor.side);
  switch (scope) {
    case "enemy":
    case "allEnemies":
      return foes;
    case "ally":
    case "allAllies":
      return friends.filter(alive);
    case "self":
      return [actor];
    case "deadAlly":
      return friends.filter((c) => !alive(c));
  }
}

export const isMultiTarget = (scope: TargetScope) =>
  scope === "allEnemies" || scope === "allAllies";

function targetError(
  state: Pick<BattleView, "combatants">,
  actor: Combatant,
  scope: TargetScope,
  target?: string,
): string | null {
  const list = candidates(state, actor, scope);
  if (!list.length) return "turnBattle.error.noTarget";
  if (isMultiTarget(scope) || scope === "self") return null;
  if (!target || !list.some((c) => c.id === target)) return "turnBattle.error.noTarget";
  return null;
}

function resolveTargets(
  state: BattleState,
  actor: Combatant,
  scope: TargetScope,
  target?: string,
): Combatant[] {
  const list = candidates(state, actor, scope);
  if (isMultiTarget(scope)) return list;
  if (scope === "self") return [actor];
  // A dead or missing target is retargeted, like classic JRPGs.
  return [list.find((c) => c.id === target) ?? list[0]].filter(Boolean);
}

function perform(
  state: BattleState,
  actor: Combatant,
  cmd: Command,
  rules: RulesContext,
  rng: Rng,
  beats: Beat[],
) {
  const weight = (skill?: SkillDef) => skill?.weight ?? rules.weights[cmd.type];
  switch (cmd.type) {
    case "attack":
    case "skill":
    case "limit": {
      let skill: SkillDef | undefined;
      if (cmd.type === "skill") {
        skill = state.catalog.skills[cmd.skill];
        actor.sp -= skill.spCost ?? 0;
      }
      if (cmd.type === "limit") {
        skill = state.catalog.skills[actor.limit!.skill];
        actor.limit!.value = 0;
      }
      const scope = skill?.scope ?? "enemy";
      const targets = resolveTargets(state, actor, scope, "target" in cmd ? cmd.target : undefined);
      const waves: Hit[][] = [];
      const standing = targets.filter(alive);
      const hits = skill?.hits ?? actor.attack.hits ?? 1;
      for (let i = 0; i < hits; i++) {
        const wave = targets
          .filter((t) => alive(t))
          .map((t) => strike(state, actor, t, skill, rules, rng));
        if (!wave.length) break;
        waves.push(wave);
      }
      if (skill) triggerCalls(state, actor, skill.id, skill.triggers, targets, standing);
      beats.push({
        t: "action",
        actor: actor.id,
        kind: cmd.type,
        ref: skill?.id,
        label: skill?.name ?? actor.attack.weapon ?? "",
        anim: skill?.anim ?? (skill ? "skill" : "attack"),
        melee: skill ? !!skill.melee : actor.attack.melee !== false,
        fx: skill?.fx ?? actor.attack.fx,
        element: skill?.element ?? actor.attack.element,
        color: skill ? undefined : actor.attack.color,
        ...(skill?.castFx ? { castFx: skill.castFx } : {}),
        ...(skill?.castSound ? { castSound: skill.castSound } : {}),
        ...(skill?.impactSound ? { impactSound: skill.impactSound } : {}),
        ...(skill?.impactAnimation ? { impactAnimation: skill.impactAnimation } : {}),
        ...visualEffectsOf(skill),
        targets: targets.map((t) => t.id),
        waves,
        cutin:
          cmd.type === "limit" ? { line: skill?.line ?? skill?.name ?? "", video: skill?.video } : undefined,
        snap: snapshot(state),
      });
      notifyAction(state, actor, cmd, rules, beats);
      actor.nextAt += turnDelay(actor) * weight(skill);
      return;
    }
    case "item": {
      const item = state.catalog.items[cmd.item];
      const owner = bagOwner(state, actor);
      state.inventory[owner][item.id]--;
      const used = (state.used[owner] ??= {});
      used[item.id] = (used[item.id] ?? 0) + 1;
      const targets = resolveTargets(state, actor, item.scope, cmd.target);
      const wave: Hit[] = [];
      for (const t of targets) {
        if (item.revive && !alive(t)) {
          t.hp = Math.max(1, Math.round(t.stats.maxHp * (item.hpRate ?? 0.25)));
          wave.push({ target: t.id, amount: t.hp, kind: "heal", revive: true });
          continue;
        }
        const heal = Math.round((item.hp ?? 0) + (item.hpRate ?? 0) * t.stats.maxHp);
        if (heal > 0) {
          const amount = Math.min(heal, t.stats.maxHp - t.hp);
          t.hp += amount;
          wave.push({ target: t.id, amount, kind: "heal" });
        }
        if (item.sp) {
          const amount = Math.min(item.sp, t.stats.maxSp - t.sp);
          t.sp += amount;
          wave.push({ target: t.id, amount, kind: "sp" });
        }
      }
      beats.push({
        t: "action",
        actor: actor.id,
        kind: "item",
        ref: item.id,
        label: item.name,
        anim: "item",
        melee: false,
        fx: item.fx ?? "heal",
        ...visualEffectsOf(item),
        targets: targets.map((t) => t.id),
        waves: [wave],
        snap: snapshot(state),
      });
      notifyAction(state, actor, cmd, rules, beats);
      actor.nextAt += turnDelay(actor) * weight();
      return;
    }
    case "custom": {
      const def = rules.commands[cmd.command];
      const info = state.catalog.commands![cmd.command];
      const option = info.options?.find((o) => o.id === cmd.option);
      const scope = option?.scope ?? info.scope;
      actor.sp -= option?.spCost ?? info.spCost ?? 0;
      const targets = resolveTargets(state, actor, scope, cmd.target);
      const waves: Hit[][] = [[]];
      const standing = targets.filter(alive);
      def.resolve({
        state,
        actor,
        target: isMultiTarget(scope) ? undefined : targets[0],
        targets,
        option: option?.id,
        rng,
        act: commandActions(state, actor, info.id, waves, rules, rng),
      });
      triggerCalls(state, actor, info.id, info.triggers, targets, standing);
      beats.push({
        t: "action",
        actor: actor.id,
        kind: "custom",
        ref: info.id,
        label: option ? `${info.label} : ${option.label}` : info.label,
        anim: info.anim ?? "skill",
        melee: !!info.melee,
        fx: info.fx,
        element: info.element,
        color: info.color,
        ...(info.castFx ? { castFx: info.castFx } : {}),
        ...(info.castSound ? { castSound: info.castSound } : {}),
        ...(info.impactSound ? { impactSound: info.impactSound } : {}),
        ...(info.impactAnimation ? { impactAnimation: info.impactAnimation } : {}),
        ...visualEffectsOf(def),
        targets: targets.map((t) => t.id),
        waves: waves.filter((w) => w.length),
        snap: snapshot(state),
      });
      // Its recharge starts: it counts the turns of its user, this one included
      if (info.once || info.cooldown) (actor.cooldowns ??= {})[info.id] = info.once ? ONCE_COOLDOWN : (info.cooldown ?? 0) + 1;
      notifyAction(state, actor, cmd, rules, beats);
      actor.nextAt += turnDelay(actor) * (info.weight ?? weight());
      return;
    }
    case "guard":
      actor.guarding = true;
      if (actor.limit) actor.limit.value = Math.min(actor.limit.max, actor.limit.value + 8);
      beats.push({ t: "guard", actor: actor.id, snap: snapshot(state) });
      notifyAction(state, actor, cmd, rules, beats);
      actor.nextAt += turnDelay(actor) * weight();
      return;
    case "escape": {
      const allies = state.combatants.filter((c) => c.side === "ally" && alive(c));
      const enemies = state.combatants.filter((c) => c.side === "enemy" && alive(c));
      const success = rng.chance(rules.formulas.escapeChance(allies, enemies));
      if (success) {
        state.result = {
          outcome: "escape",
          exp: 0,
          gold: 0,
          items: [],
          bonuses: [],
          turns: state.turns + 1,
        };
      }
      beats.push({ t: "escape", success, snap: snapshot(state) });
      notifyAction(state, actor, cmd, rules, beats);
      actor.nextAt += turnDelay(actor) * weight();
      return;
    }
  }
}

/** The `act` object of a custom command: every call adds a hit to the current wave. */
function commandActions(
  state: BattleState,
  actor: Combatant,
  id: string,
  waves: Hit[][],
  rules: RulesContext,
  rng: Rng,
): CommandActions {
  const push = (hit: Hit) => {
    waves[waves.length - 1].push(hit);
    return hit;
  };
  const ownerKey = (c: Combatant) => (c.owner && state.inventory[c.owner] ? c.owner : c.owner ?? "");
  const act: CommandActions = {
    damage(target, o = {}) {
      const skill: SkillDef = {
        id,
        name: id,
        kind: o.kind ?? "physical",
        scope: "enemy",
        power: o.power ?? 100,
        element: o.element,
        stagger: o.stagger,
      };
      return push(strike(state, actor, target, skill, rules, rng));
    },
    heal(target, amount) {
      const value = Math.max(0, Math.min(Math.round(amount), target.stats.maxHp - target.hp));
      target.hp += value;
      return push({ target: target.id, amount: value, kind: "heal" });
    },
    sp(target, amount) {
      const before = target.sp;
      target.sp = clamp(target.sp + Math.round(amount), 0, target.stats.maxSp);
      return push({ target: target.id, amount: target.sp - before, kind: "sp" });
    },
    text(target, text, params) {
      return push({ target: target.id, amount: 0, kind: "text", text, ...(params ? { textParams: params } : {}) });
    },
    reveal(target) {
      target.revealed = true;
      return push({ target: target.id, amount: 0, kind: "reveal" });
    },
    lootOf(target) {
      if (target.stolen || !alive(target)) return undefined;
      // Players never steal from players (PvP).
      if (actor.owner && target.owner) return undefined;
      if (!target.owner) {
        const drops = (target.rewards?.items ?? []).filter((d) => state.catalog.items[d.id]);
        if (!drops.length) return undefined;
        const d = drops[rng.int(0, drops.length - 1)];
        return { id: d.id, name: state.catalog.items[d.id].name, quantity: d.quantity ?? 1, from: target.id };
      }
      // A monster steals from the hero's bag.
      const bag = state.inventory[ownerKey(target)] ?? {};
      const ids = Object.keys(bag).filter((k) => bag[k] > 0);
      if (!ids.length) return undefined;
      const item = ids[rng.int(0, ids.length - 1)];
      return { id: item, name: state.catalog.items[item]?.name ?? item, quantity: 1, from: target.id };
    },
    give(item, quantity) {
      const loot = typeof item === "string" ? undefined : (item as Loot);
      const itemId = typeof item === "string" ? item : item.id;
      const qty = quantity ?? loot?.quantity ?? 1;
      if (loot) {
        const from = state.combatants.find((c) => c.id === loot.from);
        if (from && !from.owner) from.stolen = true;
        if (from?.owner) {
          const key = ownerKey(from);
          const bag = state.inventory[key] ?? {};
          const taken = Math.min(qty, bag[itemId] ?? 0);
          if (taken > 0) {
            bag[itemId] -= taken;
            const used = (state.used[key] ??= {});
            used[itemId] = (used[itemId] ?? 0) + taken;
          }
        }
      }
      // Only players keep what they get.
      if (!actor.owner) return;
      const gains = (state.gains[actor.owner] ??= {});
      gains[itemId] = (gains[itemId] ?? 0) + qty;
    },
    nextWave() {
      if (waves[waves.length - 1].length) waves.push([]);
    },
    summon(summonId, o = {}) {
      const def = state.catalog.summons?.[summonId];
      if (!def || state.combatants.some((c) => c.summon?.by === actor.id && alive(c))) return undefined;
      // A fallen summon of the same summoner makes room.
      state.combatants = state.combatants.filter((c) => !(c.summon?.by === actor.id && !alive(c)));
      const slot = Math.max(-1, ...state.combatants.filter((c) => c.side === actor.side).map((c) => c.slot)) + 1;
      const unit = buildCombatant(
        {
          ...def,
          id: `${summonId}@${actor.id}#${state.turns}`,
          side: actor.side,
          owner: actor.owner,
        },
        slot,
        state.catalog,
      );
      unit.summon = { by: actor.id, turns: Math.max(1, o.turns ?? def.turns ?? 3) };
      // AI-driven unless the summoner's player commands it.
      if (!(o.controlled ?? def.controlled)) unit.auto = true;
      unit.nextAt = state.time + turnDelay(unit) * 0.35;
      state.combatants.push(unit);
      push({ target: unit.id, amount: 0, kind: "summon", unit: structuredClone(unit) });
      return unit;
    },
  };
  return act;
}

function strike(
  state: BattleState,
  attacker: Combatant,
  target: Combatant,
  skill: SkillDef | undefined,
  rules: RulesContext,
  rng: Rng,
): Hit {
  const f = rules.formulas;
  // A basic attack is a physical "skill" shaped by the weapon (power split over its hits).
  const hits = Math.max(1, attacker.attack.hits ?? 1);
  const attackSkill: SkillDef | undefined = skill
    ? undefined
    : {
        id: "attack",
        name: "",
        kind: "physical",
        scope: "enemy",
        power: ((attacker.attack.power ?? 100) / hits) * (hits > 1 ? 1.2 : 1),
        element: attacker.attack.element,
        stagger: attacker.attack.stagger,
      };
  const ctx = { attacker, target, skill: skill ?? attackSkill, rng };
  if (skill?.kind === "heal") {
    const amount = Math.min(f.heal(ctx), target.stats.maxHp - target.hp);
    target.hp += amount;
    return { target: target.id, amount, kind: "heal" };
  }
  const element = skill?.element ?? (skill ? undefined : attacker.attack.element);
  const weak = !!element && target.weaknesses.includes(element);
  const resist = !!element && target.resists.includes(element);
  // A rate of `elementsEfficiency` is the multiplier itself; the lists use the fixed ones.
  const rate = element ? target.efficiency[element] : undefined;
  const raw = f.damage(ctx);
  let amount = raw.amount;
  if (rate !== undefined) amount *= rate;
  else {
    if (weak) amount *= f.weakMultiplier;
    if (resist) amount *= f.resistMultiplier;
  }
  if (target.stagger?.broken) amount *= f.brokenMultiplier;
  if (target.guarding) amount *= f.guardMultiplier;
  amount = Math.max(1, Math.round(amount));
  for (const hook of rules.hooks.onDamage) {
    const next = hook({ state, attacker, target, skill, amount, crit: raw.crit, weak, resist });
    if (typeof next === "number" && Number.isFinite(next)) amount = Math.max(0, Math.round(next));
  }
  const wasBroken = !!target.stagger?.broken;
  // An invincible target keeps one hit point.
  target.hp = Math.max(target.invincible ? 1 : 0, target.hp - amount);

  const hit: Hit = { target: target.id, amount, kind: "damage" };
  if (raw.crit) hit.crit = true;
  if (weak) hit.weak = true;
  if (resist) hit.resist = true;

  if (target.stagger && !target.stagger.broken && target.hp > 0) {
    target.stagger.value -= f.stagger({ ...ctx, weak });
    if (target.stagger.value <= 0) {
      target.stagger.value = 0;
      target.stagger.broken = true;
      // Broken enemies are pushed back on the timeline.
      target.nextAt += turnDelay(target) * 0.6;
      hit.broke = true;
    }
  }
  if (attacker.limit)
    attacker.limit.value = Math.min(attacker.limit.max, attacker.limit.value + f.limitOnHit({ ...ctx, skill }) / hits);
  if (target.limit)
    target.limit.value = Math.min(
      target.limit.max,
      target.limit.value + f.limitOnDamage(target, amount),
    );
  if (target.side === "ally") state.tally.damageTaken += amount;
  if (target.hp === 0) {
    hit.ko = true;
    target.guarding = false;
    if (wasBroken) state.tally.staggerFinishes++;
  }
  return hit;
}

/** Run turns until a hero must decide, or the battle ends. */
function advance(state: BattleState, rules: RulesContext, rng: Rng, beats: Beat[]) {
  for (let guard = 0; guard < 500; guard++) {
    if (state.result || settle(state, rng)) {
      state.actor = null;
      beats.push({ t: "end", result: state.result!, snap: snapshot(state) });
      return;
    }
    const c = nextActor(state.combatants)!;
    state.time = c.nextAt;
    c.guarding = false;
    for (const hook of rules.hooks.onTurnStart) hook({ state, actor: c });
    if (c.stagger?.broken) {
      // Recovering from stagger consumes the turn.
      c.stagger.broken = false;
      c.stagger.value = c.stagger.max;
      c.nextAt += turnDelay(c) * 0.5;
      state.turns++;
      beats.push({ t: "recover", actor: c.id, snap: snapshot(state) });
      continue;
    }
    if (controlled(c)) {
      state.actor = c.id;
      // Custom commands this hero cannot use now (greyed out in the menu).
      const blocked = c.commands.flatMap((id) => [
        ...(usable(state, c, id, rules, false) ? [] : [id]),
        ...(state.catalog.commands?.[id]?.options ?? [])
          .filter((o) => !usable(state, c, id, rules, false, o.id))
          .map((o) => `${id}:${o.id}`),
      ]);
      if (blocked.length) state.blocked = blocked;
      else delete state.blocked;
      beats.push({ t: "turn", actor: c.id, order: previewTimeline(state), snap: snapshot(state) });
      return;
    }
    state.actor = c.id;
    beats.push({ t: "turn", actor: c.id, order: previewTimeline(state), snap: snapshot(state) });
    state.actor = null;
    const ai = rules.ai[c.ai ?? "default"] ?? rules.ai.default;
    let cmd = ai({ state, self: c, rng });
    for (const hook of rules.hooks.onChooseAction) cmd = hook({ state, self: c, rng }) ?? cmd;
    if (!validEnemy(state, c, cmd, rules)) cmd = defaultAi({ state, self: c, rng });
    if (!validEnemy(state, c, cmd, rules)) {
      // Last resort: a plain attack on someone standing.
      const foe = state.combatants.find((x) => x.side !== c.side && alive(x));
      cmd = foe ? { type: "attack", target: foe.id } : { type: "guard" };
    }
    perform(state, c, cmd, rules, rng, beats);
    state.turns++;
    endTurn(state, c, beats);
  }
  throw new Error("turn-battle: advance loop exceeded");
}

/** What stands for \"never again\": a command usable once. */
const ONCE_COOLDOWN = 9999;

/** A turn of a fighter is over: its commands that recharge get one turn closer, and its summon has used one of its turns. */
function endTurn(state: BattleState, c: Combatant, beats: Beat[]) {
  if (c.cooldowns) {
    for (const id of Object.keys(c.cooldowns)) {
      if (c.cooldowns[id]! < ONCE_COOLDOWN) c.cooldowns[id] = Math.max(0, c.cooldowns[id]! - 1);
      if (c.cooldowns[id] === 0) delete c.cooldowns[id];
    }
    if (Object.keys(c.cooldowns).length === 0) delete c.cooldowns;
  }
  summonTick(state, c, beats);
}

/** A summon used one of its turns; it leaves once they are all used. */
function summonTick(state: BattleState, c: Combatant, beats: Beat[]) {
  if (!c.summon || !state.combatants.includes(c)) return;
  c.summon.turns -= 1;
  if (c.summon.turns > 0 && alive(c)) return;
  state.combatants = state.combatants.filter((x) => x !== c);
  beats.push({ t: "leave", actor: c.id, snap: snapshot(state) });
}

function notifyAction(state: BattleState, actor: Combatant, command: Command, rules: RulesContext, beats: Beat[]) {
  const beat = beats[beats.length - 1];
  for (const hook of rules.hooks.onAction) hook({ state, actor, command, beat });
}

/**
 * The triggers a used skill has, queued for the server: `cast` once, then `impact` for each target it reached and `defeat`
 * for each one that was standing and is not any more. Nothing for a skill without triggers.
 */
function triggerCalls(state: BattleState, actor: Combatant, skill: string, phases: readonly SkillPhase[] | undefined, targets: Combatant[], standing: Combatant[]) {
  if (!phases?.length) return;
  const calls = (state.calls ??= []);
  const push = (phase: SkillPhase, target?: Combatant) => {
    if (phases.includes(phase)) calls.push({ skill, phase, actor: actor.id, ...(target ? { target: target.id, ...(target.mapId ? { targetMap: target.mapId } : {}) } : {}) });
  };
  push("cast");
  for (const target of targets) push("impact", target);
  for (const target of standing) if (!alive(target)) push("defeat", target);
}

/** Can this combatant use a custom command now (definition, SP, `available`, targets)? */
function usable(
  state: BattleState,
  c: Combatant,
  id: string,
  rules: RulesContext,
  needTargets = true,
  optionId?: string,
): boolean {
  const def = rules.commands[id];
  const info = state.catalog.commands?.[id];
  if (!def || !info || !c.commands.includes(id)) return false;
  if ((c.cooldowns?.[id] ?? 0) > 0) return false;
  // A command with a sub-menu is usable when one of its options is.
  if (info.options && optionId === undefined)
    return info.options.some((o) => usable(state, c, id, rules, needTargets, o.id));
  const option = info.options?.find((o) => o.id === optionId);
  if ((option?.spCost ?? info.spCost ?? 0) > c.sp) return false;
  if (def.available && !def.available({ state, actor: c, option: option?.id })) return false;
  return !needTargets || candidates(state, c, option?.scope ?? info.scope).length > 0;
}

/** Enemy commands bypass hero-only validation; only check resources. */
function validEnemy(state: BattleState, c: Combatant, cmd: Command, rules?: RulesContext): boolean {
  if (cmd.type === "attack" || cmd.type === "guard") return true;
  if (cmd.type === "custom") {
    if (!rules) return false;
    const info = state.catalog.commands?.[cmd.command];
    if (info?.options && !info.options.some((o) => o.id === cmd.option)) return false;
    return usable(state, c, cmd.command, rules, true, info?.options ? cmd.option : undefined);
  }
  if (cmd.type === "skill") {
    const s = state.catalog.skills[cmd.skill];
    return !!s && (s.spCost ?? 0) <= c.sp && candidates(state, c, s.scope).length > 0;
  }
  return false;
}

function settle(state: BattleState, rng: Rng): boolean {
  // Summons fight but do not decide the outcome.
  const allies = state.combatants.filter((c) => c.side === "ally" && !c.summon);
  const enemies = state.combatants.filter((c) => c.side === "enemy" && !c.summon);
  if (!allies.some(alive)) {
    state.result = { outcome: "defeat", exp: 0, gold: 0, items: [], bonuses: [], turns: state.turns };
    return true;
  }
  if (enemies.some(alive)) return false;
  state.result = victory(state, enemies, rng);
  return true;
}

function victory(state: BattleState, enemies: Combatant[], rng: Rng): BattleResult {
  let exp = 0;
  let gold = 0;
  const drops = new Map<string, number>();
  for (const e of enemies) {
    exp += e.rewards?.exp ?? 0;
    gold += e.rewards?.gold ?? 0;
    for (const drop of e.rewards?.items ?? [])
      if (rng.chance(drop.chance ?? 1))
        drops.set(drop.id, (drops.get(drop.id) ?? 0) + (drop.quantity ?? 1));
  }
  let bonuses: BattleResult["bonuses"] = [];
  if (state.tally.damageTaken === 0)
    bonuses.push({ id: "noDamage", exp: Math.round(exp * 0.25), gold: 0 });
  if (state.tally.staggerFinishes > 0)
    bonuses.push({
      id: "staggerFinish",
      exp: 0,
      gold: Math.round(gold * Math.min(0.5, 0.15 * state.tally.staggerFinishes)),
    });
  if (state.turns <= state.combatants.length)
    bonuses.push({ id: "swift", exp: Math.round(exp * 0.1), gold: 0 });
  // Nothing to gain (PvP): no bonus lines.
  bonuses = bonuses.filter((b) => b.exp > 0 || b.gold > 0);
  return {
    outcome: "victory",
    exp: exp + bonuses.reduce((s, b) => s + b.exp, 0),
    gold: gold + bonuses.reduce((s, b) => s + b.gold, 0),
    items: [...drops].map(([id, quantity]) => ({
      id,
      quantity,
      name: state.catalog.items[id]?.name ?? id,
    })),
    bonuses,
    turns: state.turns,
  };
}

export function snapshot(state: Pick<BattleState, "combatants">): Snap[] {
  return state.combatants.map((c) => ({
    id: c.id,
    hp: c.hp,
    sp: c.sp,
    guarding: c.guarding,
    stagger: c.stagger ? c.stagger.value : null,
    broken: !!c.stagger?.broken,
    limit: c.limit ? c.limit.value : null,
  }));
}

export function toView(state: BattleState): BattleView {
  const { rng: _rng, ...view } = state;
  return view;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
