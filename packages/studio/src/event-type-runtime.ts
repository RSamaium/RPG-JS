import { show_text } from "@common/blocks/executors/show-text";
import { ATK, Frequency, MAXHP, MAXSP, Move, RpgEvent, RpgMap, RpgPlayer, STR, Speed } from "@rpgjs/server";
import {
  AttackPattern,
  BattleAi,
  EnemyType,
  type BattleAiOptions,
} from "@rpgjs/action-battle/server";
import { normalizeEventType } from "@common/event-types";
import { assignParams } from "./assign-params";
import { createStudioActionBattleAnimations } from "./action-battle-animations";
import { getGraphicKey, getGraphicScale } from "./graphic-key";
export { getGraphicKey, getGraphicScale } from "./graphic-key";

/**
 * Extended RpgMap interface with studio-specific properties
 */
export interface RpgMapExtended extends RpgMap {
  startPosition: {
    x: number;
    y: number;
  };
  scale: number;
  globalConfig: Record<string, unknown>;
  setInWorldMaps(worldMap: import("@rpgjs/common").WorldMapsManager): void;
}

export type InitLifecycleOptions = {
  runInitBlocks?: boolean;
  startParallelLoop?: boolean;
};

export type EventHookContext = {
  event: RpgEvent;
  player: RpgPlayer | null;
  map: RpgMap | null;
  object: any;
  params: any;
  eventType: string;
  triggerType: string;
  touchContext?: any;
  resolveActiveTrigger: (
    player: RpgPlayer | null,
    event: RpgEvent
  ) => { trigger: any; index: number } | null;
  applyActiveTrigger: (player: RpgPlayer | null, event: RpgEvent) => any;
  executeBlocks: (
    player: RpgPlayer | null,
    triggerType: string,
    event: RpgEvent,
    options?: { touchTarget?: "player" | "event"; variableScope?: "player" | "map" }
  ) => Promise<void>;
  runInitLifecycle?: (options?: InitLifecycleOptions) => Promise<void>;
};

export type EventHook = (
  context: EventHookContext,
  next: () => Promise<void>
) => Promise<void> | void;

export type TriggerSettingsContext = {
  event: RpgEvent;
  trigger: any;
  fallbackParams: any;
  eventType: string;
  object: any;
};

export type TriggerSettingsApplier = (context: TriggerSettingsContext) => void;

export type EventTypeRuntime = {
  triggerSettings?: TriggerSettingsApplier[];
  hooks?: {
    onInit?: EventHook;
    onAction?: EventHook;
    onTouch?: EventHook;
    onChange?: EventHook;
  };
};

const applyGraphicSetting: TriggerSettingsApplier = ({
  event,
  trigger,
  fallbackParams,
  object,
}) => {
  const graphic = trigger?.graphic ?? fallbackParams?.graphic;
  const graphicKey = getGraphicKey(graphic);
  if (graphicKey) {
    (event as any)._graphicScale?.set(
      getGraphicScale(trigger, fallbackParams, object) ?? null,
    );
    event.setGraphic(graphicKey);
  }
};

const resolveEnemyId = (trigger: any, fallbackParams: any, object: any) => {
  return (
    trigger?.typeData?.enemyId ||
    fallbackParams?.enemyId ||
    object?.typeData?.enemyId ||
    null
  );
};

const enemyTypes = new Set<string>(Object.values(EnemyType));
const attackPatterns = new Set<string>(Object.values(AttackPattern));

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const DEFAULT_EVENT_HITBOX = {
  width: 32,
  height: 32,
};

const normalizeHitboxDimension = (value: unknown): number | undefined => {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (typeof numberValue !== "number" || !Number.isFinite(numberValue) || numberValue <= 0) {
    return undefined;
  }
  return Math.round(numberValue);
};

const normalizeEventHitbox = (value: unknown): { width: number; height: number } | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const width = normalizeHitboxDimension(record.width ?? record.w);
  const height = normalizeHitboxDimension(record.height ?? record.h);
  return width && height ? { width, height } : undefined;
};

const normalizeEnemyType = (value: unknown): EnemyType | undefined => {
  if (typeof value !== "string") return undefined;
  return enemyTypes.has(value) ? (value as EnemyType) : undefined;
};

const normalizeAttackPatterns = (value: unknown): AttackPattern[] | undefined => {
  if (typeof value === "string") {
    return attackPatterns.has(value) ? [value as AttackPattern] : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const patterns = value.filter(
    (pattern): pattern is AttackPattern =>
      typeof pattern === "string" && attackPatterns.has(pattern),
  );
  return patterns.length > 0 ? patterns : undefined;
};

const normalizePatrolWaypoints = (
  value: unknown,
): Array<{ x: number; y: number }> | undefined => {
  if (!Array.isArray(value)) return undefined;

  const waypoints = value
    .map((waypoint) => {
      const x = toNumber(waypoint?.x);
      const y = toNumber(waypoint?.y);
      return x !== undefined && y !== undefined ? { x, y } : null;
    })
    .filter((waypoint): waypoint is { x: number; y: number } => waypoint !== null);

  return waypoints.length > 0 || value.length === 0 ? waypoints : undefined;
};

const hasAnyKey = (source: any, keys: readonly string[]): boolean => {
  return !!source && typeof source === "object" && keys.some((key) => source[key] !== undefined);
};

const pickNumericOption = (
  source: any,
  key: keyof BattleAiOptions,
  options: BattleAiOptions,
) => {
  const value = toNumber(source?.[key]);
  if (value !== undefined) {
    (options as any)[key] = value;
  }
};

const resolveEnemySkillIds = (enemy: any): string[] => {
  const rawSkills = enemy?.skills ?? enemy?.skillIds ?? enemy?.attacks;
  const ids = new Set<string>();

  for (const id of [
    enemy?.attackSkill,
    enemy?.attackSkillId,
    enemy?.aiBehavior?.attackSkill,
    enemy?.aiBehavior?.attackSkillId,
  ]) {
    if (typeof id === "string" && id.trim()) {
      ids.add(id);
    }
  }

  if (!Array.isArray(rawSkills)) return [...ids];

  for (const entry of rawSkills) {
    const id =
      typeof entry === "string"
        ? entry
        : entry?.skillId ?? entry?.id ?? entry?._id;
    if (typeof id === "string" && id.trim()) {
      ids.add(id);
    }
  }

  return [...ids];
};

const learnEnemySkills = (event: RpgEvent, enemy: any): string | undefined => {
  let firstSkillId: string | undefined;

  for (const skillId of resolveEnemySkillIds(enemy)) {
    try {
      (event as any).learnSkill?.(skillId);
      firstSkillId ??= skillId;
    } catch (error) {
      console.warn(`[StudioGame] enemy skill ${skillId} could not be learned`, error);
    }
  }

  return firstSkillId;
};

const hasStudioParameter = (config: any, parameter: string): boolean => {
  return Object.prototype.hasOwnProperty.call(config?.parameters ?? {}, parameter);
};

const hasConfiguredEnemyWeapon = (enemy: any): boolean => {
  const equipment = enemy?.startingEquipment;
  if (!equipment || typeof equipment !== "object") return false;
  const weaponId = equipment.weaponId ?? equipment.weapon ?? equipment.weapon_id;
  return typeof weaponId === "string" ? weaponId.trim().length > 0 : !!weaponId;
};

const setEnemyNaturalAttackModifier = (
  event: RpgEvent,
  naturalAttack: number,
): void => {
  const currentModifier = (event as any).paramsModifier ?? {};
  const currentAttackModifier = currentModifier[ATK] ?? {};
  (event as any).paramsModifier = {
    ...currentModifier,
    [ATK]: {
      ...currentAttackModifier,
      value: (currentAttackModifier.value ?? 0) + naturalAttack,
    },
  };
};

const battleAiBehaviorOptionKeys = [
  "enemyType",
  "behaviorKey",
  "attackSkill",
  "attackSkillId",
  "attackCooldown",
  "visionRange",
  "attackRange",
  "dodgeChance",
  "dodgeCooldown",
  "fleeThreshold",
  "moveToCooldown",
  "retreatCooldown",
  "attackPatterns",
  "patrolWaypoints",
  "groupBehavior",
] as const;

const behaviorGaugeKeys = [
  "baseScore",
  "updateInterval",
  "minStateDuration",
  "assaultThreshold",
  "retreatThreshold",
] as const;

export const resolveEnemyBattleAiOptions = (
  enemy: any,
  fallbackAttackSkill?: string,
): BattleAiOptions => {
  const studioBehavior =
    enemy?.behavior && typeof enemy.behavior === "object"
      ? enemy.behavior
      : {};
  const legacyAiBehavior = hasAnyKey(studioBehavior, battleAiBehaviorOptionKeys)
    ? studioBehavior
    : {};
  const aiBehavior =
    enemy?.aiBehavior && typeof enemy.aiBehavior === "object"
      ? enemy.aiBehavior
      : {};
  const behaviorKey =
    typeof enemy?.aiBehavior === "string"
      ? enemy.aiBehavior
      : enemy?.behaviorKey ?? aiBehavior.behaviorKey ?? legacyAiBehavior.behaviorKey;
  const options: BattleAiOptions = {
    enemyType:
      normalizeEnemyType(enemy?.enemyType) ??
      normalizeEnemyType(enemy?.aiBehavior) ??
      normalizeEnemyType(aiBehavior.enemyType) ??
      normalizeEnemyType(legacyAiBehavior.enemyType) ??
      EnemyType.Aggressive,
    targets: "players",
    visionRange: 150,
    attackRange: 50,
    animations: createStudioActionBattleAnimations(enemy.animations),
    presentation: {
      ...(enemy.presentation ?? {}),
      music: {
        battle: enemy.combatMusic ?? enemy.presentation?.music?.battle,
        priority:
          toNumber(enemy.combatMusicPriority) ??
          toNumber(enemy.presentation?.music?.priority),
      },
    },
  };

  if (typeof behaviorKey === "string" && behaviorKey.trim()) {
    options.behaviorKey = behaviorKey;
  }

  const configuredAttackSkill =
    enemy?.attackSkill ??
    enemy?.attackSkillId ??
    aiBehavior.attackSkill ??
    aiBehavior.attackSkillId ??
    legacyAiBehavior.attackSkill ??
    legacyAiBehavior.attackSkillId;
  if (typeof configuredAttackSkill === "string" && configuredAttackSkill.trim()) {
    options.attackSkill = configuredAttackSkill;
  } else if (fallbackAttackSkill) {
    options.attackSkill = fallbackAttackSkill;
  }

  const patterns = normalizeAttackPatterns(
    enemy?.attackPatterns ?? aiBehavior.attackPatterns ?? legacyAiBehavior.attackPatterns,
  );
  if (patterns) {
    options.attackPatterns = patterns;
  }

  for (const source of [enemy, aiBehavior, legacyAiBehavior]) {
    pickNumericOption(source, "attackCooldown", options);
    pickNumericOption(source, "visionRange", options);
    pickNumericOption(source, "attackRange", options);
    pickNumericOption(source, "dodgeChance", options);
    pickNumericOption(source, "dodgeCooldown", options);
    pickNumericOption(source, "fleeThreshold", options);
    pickNumericOption(source, "moveToCooldown", options);
    pickNumericOption(source, "retreatCooldown", options);

    const groupBehavior = toBoolean(source?.groupBehavior);
    if (groupBehavior !== undefined) {
      options.groupBehavior = groupBehavior;
    }

    const patrolWaypoints = normalizePatrolWaypoints(source?.patrolWaypoints);
    if (patrolWaypoints) {
      options.patrolWaypoints = patrolWaypoints;
    }
  }

  const behavior =
    aiBehavior.behavior && typeof aiBehavior.behavior === "object"
      ? aiBehavior.behavior
      : studioBehavior;
  if (hasAnyKey(behavior, behaviorGaugeKeys)) {
    const gaugeOptions: NonNullable<BattleAiOptions["behavior"]> = {};
    for (const key of behaviorGaugeKeys) {
      const value = toNumber(behavior[key]);
      if (value !== undefined) {
        gaugeOptions[key] = value;
      }
    }
    if (Object.keys(gaugeOptions).length > 0) {
      options.behavior = gaugeOptions;
    }
  }

  return options;
};

export const initializeEnemyVitalsFromParameters = (event: RpgEvent): void => {
  const maxHp = toNumber((event as any).param?.[MAXHP]);
  if (maxHp !== undefined) {
    (event as any).hp = maxHp;
  }

  const maxSp = toNumber((event as any).param?.[MAXSP]);
  if (maxSp !== undefined) {
    (event as any).sp = maxSp;
  }
};

export const initializeEnemyNaturalAttackFromStudioConfig = (
  event: RpgEvent,
  enemy: any,
): void => {
  if (hasStudioParameter(enemy, ATK)) return;
  if (hasConfiguredEnemyWeapon(enemy)) return;
  if (resolveEnemySkillIds(enemy).length > 0) return;

  const strength = toNumber((event as any).param?.[STR]);
  if (strength === undefined) return;
  setEnemyNaturalAttackModifier(event, strength);
};

const applyEnemyGraphicSetting: TriggerSettingsApplier = ({
  event,
  trigger,
  fallbackParams,
  object,
}) => {
  const explicitGraphic = trigger?.graphic ?? fallbackParams?.graphic;
  if (getGraphicKey(explicitGraphic)) {
    return;
  }
  const enemyId = resolveEnemyId(trigger, fallbackParams, object);
  if (!enemyId) return;
  const database = (globalThis as any)?.gameConfig?.database ?? [];
  const enemy = database.find((item: any) => item?._id === enemyId);
  if (!enemy) return;
  const graphicKey = getGraphicKey(enemy.graphic ?? enemy.params?.graphic);
  if (graphicKey) {
    (event as any)._graphicScale?.set(
      getGraphicScale(trigger, fallbackParams, object, enemy.params) ??
        null,
    );
    event.setGraphic(graphicKey);
  }
};

const applyDirectionSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const direction = trigger?.direction;
  if (direction) {
    event.changeDirection(direction);
  }
};

const applyMovementSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const movement = trigger?.movement;
  if (!movement) return;

  const speedMap = {
    slowest: Speed.Slowest,
    slower: Speed.Slower,
    slow: Speed.Slow,
    normal: Speed.Normal,
    fast: Speed.Fast,
    faster: Speed.Faster,
    fastest: Speed.Fastest,
  };

  if (movement.speed) {
    event.speed = speedMap[movement.speed as keyof typeof speedMap] ?? Speed.Normal;
  }

  const frequencyMap = {
    lowest: Frequency.Lowest,
    lower: Frequency.Lower,
    low: Frequency.Low,
    normal: Frequency.High,
    high: Frequency.High,
    higher: Frequency.Higher,
    highest: Frequency.Highest,
  };

  if (movement.frequency) {
    event.frequency =
      frequencyMap[movement.frequency as keyof typeof frequencyMap] ?? Frequency.High;
  }

  switch (movement.type) {
    case "fixed":
      event.breakRoutes?.(true);
      event.stopMoveTo();
      break;
    case "random":
      event.stopMoveTo();
      event.setGraphicAnimation?.("walk");
      event.infiniteMoveRoute([Move.tileRandom()], {
        onStuck: () => true,
        frequencyRatio: 1,
      });
      break;
    case "approach": {
      event.breakRoutes?.(true);
      const map = event.getCurrentMap();
      const [player] = map?.getPlayers() ?? [];
      if (player) {
        event.setGraphicAnimation?.("walk");
        event.moveTo(player);
      }
      break;
    }
  }
};

const applyPatternSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const pattern = trigger?.pattern;
  if (!pattern) return;
  event.animationFixed = false;
  if (
    pattern === "initial" &&
    (trigger?.movement?.type === "random" || trigger?.movement?.type === "approach")
  ) {
    return;
  }
  if (pattern === "loop" || pattern === "animate") {
    event.setGraphicAnimation("walk", Infinity);
    event.animationFixed = true;
  } else if (pattern === "stop") {
    event.setGraphicAnimation("stand", Infinity);
    event.animationFixed = true;
  } else {
    event.setGraphicAnimation("stand", Infinity);
  }
};

const applyHitboxSetting: TriggerSettingsApplier = ({
  event,
  trigger,
  fallbackParams,
  object,
}) => {
  if (typeof event.setHitbox !== "function") return;
  const hitbox =
    normalizeEventHitbox(trigger?.hitbox) ??
    normalizeEventHitbox(fallbackParams?.hitbox) ??
    normalizeEventHitbox(object?.hitbox) ??
    DEFAULT_EVENT_HITBOX;
  event.setHitbox(hitbox.width, hitbox.height);
};

const applyOptionsSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const options = trigger?.options || {};
  if (options.directionFix) {
    event.directionFixed = true;
  }
  if (options.through) {
    event.through = options.through;
  }
  const isEventTouchTrigger =
    trigger?.type === "onTouch" && trigger?.typeData?.touchTarget === "event";
  const throughEvent =
    typeof options.throughEvent === "boolean"
      ? options.throughEvent
      : isEventTouchTrigger
        ? true
        : undefined;
  if (throughEvent !== undefined) {
    event.throughEvent = throughEvent;
  }
  if (options.alwaysOnTop) {
    event.z.set(1000);
  } else if (options.alwaysOnBottom) {
    event.z.set(-1000);
  } else if (typeof event.z?.set === "function") {
    event.z.set(0);
  }
};

const baseTriggerSettingsAppliers: TriggerSettingsApplier[] = [
  applyGraphicSetting,
  applyDirectionSetting,
  applyMovementSetting,
  applyPatternSetting,
  applyHitboxSetting,
  applyOptionsSetting,
];

const DEFAULT_CHEST_SELF_SWITCH = "A";

const resolveChestSwitch = (context: EventHookContext) => {
  const typeData =
    context.resolveActiveTrigger(context.player, context.event)?.trigger
      ?.typeData ??
    context.params?.typeData ??
    context.object?.typeData ??
    {};
  const rawSwitch =
    typeData.openedSwitch ||
    typeData.openSwitch ||
    context.params?.openedSwitch ||
    DEFAULT_CHEST_SELF_SWITCH;
  const switchName = String(rawSwitch || DEFAULT_CHEST_SELF_SWITCH);
  const isSelfSwitch = /^[A-F]$/.test(switchName);
  return {
    scope: isSelfSwitch ? "self" : "global",
    switchName,
  } as const;
};

const getChestSwitchKey = (context: EventHookContext) => {
  const { scope, switchName } = resolveChestSwitch(context);
  if (scope === "self") {
    return `${context.event.id}_${switchName}`;
  }
  return switchName;
};

const isChestOpened = (context: EventHookContext): boolean => {
  if (!context.player) return false;
  const key = getChestSwitchKey(context);
  return Boolean(context.player.getVariable(key));
};

const setChestOpened = (context: EventHookContext, value: boolean): void => {
  if (!context.player) return;
  const key = getChestSwitchKey(context);
  context.player.setVariable(key, value);
};

const chestRuntime: EventTypeRuntime = {
  hooks: {
    onInit: async (context, next) => {
      if (!context.runInitLifecycle) {
        await next();
        return;
      }
      const opened = isChestOpened(context);
      await context.runInitLifecycle({ runInitBlocks: opened });
    },
    onAction: async (context, next) => {
      if (isChestOpened(context)) return;
      await next();
      setChestOpened(context, true);
      if (context.player) {
        context.applyActiveTrigger(context.player, context.event);
      }
    },
  },
};

const characterRuntime: EventTypeRuntime = {
  hooks: {
    onAction: async (context, next) => {;
      const trigger = context.resolveActiveTrigger(context.player, context.event)?.trigger
      const typeData = trigger?.typeData
      if (typeData) {
        const dialogue = typeData.dialogue;
        if (dialogue) {
          await show_text(context, {
            text: dialogue.text,
            speaker: context.event.id,
            position: dialogue.position,
            faceset: dialogue.faceset,
          });
        }
      }
      await next();
    },
  },
};

const enemyRuntime: EventTypeRuntime = {
  triggerSettings: [applyEnemyGraphicSetting, applyHitboxSetting],
  hooks: {
    onInit: async (context, next) => {
      const trigger = context.resolveActiveTrigger?.(context.player, context.event)?.trigger;
      const enemyId = resolveEnemyId(trigger, context.params, context.object);
      const map = context.map ?? context.event.getCurrentMap?.();
      const enemy = map?.database?.()?.[enemyId];
      if (enemy) {
        assignParams(context.event, enemy);
        context.event.level = trigger?.typeData?.level ?? enemy.initialLevel ?? 1;
        initializeEnemyNaturalAttackFromStudioConfig(context.event, enemy);
        initializeEnemyVitalsFromParameters(context.event);
        const attackSkill = learnEnemySkills(context.event, enemy);
        const aiOptions = resolveEnemyBattleAiOptions(enemy, attackSkill);
        (context.event as any).battleAi = new BattleAi(context.event, {
          ...aiOptions,
          rewards: {
            ...enemy.reward,
            showNotification: true,
          },
        });
        applyGraphicSetting({ event: context.event, trigger: enemy, fallbackParams: context.params, object: context.object, eventType: context.eventType });
      }
      await next();
    }
  }
};

const eventTypeRuntimeRegistry: Record<string, EventTypeRuntime> = {
  chest: chestRuntime,
  character: characterRuntime,
  enemy: enemyRuntime,
};

export const getEventTypeRuntime = (eventType?: string): EventTypeRuntime => {
  if (!eventType) return {};
  return eventTypeRuntimeRegistry[eventType] || {};
};

export const applyTriggerSettings = (context: TriggerSettingsContext): void => {
  const normalizedEventType = normalizeEventType(context.eventType) ?? context.eventType;
  const runtime = getEventTypeRuntime(normalizedEventType);
  const appliers =
    normalizedEventType === "enemy"
      ? [...(runtime.triggerSettings || [])]
      : [...baseTriggerSettingsAppliers, ...(runtime.triggerSettings || [])];
  for (const applier of appliers) {
    applier(context);
  }
};
