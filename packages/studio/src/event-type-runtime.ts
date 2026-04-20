import { show_text } from "@common/blocks/executors/show-text";
import { Move, RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import { EnemyType, BattleAi } from "@rpgjs/action-battle/server";
import { normalizeEventType } from "@common/event-types";
import { assignParams } from "./assign-params";

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
  resolveActiveTrigger: (
    player: RpgPlayer | null,
    event: RpgEvent
  ) => { trigger: any; index: number } | null;
  applyActiveTrigger: (player: RpgPlayer | null, event: RpgEvent) => any;
  executeBlocks: (
    player: RpgPlayer | null,
    triggerType: string,
    event: RpgEvent
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

export const getGraphicKey = (graphic: any): string | null => {
  if (!graphic) return null;
  if (typeof graphic === "string") return graphic;
  if (typeof graphic === "object") {
    return (
      graphic.fileName || graphic.id || graphic._id || graphic.graphic || null
    );
  }
  return null;
};

const applyGraphicSetting: TriggerSettingsApplier = ({
  event,
  trigger,
  fallbackParams,
}) => {
  const graphic = trigger?.graphic ?? fallbackParams?.graphic;
  const graphicKey = getGraphicKey(graphic);
  if (graphicKey) {
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

  switch (movement.type) {
    case "fixed":
      event.stopMoveTo();
      break;
    case "random":
      event.infiniteMoveRoute([Move.tileRandom()]);
      break;
    case "approach": {
      const map = event.getCurrentMap();
      const [player] = map?.getPlayers() ?? [];
      if (player) {
        event.moveTo(player);
      }
      break;
    }
  }

  const speedMap = {
    slowest: 1,
    slower: 2,
    slow: 3,
    normal: 4,
    fast: 5,
    faster: 6,
    fastest: 7,
  };

  if (movement.speed) {
    event.speed.set(speedMap[movement.speed as keyof typeof speedMap]);
  }

  const frequencyMap = {
    lowest: 1,
    lower: 2,
    low: 3,
    normal: 4,
    high: 5,
    higher: 6,
    highest: 7,
  };

  if (movement.frequency) {
    event.frequency =
      frequencyMap[movement.frequency as keyof typeof frequencyMap] * 100;
  }
};

const applyPatternSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const pattern = trigger?.pattern;
  if (!pattern) return;
  if (pattern === "loop") {
    event.setGraphicAnimation("walk", 1);
  } else {
    event.setGraphicAnimation("stand", 1);
  }
};

const applyOptionsSetting: TriggerSettingsApplier = ({ event, trigger }) => {
  const options = trigger?.options || {};
  if (options.directionFix) {
    event.directionFixed = true;
  }
  if (options.through) {
    event.through = options.through;
  }
  if (options.alwaysOnTop) {
    event.z.set(1000);
  }
};

const baseTriggerSettingsAppliers: TriggerSettingsApplier[] = [
  applyGraphicSetting,
  applyDirectionSetting,
  applyMovementSetting,
  applyPatternSetting,
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
          await show_text(context as any, {
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
  triggerSettings: [applyEnemyGraphicSetting],
  hooks: {
    onInit: async (context, next) => {
      const trigger = context.resolveActiveTrigger?.(context.player, context.event)?.trigger;
      const enemyId = resolveEnemyId(trigger, context.params, context.object);
      const map = context.map ?? context.event.getCurrentMap?.();
      const enemy = map?.database?.()?.[enemyId];
      if (enemy) {
        assignParams(context.event, enemy);
        context.event.level = trigger?.typeData?.level ?? enemy.initialLevel ?? 1;
        (context.event as any).battleAi = new BattleAi(context.event, {
          enemyType: EnemyType.Aggressive,
          visionRange: 150,
          attackRange: 50,
          onDefeated: (event: RpgEvent) => {
            const map = event.getCurrentMap?.();
            if (map) {
              // TODO
              const player = map.getPlayers()?.[0];
              if (player) {
                player.exp += enemy.reward?.exp ?? 0;
                player.gold += enemy.reward?.gold ?? 0;
                player.showNotification(`You won ${enemy.reward?.exp} experience and ${enemy.reward?.gold} gold`);
                for (const item of enemy.reward?.items ?? []) {
                  const rand = Math.random() * 100;
                  if (rand < item.chance) {
                    const itemWon = player.addItem(item.itemId, item.amount);
                    const itemData = map?.database?.()?.[item.itemId];
                    player.showNotification(`You won ${item.amount} ${itemWon.name()}`, {
                      icon: itemData?.icon
                    });
                  }
                }
              }
            }
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
