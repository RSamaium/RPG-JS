import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import type { AiState, AttackPattern, EnemyType } from "../ai.server";
import type {
  ActionBattleAiContext,
  ActionBattleAiDecision,
} from "./contracts";

export type ActionBattleAiTreeStatus = "success" | "failure" | "running";

export type ActionBattleAiMemory = Record<string, any>;

/** JSON-compatible values accepted by server-driven AI visual cues. */
export type ActionBattleAiSerializable =
  | string
  | number
  | boolean
  | null
  | ActionBattleAiSerializable[]
  | { [key: string]: ActionBattleAiSerializable | undefined };

/** Serializable visual request dispatched to `ai.visuals` on each client. */
export type ActionBattleAiVisual = {
  /** Stable key used to select the client visual handler. */
  kind: string;
} & Record<string, ActionBattleAiSerializable | undefined>;

/** World-space position used by AI movement and teleport intents. */
export interface ActionBattleAiPosition {
  /** Horizontal world coordinate. */
  x: number;
  /** Vertical world coordinate. */
  y: number;
}

/** Options for teleporting around the AI's current target. */
export interface ActionBattleAiTeleportNearTargetOptions {
  /** Distance in world pixels from the target. */
  distance: number;
  /**
   * Optional angle around the target in degrees. The server chooses a random
   * angle when omitted.
   */
  angleDegrees?: number;
}

/** Server callback executed by the `run()` intent. */
export type ActionBattleAiRunCallback = (
  context: ActionBattleAiTreeContext
) => void | boolean;

export interface ActionBattleAiIntentBase {
  consume?: boolean;
  metadata?: Record<string, any>;
}

export type ActionBattleAiIntent =
  | (ActionBattleAiIntentBase & { type: "idle" })
  | (ActionBattleAiIntentBase & { type: "patrol" })
  | (ActionBattleAiIntentBase & { type: "faceTarget" })
  | (ActionBattleAiIntentBase & { type: "moveToTarget" })
  | (ActionBattleAiIntentBase & { type: "fleeFromTarget" })
  | (ActionBattleAiIntentBase & {
      type: "keepDistance";
      distance: number;
      tolerance?: number;
    })
  | (ActionBattleAiIntentBase & {
      type: "useAttack";
      pattern?: AttackPattern | string;
    })
  | (ActionBattleAiIntentBase & {
      type: "useSkill";
      skill: any;
    })
  | (ActionBattleAiIntentBase & {
      type: "setMode";
      mode: NonNullable<ActionBattleAiDecision["mode"]>;
    })
  | (ActionBattleAiIntentBase & {
      type: "run";
      callback: ActionBattleAiRunCallback;
    })
  | (ActionBattleAiIntentBase & {
      type: "visual";
      visual: ActionBattleAiVisual;
    })
  | (ActionBattleAiIntentBase & {
      type: "setSpeed";
      value: number;
    })
  | (ActionBattleAiIntentBase & {
      type: "moveToPoint";
      position: ActionBattleAiPosition;
    })
  | (ActionBattleAiIntentBase & {
      type: "holdPosition";
    })
  | (ActionBattleAiIntentBase & {
      type: "teleportTo";
      position: ActionBattleAiPosition;
    })
  | (ActionBattleAiIntentBase & {
      type: "teleportNearTarget";
      options: ActionBattleAiTeleportNearTargetOptions;
    })
  | (ActionBattleAiIntentBase & {
      type: "callAction";
      name: string;
      payload?: Record<string, unknown>;
    });

export interface ActionBattleAiSnapshotSelf {
  event: RpgEvent;
  state: AiState;
  enemyType: EnemyType;
  hpPercent: number | null;
  attackRange: number;
}

export interface ActionBattleAiSnapshotTarget {
  entity: RpgPlayer;
  distance: number;
  inAttackRange: boolean;
  visible: boolean;
}

export interface ActionBattleAiTreeContext extends ActionBattleAiContext {
  self: ActionBattleAiSnapshotSelf;
  targetInfo: ActionBattleAiSnapshotTarget | null;
  memory: ActionBattleAiMemory;
}

export interface ActionBattleAiTreeResult {
  status: ActionBattleAiTreeStatus;
  decision?: ActionBattleAiDecision;
  intent?: ActionBattleAiIntent | ActionBattleAiIntent[];
}

export interface ActionBattleAiTreeNode {
  tick(context: ActionBattleAiTreeContext): ActionBattleAiTreeResult;
}

export type ActionBattleAiTreeInput =
  | ActionBattleAiTreeNode
  | ((context: ActionBattleAiTreeContext) => ActionBattleAiTreeResult | void);

export type ActionBattleAiCondition = (
  context: ActionBattleAiTreeContext
) => boolean;

export type ActionBattleAiIntentInput =
  | ActionBattleAiIntent
  | ActionBattleAiIntent[]
  | ActionBattleAiTreeNode
  | ((context: ActionBattleAiTreeContext) => ActionBattleAiIntent | ActionBattleAiIntent[]);

export interface ActionBattleAiRule {
  condition: ActionBattleAiCondition;
  then: ActionBattleAiIntentInput;
}

export interface ActionBattleAiSimpleBehavior {
  when?: ActionBattleAiRule[];
  otherwise?: ActionBattleAiIntentInput;
}

const isTreeNode = (input: unknown): input is ActionBattleAiTreeNode =>
  Boolean(input && typeof (input as ActionBattleAiTreeNode).tick === "function");

const normalizeTreeResult = (
  result: ActionBattleAiTreeResult | void
): ActionBattleAiTreeResult => result ?? { status: "failure" };

const runIntentInput = (
  input: ActionBattleAiIntentInput,
  context: ActionBattleAiTreeContext
): ActionBattleAiTreeResult => {
  if (isTreeNode(input)) return input.tick(context);
  const intent = typeof input === "function" ? input(context) : input;
  return { status: "success", intent };
};

let waitId = 0;

const memoryKey = (scope: string, key: string) =>
  `action-battle:${scope}:${key}`;

export const defineAiTree = (
  input: ActionBattleAiTreeInput
): ActionBattleAiTreeNode => {
  if (isTreeNode(input)) return input;
  return {
    tick(context) {
      return normalizeTreeResult(input(context));
    },
  };
};

export const selector = (
  children: ActionBattleAiTreeInput[]
): ActionBattleAiTreeNode => ({
  tick(context) {
    for (const child of children) {
      const result = defineAiTree(child).tick(context);
      if (result.status !== "failure") return result;
    }
    return { status: "failure" };
  },
});

export const sequence = (
  children: ActionBattleAiTreeInput[]
): ActionBattleAiTreeNode => ({
  tick(context) {
    let last: ActionBattleAiTreeResult = { status: "success" };
    for (const child of children) {
      last = defineAiTree(child).tick(context);
      if (last.status !== "success") return last;
    }
    return last;
  },
});

/**
 * Run behavior steps across multiple AI ticks while preserving the current
 * step in the AI instance memory.
 *
 * Steps that emit an intent pause the sequence until the next tick. A running
 * step, such as `wait()`, remains active until it succeeds.
 *
 * @param key Stable memory key unique within one behavior tree.
 * @param children Ordered intents or nodes to execute.
 * @returns A stateful behavior-tree node.
 */
export const sequenceWithDelay = (
  key: string,
  children: ActionBattleAiIntentInput[]
): ActionBattleAiTreeNode => ({
  tick(context) {
    const keyInMemory = memoryKey("sequence", key);
    const state = (context.memory[keyInMemory] ??= { index: 0 }) as {
      index: number;
    };

    while (state.index < children.length) {
      const result = runIntentInput(children[state.index], context);
      if (result.status === "failure") {
        delete context.memory[keyInMemory];
        return result;
      }
      if (result.status === "running") return result;

      state.index++;
      if (state.index >= children.length) {
        delete context.memory[keyInMemory];
        return result;
      }
      if (result.intent || result.decision) {
        return { ...result, status: "running" };
      }
    }

    delete context.memory[keyInMemory];
    return { status: "success" };
  },
});

export const condition = (
  predicate: ActionBattleAiCondition
): ActionBattleAiTreeNode => ({
  tick(context) {
    return { status: predicate(context) ? "success" : "failure" };
  },
});

export const action = (
  input: ActionBattleAiIntentInput,
  status: ActionBattleAiTreeStatus = "success"
): ActionBattleAiTreeNode => ({
  tick(context) {
    const result = runIntentInput(input, context);
    return { ...result, status };
  },
});

export const decision = (
  resolve: ActionBattleAiDecision | ((context: ActionBattleAiTreeContext) => ActionBattleAiDecision)
): ActionBattleAiTreeNode => ({
  tick(context) {
    return {
      status: "success",
      decision: typeof resolve === "function" ? resolve(context) : resolve,
    };
  },
});

/**
 * Execute an action only once for one AI instance.
 *
 * The key is marked only after the wrapped action succeeds. Running actions
 * can therefore finish normally across several AI ticks.
 *
 * @param key Stable memory key unique within one behavior tree.
 * @param input Intent or node to execute once.
 * @returns A behavior-tree node that fails after its first completion.
 */
export const once = (
  key: string,
  input: ActionBattleAiIntentInput
): ActionBattleAiTreeNode => ({
  tick(context) {
    const keyInMemory = memoryKey("once", key);
    if (context.memory[keyInMemory]) return { status: "failure" };
    const result = runIntentInput(input, context);
    if (result.status === "success") {
      context.memory[keyInMemory] = true;
    }
    return result;
  },
});

/**
 * Allow an action to run again only after a named cooldown has elapsed.
 *
 * The cooldown starts when the wrapped action succeeds.
 *
 * @param key Stable memory key unique within one behavior tree.
 * @param ms Cooldown duration in milliseconds.
 * @param input Intent or node protected by the cooldown.
 * @returns A behavior-tree node that fails while cooling down.
 */
export const cooldown = (
  key: string,
  ms: number,
  input: ActionBattleAiIntentInput
): ActionBattleAiTreeNode => ({
  tick(context) {
    const keyInMemory = memoryKey("cooldown", key);
    const readyAt = context.memory[keyInMemory];
    if (typeof readyAt === "number" && context.now < readyAt) {
      return { status: "failure" };
    }
    const result = runIntentInput(input, context);
    if (result.status === "success") {
      context.memory[keyInMemory] = context.now + Math.max(0, ms);
    }
    return result;
  },
});

/**
 * Pause a stateful behavior sequence for a duration measured with the
 * authoritative AI clock.
 *
 * @param ms Delay in milliseconds.
 * @returns A node that stays `running` until the delay elapses.
 */
export const wait = (ms: number): ActionBattleAiTreeNode => {
  const keyInMemory = memoryKey("wait", String(waitId++));
  return {
    tick(context) {
      const readyAt = context.memory[keyInMemory];
      if (typeof readyAt !== "number") {
        context.memory[keyInMemory] = context.now + Math.max(0, ms);
        return { status: "running" };
      }
      if (context.now < readyAt) return { status: "running" };
      delete context.memory[keyInMemory];
      return { status: "success" };
    },
  };
};

export const rule = (
  predicate: ActionBattleAiCondition,
  then: ActionBattleAiIntentInput
): ActionBattleAiRule => ({
  condition: predicate,
  then,
});

export const defineAiBehavior = (
  behavior: ActionBattleAiSimpleBehavior
): ActionBattleAiTreeNode => {
  const branches = [
    ...(behavior.when ?? []).map((entry) =>
      sequence([condition(entry.condition), action(entry.then)])
    ),
  ];
  if (behavior.otherwise) {
    branches.push(action(behavior.otherwise));
  }
  return selector(branches);
};

export const hpBelow = (ratio: number): ActionBattleAiCondition => {
  return ({ self }) => self.hpPercent !== null && self.hpPercent < ratio;
};

export const targetVisible = (): ActionBattleAiCondition => {
  return ({ targetInfo }) => Boolean(targetInfo?.visible);
};

export const targetInRange = (
  range?: number
): ActionBattleAiCondition => {
  return ({ self, targetInfo }) => {
    if (!targetInfo) return false;
    return targetInfo.distance <= (range ?? self.attackRange);
  };
};

export const distanceLessThan = (
  distance: number
): ActionBattleAiCondition => {
  return ({ targetInfo }) =>
    targetInfo !== null && targetInfo.distance < distance;
};

export const inState = (state: AiState): ActionBattleAiCondition => {
  return ({ self }) => self.state === state;
};

export const isEnemyType = (
  enemyType: EnemyType
): ActionBattleAiCondition => {
  return ({ self }) => self.enemyType === enemyType;
};

export const idle = (): ActionBattleAiIntent => ({ type: "idle" });
export const patrol = (): ActionBattleAiIntent => ({ type: "patrol" });
export const faceTarget = (): ActionBattleAiIntent => ({ type: "faceTarget" });
export const chase = (): ActionBattleAiIntent => ({ type: "moveToTarget" });
export const moveToTarget = chase;
export const flee = (): ActionBattleAiIntent => ({ type: "fleeFromTarget" });
export const fleeFromTarget = flee;
export const keepDistance = (
  distance: number,
  tolerance?: number
): ActionBattleAiIntent => ({ type: "keepDistance", distance, tolerance });
export const useAttack = (
  pattern?: AttackPattern | string
): ActionBattleAiIntent => ({ type: "useAttack", pattern });
export const useSkill = (skill: any): ActionBattleAiIntent => ({
  type: "useSkill",
  skill,
});
export const setMode = (
  mode: NonNullable<ActionBattleAiDecision["mode"]>
): ActionBattleAiIntent => ({ type: "setMode", mode, consume: false });

/**
 * Execute custom RPGJS server logic from an AI behavior.
 *
 * @param callback Callback receiving the current authoritative AI context.
 * @param options Set `consume` to `false` to allow default AI in the same tick.
 * @returns A server-only AI intent.
 */
export const run = (
  callback: ActionBattleAiRunCallback,
  options: Pick<ActionBattleAiIntentBase, "consume"> = {}
): ActionBattleAiIntent => ({
  type: "run",
  callback,
  consume: options.consume,
});

/**
 * Request a serializable client-side visual selected by its `kind`.
 *
 * @param cue JSON-shaped visual cue sent to clients on the current map.
 * @param consume Whether the cue prevents default AI behavior for this tick.
 * @returns A non-consuming AI intent by default.
 */
export const visual = (
  cue: ActionBattleAiVisual,
  consume = false
): ActionBattleAiIntent => ({
  type: "visual",
  visual: cue,
  consume,
});

/**
 * Change the controlled event's synchronized movement speed.
 *
 * @param value Non-negative RPGJS movement speed.
 * @param consume Whether the change prevents default AI for this tick.
 * @returns A non-consuming AI intent by default.
 */
export const setSpeed = (
  value: number,
  consume = false
): ActionBattleAiIntent => ({ type: "setSpeed", value, consume });

/**
 * Move the controlled event toward a fixed world position.
 *
 * @param position Destination in world coordinates.
 * @returns A consuming AI intent using the configured movement throttle.
 */
export const moveToPoint = (
  position: ActionBattleAiPosition
): ActionBattleAiIntent => ({ type: "moveToPoint", position });

/**
 * Stop the controlled event at its current position.
 *
 * @returns A consuming AI intent.
 */
export const holdPosition = (): ActionBattleAiIntent => ({
  type: "holdPosition",
});

/**
 * Teleport the controlled event to a fixed world position.
 *
 * @param position Destination passed to the RPGJS teleport API.
 * @returns A consuming AI intent.
 */
export const teleportTo = (
  position: ActionBattleAiPosition
): ActionBattleAiIntent => ({ type: "teleportTo", position });

/**
 * Teleport the controlled event around its current target.
 *
 * @param options Distance and optional server-authoritative angle.
 * @returns A consuming AI intent that fails when there is no current target.
 */
export const teleportNearTarget = (
  options: ActionBattleAiTeleportNearTargetOptions
): ActionBattleAiIntent => ({ type: "teleportNearTarget", options });

/**
 * Call a project or module action registered in `ai.actions`.
 *
 * @param name Registered action name.
 * @param payload Optional project data kept on the server.
 * @returns A consuming AI intent that fails when the action is unknown.
 */
export const callAction = (
  name: string,
  payload?: Record<string, unknown>
): ActionBattleAiIntent => ({ type: "callAction", name, payload });

/**
 * Run a behavior once when the controlled event falls below an HP ratio.
 *
 * @param key Stable phase key unique within one behavior tree.
 * @param ratio HP ratio from `0` to `1`.
 * @param then Intent or stateful node executed by the phase.
 * @returns A one-time behavior-tree node.
 */
export const phase = (
  key: string,
  ratio: number,
  then: ActionBattleAiIntentInput
): ActionBattleAiTreeNode =>
  sequence([condition(hpBelow(ratio)), once(`phase:${key}`, then)]);

export const ifHpBelow = (
  ratio: number,
  then: ActionBattleAiIntentInput
): ActionBattleAiRule => rule(hpBelow(ratio), then);

export const ifTargetVisible = (
  then: ActionBattleAiIntentInput
): ActionBattleAiRule => rule(targetVisible(), then);

export const ifTargetInRange = (
  then: ActionBattleAiIntentInput,
  range?: number
): ActionBattleAiRule => rule(targetInRange(range), then);

export const ifDistanceLessThan = (
  distance: number,
  then: ActionBattleAiIntentInput
): ActionBattleAiRule => rule(distanceLessThan(distance), then);
