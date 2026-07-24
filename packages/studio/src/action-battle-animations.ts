export type StudioCombatAnimationIds = {
  attack?: StudioCombatAnimationRef;
  hurt?: StudioCombatAnimationRef;
  die?: StudioCombatAnimationRef;
  castSkill?: StudioCombatAnimationRef;
  castSpell?: StudioCombatAnimationRef;
  guard?: StudioCombatAnimationRef;
  parry?: StudioCombatAnimationRef;
  stagger?: StudioCombatAnimationRef;
};

export type StudioCombatAnimationRef =
  | string
  | {
      id?: string;
      _id?: string;
      mediaId?: string;
      fileName?: string;
    }
  | null
  | undefined;

export type StudioCombatAnimationOptions = {
  animationName?: string;
  attackAnimationName?: string;
  hurtAnimationName?: string;
  dieAnimationName?: string;
  castSkillAnimationName?: string;
  guardAnimationName?: string;
  parryAnimationName?: string;
  staggerAnimationName?: string;
  repeat?: number;
  dieDelayMs?: number;
};

type ActionBattleAnimationOptions = Partial<
  Record<
    | "attack"
    | "hurt"
    | "die"
    | "castSkill"
    | "guard"
    | "parry"
    | "stagger",
    ActionBattleAnimationResult | ActionBattleAnimationResolver
  >
>;

type ActionBattleAnimationEntity = {
  [key: string]: any;
};

type ActionBattleAnimationResult = {
  animationName?: string;
  graphic?: string | string[];
  repeat?: number;
  waitEnd?: boolean;
  delayMs?: number;
} | null | undefined;

type ActionBattleAnimationResolver = (
  entity: ActionBattleAnimationEntity,
) => ActionBattleAnimationResult;

const hasGraphic = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolveGraphic = (value: StudioCombatAnimationRef): string | null => {
  if (!value) return null;
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }
  return value.id || value._id || value.mediaId || value.fileName || null;
};

const resolveStudioAnimationsFromEntity = (
  entity: ActionBattleAnimationEntity,
): StudioCombatAnimationIds => {
  return (
    entity.studioCombatAnimations ??
    entity.combatAnimations ??
    entity.animations ??
    {}
  );
};

/**
 * Make the Studio project combat animations available to runtime animation
 * resolvers. The aliases keep compatibility with action-battle integrations
 * that predate the Studio-specific property.
 */
export const bindStudioCombatAnimationsToEntity = (
  entity: ActionBattleAnimationEntity | null | undefined,
  animations: StudioCombatAnimationIds | null | undefined,
): void => {
  if (!entity) return;
  const resolvedAnimations = animations ?? {};
  entity.studioCombatAnimations = resolvedAnimations;
  entity.combatAnimations = resolvedAnimations;
};

const createAnimationResult = (
  graphic: unknown,
  animationName: string,
  repeat: number,
  delayMs?: number,
): ActionBattleAnimationResult => {
  const resolvedGraphic = resolveGraphic(graphic as StudioCombatAnimationRef);
  if (!hasGraphic(resolvedGraphic)) return null;
  return {
    animationName,
    graphic: resolvedGraphic,
    repeat,
    ...(delayMs !== undefined ? { delayMs } : {}),
  };
};

/**
 * Convert RPGJS Studio combat animation media ids into action-battle animation
 * options. Studio generated combat spritesheets use the character spritesheet
 * preset, and action animations are played with `setGraphicAnimation()`.
 *
 * Without a static `animations` object, the returned resolvers read
 * `entity.studioCombatAnimations`, `entity.combatAnimations`, or
 * `entity.animations` at play time. This lets Studio project data fetched at
 * runtime drive player animations.
 */
export const createStudioActionBattleAnimations = (
  animations?: StudioCombatAnimationIds,
  options: StudioCombatAnimationOptions = {},
): ActionBattleAnimationOptions => {
  const fallbackAnimationName = options.animationName ?? "attack";
  const attackAnimationName = options.attackAnimationName ?? fallbackAnimationName;
  const hurtAnimationName = options.hurtAnimationName ?? fallbackAnimationName;
  const dieAnimationName = options.dieAnimationName ?? fallbackAnimationName;
  const castSkillAnimationName =
    options.castSkillAnimationName ?? fallbackAnimationName;
  const guardAnimationName =
    options.guardAnimationName ?? fallbackAnimationName;
  const parryAnimationName =
    options.parryAnimationName ?? fallbackAnimationName;
  const staggerAnimationName =
    options.staggerAnimationName ?? fallbackAnimationName;
  const repeat = options.repeat ?? 1;
  const dieDelayMs = options.dieDelayMs ?? 500;

  if (!animations) {
    return {
      attack: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(current.attack, attackAnimationName, repeat);
      },
      hurt: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(current.hurt, hurtAnimationName, repeat);
      },
      die: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(current.die, dieAnimationName, repeat, dieDelayMs);
      },
      castSkill: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(
          current.castSkill ?? current.castSpell,
          castSkillAnimationName,
          repeat,
        );
      },
      guard: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(current.guard, guardAnimationName, repeat);
      },
      parry: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(current.parry, parryAnimationName, repeat);
      },
      stagger: (entity) => {
        const current = resolveStudioAnimationsFromEntity(entity);
        return createAnimationResult(
          current.stagger ?? current.hurt,
          staggerAnimationName,
          repeat,
        );
      },
    };
  }

  const result: ActionBattleAnimationOptions = {};

  const attack = resolveGraphic(animations.attack);
  if (hasGraphic(attack)) {
    result.attack = {
      animationName: attackAnimationName,
      graphic: attack,
      repeat,
    };
  }

  const hurt = resolveGraphic(animations.hurt);
  if (hasGraphic(hurt)) {
    result.hurt = {
      animationName: hurtAnimationName,
      graphic: hurt,
      repeat,
    };
  }

  const die = resolveGraphic(animations.die);
  if (hasGraphic(die)) {
    result.die = {
      animationName: dieAnimationName,
      graphic: die,
      repeat,
      delayMs: dieDelayMs,
    };
  }

  const castSkill = resolveGraphic(animations.castSkill ?? animations.castSpell);
  if (hasGraphic(castSkill)) {
    result.castSkill = {
      animationName: castSkillAnimationName,
      graphic: castSkill,
      repeat,
    };
  }

  const guard = resolveGraphic(animations.guard);
  if (hasGraphic(guard)) {
    result.guard = {
      animationName: guardAnimationName,
      graphic: guard,
      repeat,
    };
  }

  const parry = resolveGraphic(animations.parry);
  if (hasGraphic(parry)) {
    result.parry = {
      animationName: parryAnimationName,
      graphic: parry,
      repeat,
    };
  }

  const stagger = resolveGraphic(animations.stagger ?? animations.hurt);
  if (hasGraphic(stagger)) {
    result.stagger = {
      animationName: staggerAnimationName,
      graphic: stagger,
      repeat,
    };
  }

  return result;
};
