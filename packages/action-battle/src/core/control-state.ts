export type ActionBattleControlEntity = {
  canMove?: boolean;
  directionFixed?: boolean;
  animationFixed?: boolean;
};

export interface ActionBattleControlLeaseOptions {
  owner: string;
  movement?: boolean;
  direction?: boolean;
  animation?: boolean;
  durationMs?: number;
}

export interface ActionBattleControlLease {
  readonly owner: string;
  readonly active: boolean;
  release(): void;
}

type ControlSnapshot = {
  canMove: boolean | undefined;
  directionFixed: boolean | undefined;
  animationFixed: boolean | undefined;
};

type RuntimeLease = {
  id: number;
  owner: string;
  movement: boolean;
  direction: boolean;
  animation: boolean;
  timer?: ReturnType<typeof setTimeout>;
  released: boolean;
};

type RuntimeState = {
  baseline: ControlSnapshot;
  nextId: number;
  leases: Map<number, RuntimeLease>;
};

const states = new WeakMap<object, RuntimeState>();

const snapshot = (entity: ActionBattleControlEntity): ControlSnapshot => ({
  canMove: entity.canMove,
  directionFixed: entity.directionFixed,
  animationFixed: entity.animationFixed,
});

const restore = (
  entity: ActionBattleControlEntity,
  baseline: ControlSnapshot
) => {
  if (baseline.canMove !== undefined) entity.canMove = baseline.canMove;
  if (baseline.directionFixed !== undefined) {
    entity.directionFixed = baseline.directionFixed;
  }
  if (baseline.animationFixed !== undefined) {
    entity.animationFixed = baseline.animationFixed;
  }
};

const apply = (
  entity: ActionBattleControlEntity,
  state: RuntimeState
) => {
  const leases = Array.from(state.leases.values());
  if (leases.length === 0) {
    restore(entity, state.baseline);
    states.delete(entity as object);
    return;
  }

  const movementLocked = leases.some((lease) => lease.movement);
  const directionLocked = leases.some((lease) => lease.direction);
  const animationLocked = leases.some((lease) => lease.animation);

  if (state.baseline.canMove !== undefined) {
    entity.canMove = movementLocked ? false : state.baseline.canMove;
  }
  if (state.baseline.directionFixed !== undefined) {
    entity.directionFixed =
      directionLocked || state.baseline.directionFixed;
  }
  if (state.baseline.animationFixed !== undefined) {
    entity.animationFixed =
      animationLocked || state.baseline.animationFixed;
  }
};

/**
 * Acquire an idempotent control lease for an action.
 *
 * Overlapping leases share one baseline snapshot, so releasing an older action
 * can never restore stale movement or animation flags over a newer action.
 */
export const acquireActionBattleControl = (
  entity: ActionBattleControlEntity,
  options: ActionBattleControlLeaseOptions
): ActionBattleControlLease => {
  let state = states.get(entity as object);
  if (!state) {
    state = {
      baseline: snapshot(entity),
      nextId: 1,
      leases: new Map(),
    };
    states.set(entity as object, state);
  }

  const lease: RuntimeLease = {
    id: state.nextId++,
    owner: options.owner,
    movement: options.movement === true,
    direction: options.direction === true,
    animation: options.animation === true,
    released: false,
  };
  state.leases.set(lease.id, lease);
  apply(entity, state);

  const release = () => {
    if (lease.released) return;
    lease.released = true;
    if (lease.timer) clearTimeout(lease.timer);
    const current = states.get(entity as object);
    if (!current) return;
    current.leases.delete(lease.id);
    apply(entity, current);
  };

  if (
    typeof options.durationMs === "number" &&
    Number.isFinite(options.durationMs) &&
    options.durationMs >= 0
  ) {
    lease.timer = setTimeout(release, options.durationMs);
  }

  return {
    owner: lease.owner,
    get active() {
      return !lease.released;
    },
    release,
  };
};

export const releaseActionBattleControls = (
  entity: ActionBattleControlEntity,
  owner?: string
) => {
  const state = states.get(entity as object);
  if (!state) return;
  for (const lease of Array.from(state.leases.values())) {
    if (owner !== undefined && lease.owner !== owner) continue;
    lease.released = true;
    if (lease.timer) clearTimeout(lease.timer);
    state.leases.delete(lease.id);
  }
  apply(entity, state);
};

export const hasActionBattleControl = (
  entity: ActionBattleControlEntity,
  owner?: string
) => {
  const state = states.get(entity as object);
  if (!state) return false;
  return Array.from(state.leases.values()).some(
    (lease) => owner === undefined || lease.owner === owner
  );
};
