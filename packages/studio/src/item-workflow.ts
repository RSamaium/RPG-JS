import type { AnyBlockInstance } from "@common/blocks";
import type { RpgMap, RpgPlayer } from "@rpgjs/server";
import { BlockExecutionService } from "./block-executor";

/**
 * Native RPGJS item lifecycle phases supported by Studio workflows.
 */
export type StudioItemWorkflowPhase =
  | "onAdd"
  | "onUse"
  | "onUseFailed"
  | "onRemove"
  | "onEquip";

/**
 * Serializable link between an item lifecycle hook and a Studio block collection.
 */
export interface StudioItemWorkflowTrigger {
  /** Native RPGJS item hook that starts the workflow. */
  phase: StudioItemWorkflowPhase;
  /** Studio block collection identifier used by online and editor runtimes. */
  blockCollectionId?: string;
  /** Hydrated block sequence used by the game runtime and offline exports. */
  blocks?: AnyBlockInstance[];
  /** Compatibility with the first unreleased Common Event workflow format. */
  commonEventId?: string;
}

/**
 * Native item hook functions generated from Studio workflow triggers.
 */
export interface StudioItemWorkflowHooks {
  onAdd?: (player: RpgPlayer) => Promise<void>;
  onUse?: (player: RpgPlayer) => Promise<void>;
  onUseFailed?: (player: RpgPlayer) => Promise<void>;
  onRemove?: (player: RpgPlayer) => Promise<void>;
  onEquip?: (player: RpgPlayer, equip: boolean) => Promise<void>;
}

const ITEM_WORKFLOW_PHASES = new Set<unknown>([
  "onAdd",
  "onUse",
  "onUseFailed",
  "onRemove",
  "onEquip",
]);

const workflowQueues = new WeakMap<object, Promise<void>>();

const getMap = (player: RpgPlayer): RpgMap | null =>
  player.getCurrentMap?.() ?? (player as RpgPlayer & { map?: RpgMap }).map ?? null;

/**
 * Normalizes serialized Studio item workflow triggers.
 *
 * Invalid phases and empty references are ignored so legacy item records keep
 * their native RPGJS behavior.
 *
 * @param value - Untrusted workflow data read from Studio or an offline bundle
 * @returns Valid item lifecycle workflow triggers
 */
export const normalizeStudioItemWorkflowTriggers = (
  value: unknown,
): StudioItemWorkflowTrigger[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap<StudioItemWorkflowTrigger>((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const phase = record.phase;
    if (!ITEM_WORKFLOW_PHASES.has(phase)) return [];

    const blockCollectionId = record.blockCollectionId;
    const commonEventId = record.commonEventId;
    const blocks = record.blocks;
    if (typeof blockCollectionId === "string" && blockCollectionId.trim()) {
      return [{
        phase: phase as StudioItemWorkflowPhase,
        blockCollectionId: blockCollectionId.trim(),
        blocks: Array.isArray(blocks) ? blocks as AnyBlockInstance[] : undefined,
      }];
    }
    if (typeof commonEventId === "string" && commonEventId.trim()) {
      return [{
        phase: phase as StudioItemWorkflowPhase,
        commonEventId: commonEventId.trim(),
      }];
    }
    return [];
  });
};

const runWorkflow = async (
  player: RpgPlayer,
  itemId: string,
  trigger: StudioItemWorkflowTrigger,
  equip?: boolean,
): Promise<void> => {
  const map = getMap(player);
  if (!map) return;

  const initialVariables = {
    itemId,
    hook: trigger.phase,
    ...(typeof equip === "boolean" ? { equip } : {}),
  };
  const executor = new BlockExecutionService(player, null, map, {
    initialVariables,
  });
  if (Array.isArray(trigger.blocks)) {
    await executor.executeBlockSequence(trigger.blocks);
    return;
  }
  if (!trigger.commonEventId) return;

  await executor.executeSingleBlock({
    id: `item-${itemId}-${trigger.phase}-${trigger.commonEventId}`,
    type: "call_common_event",
    data: {
      commonEventId: trigger.commonEventId,
      parameters: initialVariables,
    },
  });
};

const enqueueWorkflows = (
  player: RpgPlayer,
  itemId: string,
  triggers: StudioItemWorkflowTrigger[],
  phase: StudioItemWorkflowPhase,
  equip?: boolean,
): Promise<void> => {
  const matching = triggers.filter((trigger) => trigger.phase === phase);
  if (matching.length === 0) return Promise.resolve();

  const previous = workflowQueues.get(player) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      for (const trigger of matching) {
        try {
          await runWorkflow(player, itemId, trigger, equip);
        } catch (error) {
          console.error(
            `[studio] Item workflow "${trigger.blockCollectionId ?? trigger.commonEventId}" failed during ${phase}`,
            error,
          );
        }
      }
      player.syncChanges?.();
    })
    .catch((error) => {
      console.error(`[studio] Item workflow queue failed for "${itemId}"`, error);
    });

  workflowQueues.set(player, current);
  void current.finally(() => {
    if (workflowQueues.get(player) === current) {
      workflowQueues.delete(player);
    }
  });
  return current;
};

/**
 * Creates native RPGJS item hooks backed by Studio block workflows.
 *
 * The generated hooks run on the authoritative server in both standalone RPG
 * and MMORPG modes. Hook failures are logged without replacing the native item
 * operation.
 *
 * @param itemId - Stable RPGJS database identifier for the item
 * @param value - Serialized Studio workflow triggers
 * @returns Native item hooks, or an empty object when no trigger is configured
 *
 * @example
 * ```ts
 * const hooks = createStudioItemWorkflowHooks('iron-sword', [
 *   { phase: 'onEquip', blockCollectionId: 'sword-equip-workflow', blocks: [] }
 * ])
 * ```
 */
export const createStudioItemWorkflowHooks = (
  itemId: string,
  value: unknown,
): StudioItemWorkflowHooks => {
  const triggers = normalizeStudioItemWorkflowTriggers(value);
  if (triggers.length === 0) return {};

  const hasPhase = (phase: StudioItemWorkflowPhase): boolean =>
    triggers.some((trigger) => trigger.phase === phase);
  return {
    ...(hasPhase("onAdd")
      ? { onAdd: (player: RpgPlayer) => enqueueWorkflows(player, itemId, triggers, "onAdd") }
      : {}),
    ...(hasPhase("onUse")
      ? { onUse: (player: RpgPlayer) => enqueueWorkflows(player, itemId, triggers, "onUse") }
      : {}),
    ...(hasPhase("onUseFailed")
      ? {
          onUseFailed: (player: RpgPlayer) =>
            enqueueWorkflows(player, itemId, triggers, "onUseFailed"),
        }
      : {}),
    ...(hasPhase("onRemove")
      ? {
          onRemove: (player: RpgPlayer) =>
            enqueueWorkflows(player, itemId, triggers, "onRemove"),
        }
      : {}),
    ...(hasPhase("onEquip")
      ? {
          onEquip: (player: RpgPlayer, equip: boolean) =>
            enqueueWorkflows(player, itemId, triggers, "onEquip", equip),
        }
      : {}),
  };
};
