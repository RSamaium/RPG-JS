import type { MapPatch } from "./patches";
import { chain, isThenable, type ApplyResult, type MaybePromise, type Unsubscribe } from "./result";

export interface HistoryStatus {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoDepth: number;
  readonly redoDepth: number;
}

export interface MapHistory<R extends MaybePromise<ApplyResult> = ApplyResult> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly status: HistoryStatus;
  /** Undoes the last action. Returns `null` when there is nothing to undo. */
  undo(): R | null;
  /** Redoes the last undone action. Returns `null` when there is nothing to redo. */
  redo(): R | null;
  /**
   * Runs `run`, and undoes everything it applied as one action. Synchronous on
   * purpose: with a remote committer, use a batch (`model.apply([...])`) instead.
   */
  group<T>(run: () => T): T;
  clear(): void;
  subscribe(listener: (status: HistoryStatus) => void): Unsubscribe;
}

export interface HistoryEntry {
  readonly patches: readonly MapPatch[];
  /** Patches that undo `patches`, already in the order they must be applied. */
  readonly inverse: readonly MapPatch[];
}

export interface HistoryOptions<R extends MaybePromise<ApplyResult>> {
  /** Maximum number of actions kept. `0` disables the history. */
  readonly limit: number;
  /** Sends patches through the committer without recording them. */
  readonly dispatch: (patches: readonly MapPatch[]) => R;
  readonly onListenerError?: (error: unknown) => void;
}

export interface HistoryController<R extends MaybePromise<ApplyResult>> {
  readonly history: MapHistory<R>;
  /** Called by the model after a local change was applied. */
  record(entry: HistoryEntry, coalesce?: string): void;
}

/** Patches are replayed later, against a different revision: drop the base revision they carried. */
const withoutRevision = (patches: readonly MapPatch[]): MapPatch[] =>
  patches.map(({ baseRevision: _baseRevision, ...rest }) => rest as MapPatch);

interface Slot extends HistoryEntry {
  readonly coalesce?: string;
}

export function createHistory<R extends MaybePromise<ApplyResult>>(options: HistoryOptions<R>): HistoryController<R> {
  const { limit, dispatch } = options;
  let undoStack: Slot[] = [];
  let redoStack: Slot[] = [];
  let group: { patches: MapPatch[]; inverse: MapPatch[] } | null = null;
  let busy = false;
  const listeners = new Set<(status: HistoryStatus) => void>();

  const status = (): HistoryStatus => ({
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoDepth: undoStack.length,
    redoDepth: redoStack.length,
  });

  const notify = (): void => {
    const snapshot = status();
    for (const listener of [...listeners]) {
      try {
        listener(snapshot);
      } catch (error) {
        (options.onListenerError ?? console.error)(error);
      }
    }
  };

  const push = (slot: Slot): void => {
    const top = undoStack[undoStack.length - 1];
    if (slot.coalesce !== undefined && top?.coalesce === slot.coalesce) {
      // One continuous edit (a drag, a slider): a single undo step.
      undoStack[undoStack.length - 1] = {
        coalesce: slot.coalesce,
        patches: [...top.patches, ...slot.patches],
        inverse: [...slot.inverse, ...top.inverse],
      };
    } else {
      undoStack.push(slot);
      if (undoStack.length > limit) undoStack = undoStack.slice(undoStack.length - limit);
    }
    redoStack = [];
  };

  const replay = (from: "undo" | "redo"): R | null => {
    const stack = from === "undo" ? undoStack : redoStack;
    const slot = stack[stack.length - 1];
    if (!slot || busy) return null;

    busy = true;
    const finish = (result: ApplyResult): ApplyResult => {
      busy = false;
      if (result.ok) {
        if (from === "undo") {
          undoStack = undoStack.filter((entry) => entry !== slot);
          redoStack = [...redoStack, { patches: slot.patches, inverse: slot.inverse }];
        } else {
          redoStack = redoStack.filter((entry) => entry !== slot);
          undoStack = [...undoStack, { patches: slot.patches, inverse: withoutRevision(result.inverse) }];
        }
        notify();
      }
      return result;
    };

    let result: MaybePromise<ApplyResult>;
    try {
      result = dispatch(from === "undo" ? slot.inverse : slot.patches);
    } catch (error) {
      busy = false;
      throw error;
    }
    if (isThenable(result)) {
      return result.then(finish, (error) => {
        busy = false;
        throw error;
      }) as R;
    }
    return chain(result, finish) as R;
  };

  const history: MapHistory<R> = {
    get canUndo() {
      return undoStack.length > 0;
    },
    get canRedo() {
      return redoStack.length > 0;
    },
    get status() {
      return status();
    },
    undo: () => replay("undo"),
    redo: () => replay("redo"),
    group<T>(run: () => T): T {
      if (group) return run();
      const open = { patches: [] as MapPatch[], inverse: [] as MapPatch[] };
      group = open;
      try {
        return run();
      } finally {
        group = null;
        if (open.patches.length > 0 && limit > 0) {
          push({ patches: open.patches, inverse: open.inverse });
          notify();
        }
      }
    },
    clear() {
      if (undoStack.length === 0 && redoStack.length === 0) return;
      undoStack = [];
      redoStack = [];
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    history,
    record(entry, coalesce) {
      if (limit <= 0) return;
      const patches = withoutRevision(entry.patches);
      if (group) {
        group.patches.push(...patches);
        group.inverse.unshift(...entry.inverse);
        return;
      }
      push({ patches, inverse: [...entry.inverse], ...(coalesce !== undefined ? { coalesce } : {}) });
      notify();
    },
  };
}
