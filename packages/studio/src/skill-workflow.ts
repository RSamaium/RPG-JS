import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import type { AnyBlockInstance } from "@common/blocks";
import { BlockExecutionService } from "./block-executor";

export type StudioSkillWorkflowPhase = "cast" | "impact" | "defeat";

export interface StudioSkillWorkflowTrigger {
  phase: StudioSkillWorkflowPhase;
  blockCollectionId?: string;
  blocks?: AnyBlockInstance[];
  /** Compatibility with the first unreleased Studio workflow format. */
  commonEventId?: string;
}

interface StudioActionResult {
  cancelled?: boolean;
  defeated?: boolean;
}

interface StudioActionUseContext {
  action?: {
    mode?: string;
    projectile?: Record<string, unknown>;
  };
  defaultEffect: (target?: unknown) => unknown;
  projectile: (options?: Record<string, unknown>) => unknown;
}

const workflowQueues = new WeakMap<object, Promise<void>>();

const asTargets = (target: unknown): unknown[] => {
  if (target == null) return [];
  return Array.isArray(target) ? target : [target];
};

const asResults = (result: unknown): StudioActionResult[] => {
  if (Array.isArray(result)) return result as StudioActionResult[];
  return result && typeof result === "object"
    ? [result as StudioActionResult]
    : [];
};

const entityId = (entity: unknown): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;
  const id = (entity as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
};

const isDefeated = (target: unknown, result?: StudioActionResult): boolean => {
  if (result?.defeated === true) return true;
  if (!target || typeof target !== "object") return false;
  const hp = (target as { hp?: unknown }).hp;
  return typeof hp === "number" && hp <= 0;
};

const asEvent = (target: unknown): RpgEvent | null => {
  if (!target || typeof target !== "object") return null;
  const isEvent = (target as { isEvent?: () => boolean }).isEvent;
  return typeof isEvent === "function" && isEvent.call(target)
    ? target as RpgEvent
    : null;
};

const getMap = (player: RpgPlayer): RpgMap | null =>
  player.getCurrentMap?.() ?? (player as RpgPlayer & { map?: RpgMap }).map ?? null;

const runWorkflow = async (
  player: RpgPlayer,
  skillId: string,
  trigger: StudioSkillWorkflowTrigger,
  target?: unknown,
): Promise<void> => {
  const map = getMap(player);
  if (!map) return;

  const executor = new BlockExecutionService(player, asEvent(target), map);
  if (Array.isArray(trigger.blocks)) {
    await executor.executeBlockSequence(trigger.blocks);
    return;
  }
  if (!trigger.commonEventId) return;

  await executor.executeSingleBlock({
    id: `skill-${skillId}-${trigger.phase}-${trigger.commonEventId}`,
    type: "call_common_event",
    data: {
      commonEventId: trigger.commonEventId,
      parameters: {
        skillId,
        phase: trigger.phase,
        casterId: player.id,
        targetId: entityId(target),
      },
    },
  });
};

const enqueueWorkflow = (
  player: RpgPlayer,
  skillId: string,
  triggers: StudioSkillWorkflowTrigger[],
  phase: StudioSkillWorkflowPhase,
  target?: unknown,
): Promise<void> => {
  const matching = triggers.filter((trigger) => trigger.phase === phase);
  if (matching.length === 0) return Promise.resolve();

  const previous = workflowQueues.get(player) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      for (const trigger of matching) {
        try {
          await runWorkflow(player, skillId, trigger, target);
        } catch (error) {
          console.error(
            `[studio] Skill workflow "${trigger.blockCollectionId ?? trigger.commonEventId}" failed during ${phase}`,
            error,
          );
        }
      }
      player.syncChanges?.();
    })
    .catch((error) => {
      console.error(`[studio] Skill workflow queue failed for "${skillId}"`, error);
    });

  workflowQueues.set(player, current);
  void current.finally(() => {
    if (workflowQueues.get(player) === current) {
      workflowQueues.delete(player);
    }
  });
  return current;
};

const dispatchImpactWorkflows = (
  player: RpgPlayer,
  skillId: string,
  triggers: StudioSkillWorkflowTrigger[],
  target: unknown,
  effectResult: unknown,
): void => {
  const targets = asTargets(target);
  const results = asResults(effectResult);

  targets.forEach((entry, index) => {
    const result = results[index] ?? results[0];
    if (result?.cancelled === true) return;
    enqueueWorkflow(player, skillId, triggers, "impact", entry);
    if (isDefeated(entry, result)) {
      enqueueWorkflow(player, skillId, triggers, "defeat", entry);
    }
  });
};

export const normalizeStudioSkillWorkflowTriggers = (
  value: unknown,
): StudioSkillWorkflowTrigger[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap<StudioSkillWorkflowTrigger>((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const phase = (entry as { phase?: unknown }).phase;
    const blockCollectionId = (entry as { blockCollectionId?: unknown }).blockCollectionId;
    const blocks = (entry as { blocks?: unknown }).blocks;
    const commonEventId = (entry as { commonEventId?: unknown }).commonEventId;
    if (
      phase !== "cast"
      && phase !== "impact"
      && phase !== "defeat"
    ) {
      return [];
    }
    if (typeof blockCollectionId === "string" && blockCollectionId.trim()) {
      return [{
        phase,
        blockCollectionId: blockCollectionId.trim(),
        blocks: Array.isArray(blocks) ? blocks as AnyBlockInstance[] : undefined,
      }];
    }
    if (typeof commonEventId === "string" && commonEventId.trim()) {
      return [{ phase, commonEventId: commonEventId.trim() }];
    }
    return [];
  });
};

export const createStudioSkillOnUse = (
  skillId: string,
  value: unknown,
): ((player: RpgPlayer, target?: unknown, action?: StudioActionUseContext) => Promise<void>) | undefined => {
  const triggers = normalizeStudioSkillWorkflowTriggers(value);
  if (triggers.length === 0) return undefined;

  return (player, target, action) => {
    enqueueWorkflow(player, skillId, triggers, "cast", target);

    // RPGJS' standard useSkill() has already applied the skill before onUse.
    if (!action) {
      dispatchImpactWorkflows(player, skillId, triggers, target, undefined);
      return workflowQueues.get(player) ?? Promise.resolve();
    }

    if (action.action?.mode === "projectile") {
      action.projectile({
        ...(action.action.projectile ?? {}),
        onImpact: (context: { target?: unknown }, battleAction: StudioActionUseContext) => {
          const impactTarget = context.target ?? target;
          const result = battleAction.defaultEffect(impactTarget);
          dispatchImpactWorkflows(player, skillId, triggers, impactTarget, result);
        },
      });
      return workflowQueues.get(player) ?? Promise.resolve();
    }

    const result = action.defaultEffect(target);
    dispatchImpactWorkflows(player, skillId, triggers, target, result);
    return workflowQueues.get(player) ?? Promise.resolve();
  };
};
