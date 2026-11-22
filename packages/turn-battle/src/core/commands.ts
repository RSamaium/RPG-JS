import type { ElementName, FxName } from "./data";
import type { Rng } from "./rng";
import type { BattleState, Combatant, CommandInfo, CommandOptionInfo, CommandRule, Hit, SkillKind, SkillVisualEffects, TargetScope } from "./types";

/**
 * Custom battle commands ("Voler", "Analyse"…): shown in the menu of the units
 * that have them (`commands: ["steal"]`), resolved on the server by `resolve`.
 *
 * ```ts
 * steal: battleCommand({
 *   label: "Voler", icon: "✋", scope: "enemy", melee: true,
 *   resolve({ target, rng, act }) {
 *     const loot = act.lootOf(target!);
 *     if (!loot || !rng.chance(0.6)) return act.text(target!, "Raté !");
 *     act.give(loot);
 *     act.text(target!, `${loot.name} volé !`);
 *   },
 * })
 * ```
 */
/** Its Visual Effects ride on its beats, not in the menu data sent with the state (`commandInfo` leaves them out). */
export interface CustomCommand extends Omit<CommandInfo, "id" | "scope">, SkillVisualEffects {
  /** Who can be targeted. Default: enemy. */
  scope?: TargetScope;
  /** Sub-menu choices (e.g. which creature to summon); `resolve` gets the picked `option`. */
  options?: CommandOptionInfo[];
  /** Where the creatures it calls come from, by option id: an enemy of the database, which the server turns into a summon. */
  summons?: Record<string, { enemy?: string; level?: number; turns?: number; controlled?: boolean }>;
  /** Own turns of its user during which it can not be used again after it was used. */
  cooldown?: number;
  /** Usable once in the battle. */
  once?: boolean;
  /** Listed in the Skills sub-menu instead of the menu itself. */
  inSkills?: boolean;
  /** How the AI of an enemy uses it when the unit has no rule of its own for it. */
  ai?: CommandRule;
  /**
   * Usable right now by this actor? Otherwise the entry is greyed out (and
   * refused). With `options`, called for each option too (`option` set).
   */
  available?(ctx: { state: BattleState; actor: Combatant; option?: string }): boolean;
  /** What happens (synchronous, server side). Use `act` to hit, heal, talk, steal… */
  resolve(ctx: CommandContext): void;
}

export interface CommandContext {
  state: BattleState;
  actor: Combatant;
  /** The chosen target (single-target scopes), alive or retargeted. */
  target?: Combatant;
  /** Every target of the scope. */
  targets: Combatant[];
  /** Picked sub-menu option (commands with `options`). */
  option?: string;
  rng: Rng;
  act: CommandActions;
}

/** A stealable item: from an enemy's drops, or from a hero's bag (monsters stealing). */
export interface Loot {
  id: string;
  name: string;
  quantity: number;
  /** Combatant it is taken from. */
  from: string;
}

export interface CommandActions {
  /** Damage with the normal formulas, elements, stagger, limit and `onDamage` hooks. */
  damage(target: Combatant, o?: { power?: number; kind?: Exclude<SkillKind, "heal">; element?: ElementName; stagger?: number }): Hit;
  heal(target: Combatant, amount: number): Hit;
  /** Give (or take, if negative) SP. */
  sp(target: Combatant, amount: number): Hit;
  /** A line over the target ("Raté !", "Potion volée !"). */
  text(target: Combatant, text: string): Hit;
  /** Show HP, weaknesses and resistances of the target (kept for the whole battle). */
  reveal(target: Combatant): Hit;
  /** What could be stolen from the target (nothing once stolen, nothing between players). */
  lootOf(target: Combatant): Loot | undefined;
  /**
   * Give an item to the actor's player (kept whatever the outcome). With a
   * `Loot`, it is taken from its owner: marked stolen, or removed from a bag.
   */
  give(item: Loot | string, quantity?: number): void;
  /** Following hits go into a new wave (multi-hit commands). */
  nextWave(): void;
  /**
   * Call a creature (`summons` option / database) to the actor's side for a
   * few of its own turns. Returns it, or nothing if the actor already has a
   * summon in battle or the id is unknown.
   */
  summon(id: string, o?: { turns?: number; controlled?: boolean }): Combatant | undefined;
}

/** The summon currently in battle for this summoner, if any. */
export const summonOf = (state: Pick<BattleState, "combatants">, summoner: Combatant) =>
  state.combatants.find((c) => c.summon?.by === summoner.id && c.hp > 0);

export const battleCommand = (command: CustomCommand): CustomCommand => command;

/** Menu data of a command (sent to clients). */
export function commandInfo(id: string, c: CustomCommand): CommandInfo {
  return {
    id,
    label: c.label,
    icon: c.icon,
    description: c.description,
    scope: c.scope ?? "enemy",
    spCost: c.spCost,
    weight: c.weight,
    anim: c.anim,
    melee: c.melee,
    fx: c.fx as FxName | undefined,
    element: c.element,
    color: c.color,
    options: c.options,
    ...(c.cooldown ? { cooldown: c.cooldown } : {}),
    ...(c.once ? { once: true } : {}),
    ...(c.inSkills ? { inSkills: true } : {}),
    ...(c.ai ? { ai: c.ai } : {}),
    ...(c.triggers?.length ? { triggers: c.triggers } : {}),
    ...(c.castFx ? { castFx: c.castFx } : {}),
    ...(c.castSound ? { castSound: c.castSound } : {}),
    ...(c.impactSound ? { impactSound: c.impactSound } : {}),
    ...(c.impactAnimation ? { impactAnimation: c.impactAnimation } : {}),
  };
}
