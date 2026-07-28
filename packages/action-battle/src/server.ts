import {
  RpgEvent,
  RpgPlayer,
  type HotbarGuiOptions,
  type RpgServer,
} from "@rpgjs/server";
import { Control, defineModule } from "@rpgjs/common";
import { BattleAi, HitResult, ApplyHitHooks, DEFAULT_KNOCKBACK } from "./ai.server";
import {
  ActionBattleHotbarSkill,
  ActionBattleOptions,
} from "./types";
import { normalizeActionBattleOptions, setActionBattleOptions } from "./config";
import {
  manhattanDistance,
  parseAoeMask,
  resolveActionBattleSoftTarget,
} from "./targeting";
import { emitActionBattleClientVisual } from "./visual";
import {
  applyActionBattleAttackDirection,
  resolveActionBattleAttackDirection,
} from "./attack-input";
import {
  withActionBattleAnimationUnlocked,
} from "./locomotion";
import { getActionBattleSystems, setActionBattleSystems } from "./core/context";
import { applyActionBattleHit } from "./core/hit";
import { DEFAULT_ZELDA_PLAYER_HITBOXES } from "./core/defaults";
import {
  ActionBattleHitTracker,
  createActionBattleAttackId,
  getNormalizedActionBattleAttackProfile,
  runActionBattleActiveHitbox,
} from "./core/attack-runtime";
import { setActionBattleInvincibility } from "./core/hit-reaction";
import {
  canActionBattleDodge,
  resolveActionBattleCharge,
  resolveActionBattleComboStep,
} from "./core/player-combat";
import {
  canActionBattleUseTarget,
  executeActionBattleUse,
  getActionBattleActionConfig,
  handleActionBattleProjectileDestroy,
  handleActionBattleProjectileImpact,
} from "./core/action-use";
import { normalizeActionBattleAttackProfile } from "./core/attack-profile";
import { getActionBattleControlLockDuration } from "./core/attack-profile";
import {
  acquireActionBattleControl,
  releaseActionBattleControls,
} from "./core/control-state";
import {
  beginActionBattleGuard,
  clearActionBattleDefense,
  consumeActionBattleCounter,
  endActionBattleGuard,
} from "./core/defense";
import {
  resolveActionBattleWeapon,
  resolveActionBattleWeaponAttackProfile,
} from "./core/equipment";
import type { ActionBattleHitbox } from "./core/contracts";
import {
  canActionBattleTarget,
  getActionBattleTargets,
} from "./core/targets";
import type {
  ActionBattleAttackProfile,
  NormalizedActionBattleAttackProfile,
} from "./types";

export const ACTION_BATTLE_SKILL_USE = "action-battle:use-skill";
export const ACTION_BATTLE_HOTBAR_USE = "action-battle:use-hotbar";
export const ACTION_BATTLE_SKILL_PROJECTILE_TYPE = "action-battle-skill";

/**
 * Default player attack hitboxes offsets for each direction
 * 
 * These hitboxes define the attack areas relative to the player's position
 * for each cardinal direction. They are converted to absolute coordinates
 * when creating the moving hitbox.
 */
export const DEFAULT_PLAYER_ATTACK_HITBOXES = {
  ...DEFAULT_ZELDA_PLAYER_HITBOXES,
};

const beginPlayerAttackLock = (
  player: RpgPlayer,
  map: ReturnType<RpgPlayer["getCurrentMap"]> | undefined,
  profile: NormalizedActionBattleAttackProfile
): boolean => {
  const runtimePlayer = player as any;
  const now = Date.now();
  if (
    typeof runtimePlayer.__actionBattleAttackLockedUntil === "number" &&
    runtimePlayer.__actionBattleAttackLockedUntil > now
  ) {
    return false;
  }

  releaseActionBattleControls(player, "attack");
  const actionId = (runtimePlayer.__actionBattleAttackLockId ?? 0) + 1;
  runtimePlayer.__actionBattleAttackLockId = actionId;
  runtimePlayer.__actionBattleAttackLockedUntil =
    now + profile.totalDurationMs;
  runtimePlayer.__actionBattleAttackActiveUntil =
    now + profile.startupMs + profile.activeMs;
  runtimePlayer.__actionBattleAttackProfile = profile;

  const movementDuration = getActionBattleControlLockDuration(
    profile,
    profile.control.movementLock
  );
  const directionDuration = getActionBattleControlLockDuration(
    profile,
    profile.control.directionLock
  );

  if (movementDuration > 0) {
    player.pendingInputs = [];
    player.lastProcessedInputTs = 0;
    (map as any)?.stopMovement?.(player);
    acquireActionBattleControl(player, {
      owner: "attack",
      movement: true,
      durationMs: movementDuration,
    });
  }
  if (directionDuration > 0) {
    acquireActionBattleControl(player, {
      owner: "attack",
      direction: true,
      durationMs: directionDuration,
    });
  }
  acquireActionBattleControl(player, {
    owner: "attack",
    animation: true,
    durationMs: profile.totalDurationMs,
  });
  setTimeout(() => {
    if (runtimePlayer.__actionBattleAttackLockId !== actionId) return;
    runtimePlayer.__actionBattleAttackLockedUntil = 0;
    runtimePlayer.__actionBattleAttackActiveUntil = 0;
    runtimePlayer.__actionBattleAttackProfile = undefined;
    releaseActionBattleControls(player, "attack");
  }, profile.totalDurationMs);

  return true;
};

const cancelPlayerAttackRecovery = (player: RpgPlayer) => {
  const runtimePlayer = player as any;
  runtimePlayer.__actionBattleAttackLockId =
    (runtimePlayer.__actionBattleAttackLockId ?? 0) + 1;
  runtimePlayer.__actionBattleAttackLockedUntil = 0;
  runtimePlayer.__actionBattleAttackActiveUntil = 0;
  runtimePlayer.__actionBattleAttackProfile = undefined;
  releaseActionBattleControls(player, "attack");
};

const isBattleEvent = (event: RpgEvent) => !!(event as any).battleAi;

const rectsOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const entityRect = (entity: RpgPlayer | RpgEvent | any) => {
  const hitbox =
    typeof entity.hitbox === "function" ? entity.hitbox() : entity.hitbox;
  return {
    x: entity.x(),
    y: entity.y(),
    width: hitbox?.w ?? 32,
    height: hitbox?.h ?? 32,
  };
};

const getVisibleActionEvents = (
  player: RpgPlayer,
  map: ReturnType<RpgPlayer["getCurrentMap"]> | undefined,
  hitboxes: Array<{ x: number; y: number; width: number; height: number }>
) => {
  if (!map) return [];

  const eventsById = new Map<string, RpgEvent>();
  const addEvent = (event: RpgEvent | undefined) => {
    if (!event) return;
    const isVisible =
      typeof (map as any).isEventVisibleForPlayer === "function"
        ? (map as any).isEventVisibleForPlayer(event, player)
        : true;
    if (!isVisible) return;
    eventsById.set(event.id, event);
  };

  const collisions = (map as any).getCollisions?.(player.id);
  if (Array.isArray(collisions)) {
    collisions.forEach((id: string) => addEvent(map.getEvent(id)));
  }

  const direction =
    typeof player.getDirection === "function" ? player.getDirection() : undefined;
  const interactionCollisions = (map as any).getInteractionCollisions?.(
    player.id,
    direction
  );
  if (Array.isArray(interactionCollisions)) {
    interactionCollisions.forEach((id: string) => addEvent(map.getEvent(id)));
  }

  for (const event of map.getEvents()) {
    const rect = entityRect(event);
    if (hitboxes.some((hitbox) => rectsOverlap(hitbox, rect))) {
      addEvent(event);
    }
  }

  return Array.from(eventsById.values());
};

const isActionReservedForNormalEvent = (
  player: RpgPlayer,
  map: ReturnType<RpgPlayer["getCurrentMap"]> | undefined,
  hitboxes: Array<{ x: number; y: number; width: number; height: number }>
) => {
  const events = getVisibleActionEvents(player, map, hitboxes);
  return events.length > 0 && !events.some(isBattleEvent);
};

/**
 * Get knockback force from player's equipped weapon
 * 
 * Retrieves the knockbackForce property from the player's equipped weapon.
 * Falls back to DEFAULT_KNOCKBACK.force if no weapon or property is set.
 * 
 * @param player - The player to get weapon knockback from
 * @returns Knockback force value
 * 
 * @example
 * ```ts
 * // Player with weapon having knockbackForce: 80
 * const force = getPlayerWeaponKnockbackForce(player); // 80
 * 
 * // No weapon equipped
 * const force = getPlayerWeaponKnockbackForce(player); // 50 (default)
 * ```
 */
export function getPlayerWeaponKnockbackForce(player: RpgPlayer): number {
  try {
    const equipments = player.equipments?.() || [];
    for (const item of equipments) {
      const itemData = (player as any).databaseById?.(item.id());
      if (itemData?._type === 'weapon' && itemData.knockbackForce !== undefined) {
        return itemData.knockbackForce;
      }
    }
  } catch {
    // If error, return default
  }
  return DEFAULT_KNOCKBACK.force;
}

/**
 * Apply hit from player to target (event with AI)
 * 
 * Handles damage calculation, knockback based on weapon, and visual effects.
 * Can be customized using hooks.
 * 
 * @param player - The attacking player
 * @param target - The event being hit
 * @param hooks - Optional hooks for customizing hit behavior
 * @returns Hit result if AI exists, undefined otherwise
 * 
 * @example
 * ```ts
 * // Basic hit
 * const result = applyPlayerHitToEvent(player, event);
 * 
 * // With custom hooks
 * const result = applyPlayerHitToEvent(player, event, {
 *   onBeforeHit(result) {
 *     result.knockbackForce *= 2; // Double knockback
 *     return result;
 *   },
 *   onAfterHit(result) {
 *     if (result.defeated) {
 *       player.gold += 10;
 *     }
 *   }
 * });
 * ```
 */
export function applyPlayerHitToEvent(
  player: RpgPlayer, 
  target: RpgEvent, 
  hooks?: ApplyHitHooks,
  metadata?: Record<string, any>
): HitResult | undefined {
  if (!(target as any).battleAi) return undefined;
  return applyActionBattleEntityHit(player, target, hooks, metadata);
}

export function applyActionBattleEntityHit(
  attacker: RpgPlayer | RpgEvent,
  target: RpgPlayer | RpgEvent,
  hooks?: ApplyHitHooks,
  metadata?: Record<string, any>
): HitResult | undefined {
  const ai = (target as any).battleAi as BattleAi;
  if (target instanceof RpgEvent && !ai) return undefined;

  const systems = getActionBattleSystems();
  const result = applyActionBattleHit(
    {
      ...systems.combat,
      hooks: hooks
        ? {
            ...systems.combat.hooks,
            beforeHit(context) {
              const before = systems.combat.hooks?.beforeHit?.(context);
              if (before === false) return false;
              const nextContext = before || context;
              const legacyResult = toLegacyHitResult(nextContext);
              const modified = hooks.onBeforeHit?.(legacyResult);
              if (!modified) return nextContext;
              return {
                ...nextContext,
                damage: {
                  damage: modified.damage,
                  defeated: modified.defeated,
                  raw: nextContext.damage?.raw,
                },
                knockback: {
                  force: modified.knockbackForce,
                  duration: modified.knockbackDuration,
                  direction: nextContext.knockback?.direction,
                },
              };
            },
            afterHit(result) {
              systems.combat.hooks?.afterHit?.(result);
              hooks.onAfterHit?.(result as HitResult);
            },
          }
        : systems.combat.hooks,
    },
    {
      attacker,
      target,
      metadata,
      reaction: metadata?.reaction,
    }
  );

  if (result.defense) {
    emitActionBattleClientVisual({
      moment: result.defense.kind === "parry" ? "parry" : "block",
      entity: target,
      target,
      attacker,
      damage: result.damage,
      result,
    });
    if (result.defense.kind === "parry") {
      (attacker as any).battleAi?.stagger?.(result.defense.staggerMs, target);
    }
  }

  if (!result.cancelled && ai) {
    ai.handleDamage(attacker, {
      damage: result.damage,
      defeated: result.defeated,
      raw: result.rawDamage,
      reaction: result.reaction,
    });
  }

  return result as HitResult;
}

const toLegacyHitResult = (context: any): HitResult => ({
  damage: context.damage?.damage ?? 0,
  knockbackForce: context.knockback?.force ?? getPlayerWeaponKnockbackForce(context.attacker),
  knockbackDuration: context.knockback?.duration ?? DEFAULT_KNOCKBACK.duration,
  defeated: context.damage?.defeated ?? false,
  attacker: context.attacker,
  target: context.target,
});

const resolvePlayerAttackHitboxes = (
  player: RpgPlayer,
  directionKey: string,
  options: ActionBattleOptions,
  profile: NormalizedActionBattleAttackProfile
): ActionBattleHitbox[] => {
  const configuredHitboxes = {
    ...DEFAULT_PLAYER_ATTACK_HITBOXES,
    ...options.attack?.hitboxes,
    ...profile.hitboxes,
  };
  const hitboxConfig =
    configuredHitboxes[
      directionKey as keyof typeof DEFAULT_PLAYER_ATTACK_HITBOXES
    ] || configuredHitboxes.default;
  const defaultHitboxes = [
    {
      x: player.x() + hitboxConfig.offsetX,
      y: player.y() + hitboxConfig.offsetY,
      width: hitboxConfig.width,
      height: hitboxConfig.height,
    },
  ];
  return (
    options.attack?.resolveHitboxes?.({
      player,
      direction: directionKey,
      defaultHitboxes,
    }) ?? defaultHitboxes
  );
};

const getActionBattleHitboxCandidates = (
  map: ReturnType<RpgPlayer["getCurrentMap"]> | undefined,
  hitboxes: ActionBattleHitbox[],
  options: { excludeIds?: string[]; kinds?: Array<"players" | "events"> } = {}
) => {
  if (!map) return [];
  if (typeof (map as any).queryHitbox === "function") {
    const candidates = new Map<string, RpgPlayer | RpgEvent>();
    for (const hitbox of hitboxes) {
      for (const entity of (map as any).queryHitbox(hitbox, options)) {
        if (entity?.id) candidates.set(entity.id, entity);
      }
    }
    return Array.from(candidates.values());
  }

  const candidates = new Map<string, RpgPlayer | RpgEvent>();
  const excluded = new Set(options.excludeIds ?? []);
  const add = (entity: RpgPlayer | RpgEvent | undefined) => {
    if (!entity?.id) return;
    if (excluded.has(entity.id)) return;
    const rect = entityRect(entity);
    if (hitboxes.some((hitbox) => rectsOverlap(hitbox, rect))) {
      candidates.set(entity.id, entity);
    }
  };

  const kinds = new Set(options.kinds ?? ["players", "events"]);
  if (kinds.has("players")) map.getPlayers?.().forEach(add);
  if (kinds.has("events")) map.getEvents?.().forEach(add);
  return Array.from(candidates.values());
};

const performPlayerAttack = (
  player: RpgPlayer,
  input: any,
  options: ActionBattleOptions,
  attackProfile: NormalizedActionBattleAttackProfile,
  metadata: Record<string, any> = {}
): boolean => {
  const map = player.getCurrentMap();
  const inputDirection = resolveActionBattleAttackDirection(player, input);
  const softTargeting = options.combat?.player?.softTargeting;
  const softTargetOptions =
    softTargeting && typeof softTargeting === "object"
      ? softTargeting
      : undefined;
  const softTarget =
    softTargetOptions?.enabled !== false && map
      ? resolveActionBattleSoftTarget(
          player,
          map
            .getEvents()
            .filter(
              (event: RpgEvent) =>
                isBattleEvent(event) &&
                canActionBattleTarget(
                  player,
                  event,
                  getActionBattleTargets(player, "events"),
                  options.combat?.targets
                )
            ),
          inputDirection,
          softTargetOptions
        )
      : null;
  const direction = softTarget?.direction ?? inputDirection;
  applyActionBattleAttackDirection(player, direction);
  const directionKey = direction as string;
  const resolveActiveHitboxes = () =>
    resolvePlayerAttackHitboxes(player, directionKey, options, attackProfile);
  const initialHitboxes = resolveActiveHitboxes();

  if (isActionReservedForNormalEvent(player, map, initialHitboxes)) {
    return false;
  }

  const actionLocked = attackProfile.totalDurationMs > 0;

  if (actionLocked && !beginPlayerAttackLock(player, map, attackProfile)) {
    return false;
  }

  const counter = consumeActionBattleCounter(player);

  withActionBattleAnimationUnlocked(player, () => {
    emitActionBattleClientVisual({
      moment: counter
        ? "counter"
        : metadata.charged
          ? "chargeRelease"
          : "attack",
      entity: player,
      pattern: metadata.comboStep !== undefined
        ? `combo-${metadata.comboStep + 1}`
        : metadata.charged
          ? "charged"
          : undefined,
      result: { metadata },
      target: softTarget?.target,
      // Resolve Studio/player animation functions on the authoritative entity
      // before the client visual payload is structured-cloned.
      animations: options.animations,
    });
  });

  const attackId = createActionBattleAttackId(player.id, attackProfile.id);
  const weapon = resolveActionBattleWeapon(player);
  const hitTracker = new ActionBattleHitTracker(attackProfile.hitPolicy);
  const targetSelector = getActionBattleTargets(player, "events");
  const hitMetadata = {
    ...metadata,
    counter: Boolean(counter),
    attackId,
    attackProfileId: attackProfile.id,
    reaction: attackProfile.reaction,
    damageMultiplier:
      attackProfile.damageMultiplier * (counter?.damageMultiplier ?? 1),
    knockbackMultiplier:
      attackProfile.knockbackMultiplier * (counter?.staggerMultiplier ?? 1),
  };

  const processHits = (hits: any[]) => {
    hits.forEach((hit: any) => {
      if (
        !canActionBattleTarget(
          player,
          hit,
          targetSelector,
          options.combat?.targets
        )
      ) {
        return;
      }
      if (!hitTracker.tryHit(hit)) return;
      const handledByWeapon =
        weapon &&
        executeActionBattleUse({
          attacker: player,
          target: hit,
          usable: weapon,
          weapon,
          profile: attackProfile,
          playVisual: false,
        });
      if (handledByWeapon) return;
      applyActionBattleEntityHit(player, hit, undefined, hitMetadata);
    });
  };

  runActionBattleActiveHitbox(
    attackProfile,
    resolveActiveHitboxes,
    (activeHitboxes) => {
      const candidates = getActionBattleHitboxCandidates(map, activeHitboxes, {
        excludeIds: [player.id],
        kinds: ["players", "events"],
      });
      processHits(candidates);
    }
  );
  return true;
};

const mergeAttackProfileOverrides = (
  base: NormalizedActionBattleAttackProfile,
  override: ActionBattleAttackProfile
): ActionBattleAttackProfile => ({
  ...base,
  ...override,
  reaction: {
    ...base.reaction,
    ...override.reaction,
  },
  control: {
    ...base.control,
    ...override.control,
  },
  hitboxes: {
    ...base.hitboxes,
    ...override.hitboxes,
  },
});

const resolvePlayerAttackProfile = (
  player: RpgPlayer,
  options: ActionBattleOptions
): NormalizedActionBattleAttackProfile => {
  const baseProfile = getNormalizedActionBattleAttackProfile(options);
  const weaponProfile = resolveActionBattleWeaponAttackProfile(player);
  if (!weaponProfile) return baseProfile;
  return normalizeActionBattleAttackProfile(
    mergeAttackProfileOverrides(baseProfile, weaponProfile),
    {
      lockMovement: options.attack?.lockMovement,
      lockDurationMs: options.attack?.lockDurationMs,
      hitboxes: options.attack?.hitboxes,
    }
  );
};

const ACTION_BATTLE_CHARGE_START = "action-battle:charge-start";
const ACTION_BATTLE_CHARGE_RELEASE = "action-battle:charge-release";
export const ACTION_BATTLE_DODGE = "action-battle:dodge";
export const ACTION_BATTLE_GUARD_START = Control.Defense;
export const ACTION_BATTLE_GUARD_END = "action-battle:guard-end";

interface PlayerCombatRuntimeState {
  comboIndex: number;
  lastAttackAt: number;
  queuedCombo: boolean;
  chargeStartedAt: number | null;
  chargeToken: number;
}

const playerCombatStates = new WeakMap<RpgPlayer, PlayerCombatRuntimeState>();
const playerSkillCooldowns = new WeakMap<RpgPlayer, Map<string, number>>();

const getPlayerCombatState = (player: RpgPlayer): PlayerCombatRuntimeState => {
  let state = playerCombatStates.get(player);
  if (!state) {
    state = {
      comboIndex: 0,
      lastAttackAt: 0,
      queuedCombo: false,
      chargeStartedAt: null,
      chargeToken: 0,
    };
    playerCombatStates.set(player, state);
  }
  return state;
};

const objectOption = <T extends object>(value: boolean | T | undefined): T | undefined =>
  value && typeof value === "object" ? value : undefined;

const resolvePlayerComboProfile = (
  player: RpgPlayer,
  options: ActionBattleOptions,
  now = Date.now()
) => {
  const base = resolvePlayerAttackProfile(player, options);
  const combo = objectOption(options.combat?.player?.combo);
  if (!combo?.enabled || !combo.steps?.length) {
    return { profile: base, step: 0 };
  }
  const state = getPlayerCombatState(player);
  const step = resolveActionBattleComboStep({
    comboIndex: state.comboIndex,
    lastAttackAt: state.lastAttackAt,
    now,
    stepCount: combo.steps.length,
    resetMs: combo.resetMs ?? 700,
  });
  return {
    profile: normalizeActionBattleAttackProfile(
      mergeAttackProfileOverrides(base, combo.steps[step]),
      {
        lockMovement: options.attack?.lockMovement,
        lockDurationMs: options.attack?.lockDurationMs,
        hitboxes: options.attack?.hitboxes,
      }
    ),
    step,
  };
};

const resolveSignal = (value: any) =>
  typeof value === "function" ? value() : value;

const getPlayerSkillCooldowns = (player: RpgPlayer) => {
  let cooldowns = playerSkillCooldowns.get(player);
  if (!cooldowns) {
    cooldowns = new Map<string, number>();
    playerSkillCooldowns.set(player, cooldowns);
  }
  return cooldowns;
};

const resolveSkillId = (skill: any): string | undefined => {
  const value = resolveSignal(skill?.id);
  return typeof value === "string" && value ? value : undefined;
};

const isPlayerSkillLearned = (player: RpgPlayer, skillId: string) =>
  (player.skills?.() ?? []).some(
    (skill: any) => resolveSkillId(skill) === skillId
  );

const resolveItemData = (player: RpgPlayer, itemId: string) => {
  try {
    return (player as any).databaseById?.(itemId);
  } catch {
    return null;
  }
};

const resolveSkillData = (player: RpgPlayer, skillId: string) => {
  try {
    return (player as any).databaseById?.(skillId);
  } catch {
    return null;
  }
};

const resolvePlayerSkillUsable = (player: RpgPlayer, skillId: string) => {
  try {
    return (
      (player as any).getSkill?.(skillId) ?? resolveSkillData(player, skillId)
    );
  } catch {
    return resolveSkillData(player, skillId);
  }
};

const resolveSkillTargeting = (
  player: RpgPlayer,
  skillId: string,
  options: ActionBattleOptions
) => {
  const skillsOptions = options.skills;
  const skillData = resolveSkillData(player, skillId);
  if (skillsOptions?.getTargeting) {
    return skillsOptions.getTargeting(skillData);
  }
  const range =
    resolveSignal(skillData?.targeting?.range) ??
    resolveSignal(skillData?.range) ??
    (skillData?.targeting?.distance as number | undefined);
  const aoeMask =
    skillData?.aoeMask ??
    skillData?.targeting?.aoeMask ??
    (skillData?.targeting?.mask as string[] | string | undefined);
  if (range === undefined && aoeMask === undefined) {
    return null;
  }
  return {
    range: range ?? 0,
    aoeMask,
  };
};

const serializeSkillAction = (skillData: any) => {
  const action = getActionBattleActionConfig(skillData);
  if (!action || typeof action !== "object") return undefined;
  return {
    ...(typeof action.mode === "string" ? { mode: action.mode } : {}),
    ...(typeof action.target === "string" ? { target: action.target } : {}),
    ...(typeof action.cooldownMs === "number"
      ? { cooldownMs: Math.max(0, action.cooldownMs) }
      : {}),
    ...(action.visual && typeof action.visual === "object"
      ? { visual: action.visual }
      : {}),
  };
};

const serializeActionBattleSkill = (
  player: RpgPlayer,
  skill: any,
  options: ActionBattleOptions
): ActionBattleHotbarSkill | null => {
  const id = resolveSkillId(skill);
  if (!id) return null;
  const data = resolveSkillData(player, id) || skill;
  const name = resolveSignal(data?.name) ?? resolveSignal(skill.name) ?? id;
  const description =
    resolveSignal(data?.description) ??
    resolveSignal(skill.description) ??
    "";
  const icon = resolveSignal(data?.icon) ?? resolveSignal(skill.icon);
  const spCost =
    resolveSignal(data?.spCost) ?? resolveSignal(skill.spCost) ?? 0;
  const targeting = resolveSkillTargeting(player, id, options);
  const action = serializeSkillAction(data);
  const cooldownMs = Math.max(0, action?.cooldownMs ?? 0);
  const readyAt = getPlayerSkillCooldowns(player).get(id) ?? 0;
  const entry: ActionBattleHotbarSkill = {
    id,
    name,
    description,
    icon,
    spCost,
    usable: spCost <= player.sp && readyAt <= Date.now(),
    range: targeting?.range ?? 0,
    key: resolveSignal(data?.key),
    casterAnimation: resolveSignal(data?.casterAnimation),
    animation: resolveSignal(data?.animation),
    sound: resolveSignal(data?.sound),
    impactSound: resolveSignal(data?.impactSound),
    action,
    cooldownMs,
    readyAt,
  };
  if (targeting) {
    const mask = targeting.aoeMask ?? options.skills?.defaultAoeMask;
    if (mask) entry.aoeMask = normalizeMaskRows(mask);
  }
  return entry;
};

const requiresActionBattleTargeting = (
  skill: ActionBattleHotbarSkill,
) => {
  const mask = Array.isArray(skill.aoeMask) ? skill.aoeMask : [];
  return (
    skill.action?.target === "ally"
    || mask.length > 1
    || mask.some((row) => row !== "#")
    || (
      (skill.range ?? 0) > 0
      && skill.action?.mode !== "projectile"
      && skill.action?.target !== "self"
    )
  );
};

const actionBattleHotbarOptions = (
  options: ActionBattleOptions,
): HotbarGuiOptions => {
  const hotbar = (
    options.ui?.hotbar && typeof options.ui.hotbar === "object"
      ? options.ui.hotbar
      : {}
  );
  return {
    capacity: hotbar.capacity,
    lockedSlotHint: hotbar.lockedSlotHint,
    transformEntry(player, entry, presentation) {
      if (entry.type !== "skill") return presentation;
      const skill = serializeActionBattleSkill(player, entry, options);
      if (!skill) return presentation;
      return {
        ...presentation,
        ...skill,
        type: "skill",
        cost: skill.spCost
          ? { value: skill.spCost, label: "SP" }
          : undefined,
        activation: {
          mode: requiresActionBattleTargeting(skill) ? "target" : "instant",
          handler: "action-battle.skill",
          payload: { skill },
        },
      };
    },
    onUse(player, request) {
      return handleActionBattleHotbarUse(
        player,
        request.slot,
        request.target as { x: number; y: number } | undefined,
        options,
      );
    },
  };
};

const normalizeMaskRows = (mask: string[] | string | undefined) => {
  if (!mask) return [];
  if (Array.isArray(mask)) return mask;
  return mask
    .trim()
    .split("\n")
    .map((row: string) => row.replace(/\r/g, ""));
};

/**
 * Open the generic hotbar with Action Battle skill presentation and targeting.
 */
export const openActionBattleHotbar = (
  player: RpgPlayer,
  rawOptions: ActionBattleOptions = {}
) => {
  const options = normalizeActionBattleOptions(rawOptions);
  return player.showHotbar(actionBattleHotbarOptions(options));
};

/**
 * Refresh cooldowns and usability in an open generic hotbar.
 */
export const updateActionBattleHotbar = (
  player: RpgPlayer,
  rawOptions: ActionBattleOptions = {}
) => {
  normalizeActionBattleOptions(rawOptions);
  player.refreshHotbar?.();
};

const getTileSize = (map: any) => ({
  width: map?.tileWidth ?? 32,
  height: map?.tileHeight ?? 32,
});

const getEntityTile = (
  entity: any,
  tileSize: { width: number; height: number }
) => {
  const hitbox = entity.hitbox?.() || { w: tileSize.width, h: tileSize.height };
  const x = Math.floor((entity.x() + hitbox.w / 2) / tileSize.width);
  const y = Math.floor((entity.y() + hitbox.h / 2) / tileSize.height);
  return { x, y };
};

const handleActionBattleSkillUse = (
  player: RpgPlayer,
  skillId: string,
  target: { x: number; y: number } | undefined,
  options: ActionBattleOptions
) => {
  if (!isPlayerSkillLearned(player, skillId)) return false;
  const skillData = resolvePlayerSkillUsable(player, skillId);
  if (!skillData) return false;
  const actionConfig = getActionBattleActionConfig(skillData);
  const cooldowns = getPlayerSkillCooldowns(player);
  const now = Date.now();
  if ((cooldowns.get(skillId) ?? 0) > now) return false;
  const spCost = Number(resolveSignal(skillData?.spCost) ?? 0);
  if (Number.isFinite(spCost) && spCost > player.sp) return false;

  const finishUse = (
    selectedTarget?: RpgPlayer | RpgEvent | Array<RpgPlayer | RpgEvent> | null
  ) => {
    try {
      const used = executeActionBattleUse({
        attacker: player,
        target: selectedTarget,
        usable: skillData,
        skill: skillData,
      });
      if (!used) return false;
      const cooldownMs = Math.max(0, Number(actionConfig?.cooldownMs ?? 0));
      if (cooldownMs > 0) {
        const readyAt = Date.now() + cooldownMs;
        cooldowns.set(skillId, readyAt);
        setTimeout(() => {
          if (cooldowns.get(skillId) !== readyAt) return;
          cooldowns.delete(skillId);
          updateActionBattleHotbar(player, options);
        }, cooldownMs);
      }
      updateActionBattleHotbar(player, options);
      return true;
    } catch {
      return false;
    }
  };

  if (actionConfig?.target === "self") {
    return finishUse(player);
  }

  const map = player.getCurrentMap();
  if (!map) {
    try {
      player.useSkill(skillId);
      return true;
    } catch {
      return false;
    }
  }
  const targeting = resolveSkillTargeting(player, skillId, options);
  if (!targeting || !target) {
    if (actionConfig) {
      const affects = options.targeting?.affects || "events";
      const candidates: Array<RpgPlayer | RpgEvent> = [];
      if (affects === "events" || affects === "both") {
        candidates.push(
          ...map
            .getEvents()
            .filter((event: RpgEvent) =>
              canActionBattleUseTarget(
                player,
                event,
                actionConfig.target ?? "enemy",
                options.combat?.targets
              )
            )
        );
      }
      if (affects === "players" || affects === "both") {
        candidates.push(
          ...map
            .getPlayers()
            .filter(
              (other: RpgPlayer) =>
                other.id !== player.id &&
                canActionBattleUseTarget(
                  player,
                  other,
                  actionConfig.target ?? "enemy",
                  options.combat?.targets
                )
            )
        );
      }
      const direction =
        typeof player.getDirection === "function"
          ? player.getDirection()
          : "down";
      const softTargeting = objectOption(
        options.combat?.player?.softTargeting
      );
      const tileSize = getTileSize(map);
      const softTarget = resolveActionBattleSoftTarget(
        player,
        candidates,
        direction,
        {
          ...softTargeting,
          ...(targeting
            ? { range: Math.max(1, targeting.range * tileSize.width) }
            : {}),
        }
      );
      if (
        targeting
        && actionConfig.mode === "instant"
        && softTarget?.target
      ) {
        target = getEntityTile(softTarget.target, tileSize);
      } else {
        if (!softTarget && options.targeting?.allowEmptyTarget === false) {
          return false;
        }
        return finishUse(softTarget?.target ?? null);
      }
    }
    if (!target || !targeting) {
      try {
        player.useSkill(skillId);
        return true;
      } catch {
        return false;
      }
    }
  }

  const tileSize = getTileSize(map);
  const origin = getEntityTile(player, tileSize);
  const targetTile = { x: target.x, y: target.y };

  if (manhattanDistance(origin, targetTile) > targeting.range) {
    return false;
  }

  const mask = parseAoeMask(
    targeting.aoeMask || options.skills?.defaultAoeMask
  );
  const affected = new Set<string>();
  mask.cells.forEach((cell) => {
    const x = targetTile.x + cell.dx;
    const y = targetTile.y + cell.dy;
    affected.add(`${x},${y}`);
  });

  const targets: any[] = [];
  const actionTarget = actionConfig?.target ?? "enemy";
  const affects = options.targeting?.affects || "events";
  if (affects === "events" || affects === "both") {
    map.getEvents().forEach((event: RpgEvent) => {
      const tile = getEntityTile(event, tileSize);
      if (
        affected.has(`${tile.x},${tile.y}`) &&
        canActionBattleUseTarget(
          player,
          event,
          actionTarget,
          options.combat?.targets
        )
      ) {
        targets.push(event);
      }
    });
  }
  if (affects === "players" || affects === "both") {
    map.getPlayers().forEach((other: RpgPlayer) => {
      if (other.id === player.id) return;
      const tile = getEntityTile(other, tileSize);
      if (
        affected.has(`${tile.x},${tile.y}`) &&
        canActionBattleUseTarget(
          player,
          other,
          actionTarget,
          options.combat?.targets
        )
      ) {
        targets.push(other);
      }
    });
  }

  if (!options.targeting?.allowEmptyTarget && targets.length === 0) {
    return false;
  }

  return finishUse(targets);
};

const handleActionBattleHotbarUse = (
  player: RpgPlayer,
  slot: number,
  target: { x: number; y: number } | undefined,
  options: ActionBattleOptions,
) => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 10) return false;
  const entry = player.getHotbar?.().slots[slot];
  if (!entry) return false;
  if (entry.type === "skill") {
    return handleActionBattleSkillUse(player, entry.id, target, options);
  }
  try {
    return player.useHotbarSlot(slot, target);
  } catch {
    return false;
  }
};

export const createActionBattleServer = (
  rawOptions: ActionBattleOptions = {}
) => {
  const options = normalizeActionBattleOptions(rawOptions);
  setActionBattleOptions(options);
  setActionBattleSystems(options);
  return defineModule<RpgServer>({
    player: {
      /**
       * Handle player input for combat actions
       *
       * When a player presses the action key, create an attack hitbox
       * that can damage AI enemies within range and knockback the event.
       * Knockback force is based on the player's equipped weapon.
       * Triggers attack animation and visual effects.
       *
       * @param player - The player performing the action
       * @param input - Input data containing pressed keys
       */
      onInput(player: RpgPlayer, input: any) {
        const state = getPlayerCombatState(player);
        const charged = objectOption(options.combat?.player?.chargedAttack);
        const dodge = objectOption(options.combat?.player?.dodge);
        const guard = objectOption(options.combat?.player?.guard);
        const runtimePlayer = player as any;
        const now = Date.now();
        const activeProfile = runtimePlayer
          .__actionBattleAttackProfile as
          | NormalizedActionBattleAttackProfile
          | undefined;
        const activeUntil = Number(
          runtimePlayer.__actionBattleAttackActiveUntil ?? 0
        );
        const lockedUntil = Number(
          runtimePlayer.__actionBattleAttackLockedUntil ?? 0
        );
        const directionalActions = new Set<any>([
          Control.Up,
          Control.Down,
          Control.Left,
          Control.Right,
          "up",
          "down",
          "left",
          "right",
        ]);
        if (input.action === ACTION_BATTLE_SKILL_USE) {
          const skillId =
            typeof input.data?.id === "string" ? input.data.id : "";
          if (!skillId) return;
          const target =
            typeof input.data?.target?.x === "number" &&
            typeof input.data?.target?.y === "number"
              ? {
                  x: input.data.target.x,
                  y: input.data.target.y,
                }
              : undefined;
          handleActionBattleSkillUse(player, skillId, target, options);
          return;
        }
        if (input.action === ACTION_BATTLE_HOTBAR_USE) {
          const slot = Number(input.data?.slot);
          const target =
            typeof input.data?.target?.x === "number" &&
            typeof input.data?.target?.y === "number"
              ? {
                  x: input.data.target.x,
                  y: input.data.target.y,
                }
              : undefined;
          handleActionBattleHotbarUse(player, slot, target, options);
          return;
        }
        if (
          activeProfile?.control.moveCancelsRecovery &&
          lockedUntil > now &&
          activeUntil <= now &&
          directionalActions.has(input.action)
        ) {
          cancelPlayerAttackRecovery(player);
          state.queuedCombo = false;
        }

        if (input.action === ACTION_BATTLE_GUARD_END) {
          endActionBattleGuard(player);
          return;
        }

        if (input.action === ACTION_BATTLE_GUARD_START && guard?.enabled) {
          if (activeUntil > now) return;
          if (lockedUntil > now) {
            cancelPlayerAttackRecovery(player);
            state.queuedCombo = false;
          }
          beginActionBattleGuard(player, guard, now);
          emitActionBattleClientVisual({
            moment: "guard",
            entity: player,
          });
          return;
        }

        if (input.action === ACTION_BATTLE_DODGE && dodge?.enabled) {
          const lockedUntil = Number((player as any).__actionBattleDodgeLockedUntil ?? 0);
          const attackLockedUntil = Number((player as any).__actionBattleAttackLockedUntil ?? 0);
          const activeUntil = Number(
            (player as any).__actionBattleAttackActiveUntil ?? 0
          );
          if (
            !canActionBattleDodge({
              now,
              dodgeLockedUntil: lockedUntil,
              attackActiveUntil: activeUntil,
            })
          ) {
            return;
          }
          if (
            attackLockedUntil > now &&
            (activeProfile?.control.dodgeCancelsRecovery ?? true)
          ) {
            cancelPlayerAttackRecovery(player);
            state.queuedCombo = false;
          }
          (player as any).__actionBattleDodgeLockedUntil =
            now + Math.max(0, dodge.cooldownMs ?? 650);
          setActionBattleInvincibility(
            player,
            Math.max(0, dodge.invincibilityMs ?? 220),
            now
          );
          emitActionBattleClientVisual({
            moment: "dodge",
            entity: player,
          });
          return;
        }

        if (input.action === ACTION_BATTLE_CHARGE_START && charged?.enabled) {
          if (state.chargeStartedAt !== null) return;
          const lockedUntil = Number((player as any).__actionBattleAttackLockedUntil ?? 0);
          if (lockedUntil > Date.now()) return;
          state.chargeStartedAt = Date.now();
          const chargeToken = ++state.chargeToken;
          setTimeout(() => {
            if (state.chargeToken !== chargeToken) return;
            state.chargeStartedAt = null;
          }, (charged.maxChargeMs ?? 900) + 1000);
          emitActionBattleClientVisual({
            moment: "chargeStart",
            entity: player,
          });
          return;
        }

        if (input.action === ACTION_BATTLE_CHARGE_RELEASE && charged?.enabled) {
          if (state.chargeStartedAt === null) return;
          const elapsed = Math.max(0, Date.now() - state.chargeStartedAt);
          state.chargeStartedAt = null;
          state.chargeToken++;
          const charge = resolveActionBattleCharge(elapsed, charged);
          const base = resolvePlayerAttackProfile(player, options);
          const profile = normalizeActionBattleAttackProfile(
            mergeAttackProfileOverrides(base, {
              ...charged.profile,
              damageMultiplier: charge.damageMultiplier,
              knockbackMultiplier: charge.knockbackMultiplier,
            }),
            {
              lockMovement: options.attack?.lockMovement,
              lockDurationMs: options.attack?.lockDurationMs,
              hitboxes: options.attack?.hitboxes,
            }
          );
          performPlayerAttack(player, input, options, profile, {
            charged: true,
            chargeRatio: charge.ratio,
          });
          return;
        }

        if (input.action == Control.Action) {
          const combo = objectOption(options.combat?.player?.combo);
          const lockedUntil = Number((player as any).__actionBattleAttackLockedUntil ?? 0);
          if (lockedUntil > now) {
            const remaining = lockedUntil - now;
            if (
              combo?.enabled &&
              remaining <=
                (combo.bufferMs ??
                  activeProfile?.control.inputBufferMs ??
                  160) &&
              !state.queuedCombo
            ) {
              state.queuedCombo = true;
              setTimeout(() => {
                state.queuedCombo = false;
                const next = resolvePlayerComboProfile(player, options);
                if (
                  performPlayerAttack(player, input, options, next.profile, {
                    comboStep: next.step,
                  })
                ) {
                  state.lastAttackAt = Date.now();
                  state.comboIndex = next.step + 1;
                }
              }, remaining + 1);
            }
            return;
          }

          const next = resolvePlayerComboProfile(player, options, now);
          if (
            performPlayerAttack(player, input, options, next.profile, {
              comboStep: next.step,
            })
          ) {
            state.lastAttackAt = now;
            state.comboIndex = next.step + 1;
          }
        }
      },
      onConnected(player: RpgPlayer) {
        player.initializeHotbar?.();
        const hotbar = options.ui?.hotbar as any;
        if (hotbar?.enabled && hotbar?.autoOpen) {
          openActionBattleHotbar(player, options);
        }
      },
      onJoinMap(player: RpgPlayer) {
        player.initializeHotbar?.();
        const hotbar = options.ui?.hotbar as any;
        if (hotbar?.enabled && hotbar?.autoOpen) {
          openActionBattleHotbar(player, options);
        }
      },
      onDisconnected(player: RpgPlayer) {
        releaseActionBattleControls(player);
        clearActionBattleDefense(player);
        playerCombatStates.delete(player);
        playerSkillCooldowns.delete(player);
      },
    },
    event: {
      /**
       * Handle player detection when entering AI vision
       *
       * Called when a player enters an AI event's vision range.
       * The AI will start pursuing and attacking the player.
       *
       * @param event - The AI event
       * @param player - The player entering vision
       * @param shape - The vision shape
       */
      onDetectInShape(event: RpgEvent, player: RpgPlayer, shape: any) {
        const ai = (event as any).battleAi as BattleAi;
        ai?.onDetectInShape(player, shape);
      },

      /**
       * Handle player leaving AI vision
       *
       * Called when a player leaves an AI event's vision range.
       * The AI will stop pursuing the player.
       *
       * @param event - The AI event
       * @param player - The player leaving vision
       * @param shape - The vision shape
       */
      onDetectOutShape(event: RpgEvent, player: RpgPlayer, shape: any) {
        const ai = (event as any).battleAi as BattleAi;
        ai?.onDetectOutShape(player, shape);
      },
    },
    projectiles: {
      onImpact(context: any) {
        handleActionBattleProjectileImpact({
          attacker:
            context.projectile?.payload?.attackerId
              ? context.map?.getObjectById?.(context.projectile.payload.attackerId)
              : undefined,
          target: context.target,
          projectile: context.projectile,
          hit: context.hit,
          map: context.map,
        } as any);
      },
      onDestroy(context: any) {
        handleActionBattleProjectileDestroy(context.projectile?.id);
      },
    },
  });
};

export default createActionBattleServer();

export {
  ACTION_BATTLE_HITBOX_FRAME_MS,
  ActionBattleHitTracker,
  createActionBattleAttackId,
  getNormalizedActionBattleAttackProfile,
  resolveActionBattleHitboxSpeed,
  runActionBattleActiveHitbox,
  scheduleActionBattleStartup,
} from "./core/attack-runtime";
export {
  DEFAULT_ACTION_BATTLE_ATTACK_PROFILE,
  getActionBattleControlLockDuration,
  normalizeActionBattleAttackProfile,
  type ActionBattleAttackProfileFallbacks,
} from "./core/attack-profile";
export type {
  ActionBattleAttackDirection,
  ActionBattleAttackHitboxConfig,
  ActionBattleAttackHitboxMap,
  ActionBattleAttackHitPolicy,
  ActionBattleAttackProfile,
  ActionBattleAttackControlOptions,
  ActionBattleControlLock,
  NormalizedActionBattleAttackControlOptions,
  ActionBattleGuardOptions,
  ActionBattleSoftTargetingOptions,
  ActionBattleCombatDirectorOptions,
  ActionBattleFeedbackOptions,
  ActionBattleHitReactionProfile,
  NormalizedActionBattleHitReactionProfile,
  NormalizedActionBattleAttackProfile,
} from "./types";
export {
  beginActionBattleGuard,
  clearActionBattleDefense,
  consumeActionBattleCounter,
  endActionBattleGuard,
  isActionBattleGuarding,
  normalizeActionBattleGuardOptions,
  resolveActionBattleDefense,
  type ActionBattleDefenseKind,
  type ActionBattleDefenseResolution,
} from "./core/defense";
export {
  acquireActionBattleAttackSlot,
  releaseActionBattleAttackSlot,
} from "./core/combat-director";
export {
  directionToActionBattleTarget,
  resolveActionBattleSoftTarget,
  type ActionBattleSoftTargetResult,
} from "./targeting";
export type {
  ActionBattleActionConfig,
  ActionBattleActionMode,
  ActionBattleActionTarget,
  ActionBattleProjectileImpactContext,
  ActionBattleProjectileOptions,
  ActionBattleTargetContext,
  ActionBattleTargetOptions,
  ActionBattleTargetSelector,
  ActionBattleUsable,
  ActionBattleUseContext,
} from "./core/contracts";
export {
  canActionBattleUseTarget,
  executeActionBattleUse,
  getActionBattleActionConfig,
  getActionBattleActionRange,
  handleActionBattleProjectileDestroy,
  handleActionBattleProjectileImpact,
  shouldUseActionBattleUsable,
} from "./core/action-use";
export {
  DEFAULT_ACTION_BATTLE_HIT_REACTION,
  isActionBattleEntityInvincible,
  normalizeActionBattleHitReaction,
  setActionBattleInvincibility,
} from "./core/hit-reaction";
export {
  canActionBattleDodge,
  resolveActionBattleCharge,
  resolveActionBattleComboStep,
} from "./core/player-combat";
export {
  DEFAULT_ACTION_BATTLE_ENEMY_ATTACK_PROFILES,
  normalizeActionBattleEnemyAttackProfiles,
  type ActionBattleEnemyAttackProfileKey,
  type ActionBattleEnemyAttackProfileMap,
  type NormalizedActionBattleEnemyAttackProfileMap,
} from "./core/enemy-attack-profiles";
export {
  resolveActionBattleWeapon,
  resolveActionBattleWeaponAttackProfile,
} from "./core/equipment";
export {
  ACTION_BATTLE_ENEMY_FACTION,
  ACTION_BATTLE_PLAYER_FACTION,
  canActionBattleTarget,
  getActionBattleFaction,
  getActionBattleTargets,
  isActionBattleCombatEntity,
  isActionBattleEvent,
  isActionBattlePlayer,
  matchesActionBattleTargetSelector,
} from "./core/targets";
export {
  AiDebug,
  AiState,
  AttackPattern,
  BattleAi,
  DEFAULT_KNOCKBACK,
  EnemyType,
} from "./ai.server";
export type {
  ApplyHitHooks,
  BattleAiDefeatedCallback,
  BattleAiDefeatedContext,
  BattleAiDefeatReward,
  BattleAiLegacyDefeatedCallback,
  BattleAiLegacyOptions,
  BattleAiOptions,
  BattleAiDeathPresentationOptions,
  BattleAiRewardItem,
  BattleAiRewards,
  HitResult,
} from "./ai.server";
