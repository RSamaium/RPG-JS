import type { ElementName, FxName } from "./data";
import { battleCommand, summonOf, type CommandContext, type CustomCommand } from "./commands";
import type { Combatant, CommandRule, SkillKind, SkillPhase, SkillVisualEffects, TargetScope } from "./types";
import { visualEffectsOf } from "@rpgjs/battle-kit/pure";

/** Who an effect is for: the one that uses the action, or whoever it targets. */
export type EffectTarget = "self" | "target";

/** A creature an action can call: `id` is the key of the `summons` of the catalog, `label` how the sub-menu names it. */
export interface SummonChoice {
  id: string;
  label?: string;
  /** Own turns before it leaves (the creature's own number by default). */
  turns?: number;
  /** Commanded by the player instead of the AI. */
  controlled?: boolean;
  /** The creature is made from this enemy of the database (the server resolves it; a plain game gives `summons` itself). */
  enemy?: string;
  /** The level the enemy is made at. */
  level?: number;
}

/** One thing an action does, in order. The presets of an editor. */
export type ActionEffect =
  | { type: "damage"; power?: number; kind?: Exclude<SkillKind, "heal">; element?: ElementName; hits?: number; stagger?: number; target?: EffectTarget }
  /** `amount`, or `rate` percent of the maximum life of the healed one, or (`of: "damage"`) `rate` percent of the damage the action did. */
  | { type: "heal"; target?: EffectTarget; amount?: number; rate?: number; of?: "damage" }
  | { type: "sp"; target?: EffectTarget; amount: number }
  /** What the target holds, with a `chance` percent (100 by default). `{item}` is the name of the item in `successText`. */
  | { type: "steal"; chance?: number; successText?: string; failText?: string; emptyText?: string }
  | { type: "reveal"; target?: EffectTarget }
  | { type: "text"; text: string; target?: EffectTarget }
  /** Calls one creature (a sub-menu asks which one when there are several). */
  | { type: "summon"; creatures: SummonChoice[] }
  /** `chance` percent: the `then` effects, else the `otherwise` ones. */
  | { type: "chance"; chance: number; then: ActionEffect[]; otherwise?: ActionEffect[] };

/**
 * An action of the database (`_type: "command"`): a custom command described as data, which the plugin turns into a
 * `battleCommand`. Give it to units with `commands: ["<id>"]`.
 */
export interface BattleActionRecord extends SkillVisualEffects {
  name: string;
  description?: string;
  icon?: string;
  /** Who can be targeted. Default: enemy, or self for an action that only summons. */
  scope?: TargetScope;
  melee?: boolean;
  spCost?: number;
  /** Turn-order cost (attack = 1). */
  weight?: number;
  anim?: string;
  fx?: FxName;
  element?: ElementName;
  color?: string;
  /** Own turns of its user during which it can not be used again. */
  cooldown?: number;
  /** Usable once in the battle. */
  once?: boolean;
  /** Listed among the skills of the menu instead of in the menu itself. */
  inSkills?: boolean;
  /** How the AI of an enemy uses it: `weight` (1 by default) and `hpBelow` (a share of its life, in percent). */
  ai?: CommandRule;
  /** The phases whose triggers the action has (your game runs them). */
  triggers?: SkillPhase[];
  /** See `SkillDef`: the effect while it casts, and the sounds of the cast and of each hit. */
  castFx?: FxName;
  castSound?: string;
  impactSound?: string;
  impactAnimation?: string;
  effects: ActionEffect[];
  [field: string]: unknown;
}

export const battleAction = <T extends BattleActionRecord>(record: T) => ({ _type: "command" as const, ...record });

const DEFAULT_TEXTS = { empty: "Nothing to steal", fail: "Missed!", success: "{item} stolen!" };

interface Run {
  /** The damage the action did so far, for the effects that give it back. */
  damage: number;
  /** The last effect was a hit: what follows goes in a new wave. */
  hit: boolean;
}

const aliveTargets = (ctx: CommandContext, who: EffectTarget | undefined, fallback: EffectTarget): Combatant[] => {
  if ((who ?? fallback) === "self") return [ctx.actor];
  const targets = ctx.targets.length > 0 ? ctx.targets : ctx.target ? [ctx.target] : [];
  return targets;
};

function runEffects(effects: readonly ActionEffect[], ctx: CommandContext, run: Run, scope: TargetScope): void {
  const { act, rng } = ctx;
  const defaultTarget: EffectTarget = "target";
  for (const effect of effects) {
    switch (effect.type) {
      case "damage": {
        const hits = Math.max(1, Math.floor(effect.hits ?? 1));
        for (const target of aliveTargets(ctx, effect.target, defaultTarget)) {
          for (let i = 0; i < hits; i++) {
            const hit = act.damage(target, { power: effect.power, kind: effect.kind, element: effect.element, stagger: effect.stagger });
            run.damage += hit.amount;
            if (i < hits - 1) act.nextWave();
          }
        }
        run.hit = true;
        break;
      }
      case "heal": {
        if (run.hit) act.nextWave();
        run.hit = false;
        for (const target of aliveTargets(ctx, effect.target, scope === "self" ? "self" : defaultTarget)) {
          const amount =
            effect.amount !== undefined
              ? effect.amount
              : effect.of === "damage"
                ? Math.round((run.damage * (effect.rate ?? 0)) / 100)
                : Math.round((target.stats.maxHp * (effect.rate ?? 0)) / 100);
          act.heal(target, amount);
        }
        break;
      }
      case "sp":
        for (const target of aliveTargets(ctx, effect.target, defaultTarget)) act.sp(target, effect.amount);
        break;
      case "steal": {
        const target = ctx.target;
        if (!target) break;
        const loot = act.lootOf(target);
        if (!loot) act.text(target, effect.emptyText ?? DEFAULT_TEXTS.empty);
        else if (!rng.chance((effect.chance ?? 100) / 100)) act.text(target, effect.failText ?? DEFAULT_TEXTS.fail);
        else {
          act.give(loot);
          act.text(target, (effect.successText ?? DEFAULT_TEXTS.success).replace("{item}", loot.name));
        }
        break;
      }
      case "reveal":
        for (const target of aliveTargets(ctx, effect.target, defaultTarget)) act.reveal(target);
        break;
      case "text":
        for (const target of aliveTargets(ctx, effect.target, defaultTarget)) act.text(target, effect.text);
        break;
      case "summon": {
        const choice = effect.creatures.find((creature) => creature.id === ctx.option) ?? (effect.creatures.length === 1 ? effect.creatures[0] : undefined);
        if (choice) act.summon(choice.id, { ...(choice.turns !== undefined ? { turns: choice.turns } : {}), ...(choice.controlled !== undefined ? { controlled: choice.controlled } : {}) });
        break;
      }
      case "chance":
        runEffects(rng.chance(effect.chance / 100) ? effect.then : (effect.otherwise ?? []), ctx, run, scope);
        break;
    }
  }
}

/** The command a record of the database stands for. */
export function actionCommand(record: BattleActionRecord): CustomCommand {
  const creatures = record.effects.flatMap((effect) => (effect.type === "summon" ? effect.creatures : []));
  const onlySummons = record.effects.length > 0 && record.effects.every((effect) => effect.type === "summon");
  const scope: TargetScope = record.scope ?? (onlySummons ? "self" : "enemy");
  return battleCommand({
    label: record.name,
    ...(record.icon ? { icon: record.icon } : {}),
    ...(record.description ? { description: record.description } : {}),
    scope,
    ...(record.melee !== undefined ? { melee: record.melee } : {}),
    ...(record.spCost !== undefined ? { spCost: record.spCost } : {}),
    ...(record.weight !== undefined ? { weight: record.weight } : {}),
    ...(record.anim ? { anim: record.anim } : {}),
    ...(record.fx ? { fx: record.fx } : {}),
    ...(record.element ? { element: record.element } : {}),
    ...(record.color ? { color: record.color } : {}),
    ...(record.cooldown ? { cooldown: record.cooldown } : {}),
    ...(record.once ? { once: true } : {}),
    ...(record.inSkills ? { inSkills: true } : {}),
    ...(record.ai ? { ai: record.ai } : {}),
    ...(record.triggers?.length ? { triggers: record.triggers } : {}),
    ...(record.castFx ? { castFx: record.castFx } : {}),
    ...(record.castSound ? { castSound: record.castSound } : {}),
    ...(record.impactSound ? { impactSound: record.impactSound } : {}),
    ...(record.impactAnimation ? { impactAnimation: record.impactAnimation } : {}),
    ...visualEffectsOf(record),
    ...(creatures.length > 1 ? { options: creatures.map((creature) => ({ id: creature.id, label: creature.label ?? creature.id })) } : {}),
    ...(creatures.length > 0
      ? {
          // One creature at a time per summoner
          available: ({ state, actor }: { state: Parameters<typeof summonOf>[0]; actor: Combatant }) => !summonOf(state, actor),
          summons: Object.fromEntries(creatures.map((creature) => [creature.id, { enemy: creature.enemy, level: creature.level, turns: creature.turns, controlled: creature.controlled }])),
        }
      : {}),
    resolve: (ctx) => runEffects(record.effects, ctx, { damage: 0, hit: false }, scope),
  });
}
