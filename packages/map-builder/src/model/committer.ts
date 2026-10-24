import type { MapDefinition, MapState } from "./definition";
import type { MapPatch } from "./patches";
import type { ApplyResult, MaybePromise } from "./result";

export type ChangeOrigin = "local" | "remote";

export interface IntegrateOptions {
  /**
   * `local` changes are recorded in the history. `remote` ones (broadcast by the
   * server, made by someone else) are not. Defaults to `local`.
   */
  readonly origin?: ChangeOrigin;
  /** Revision assigned by an authority. It must be exactly the next one. */
  readonly revision?: number;
  /** Set to `false` for undo / redo, which manage the history themselves. */
  readonly record?: boolean;
  /** Consecutive changes with the same key become one undo step. */
  readonly coalesce?: string;
}

/** What a committer can do to the model it is attached to. */
export interface CommitHost {
  readonly state: MapState;
  readonly revision: number;
  /** Validates and applies patches atomically, then notifies. This is the only way to change the model. */
  integrate(patches: readonly MapPatch[], options?: IntegrateOptions): ApplyResult;
  /**
   * Replaces the whole state, e.g. with a snapshot from the authority after a long
   * disconnection. The history is cleared, and listeners get a change with `reset: true`.
   */
  reset(definition: MapDefinition, revision: number): void;
}

export interface CommitRequest {
  readonly patches: readonly MapPatch[];
  readonly record: boolean;
  readonly coalesce?: string;
  /**
   * The intents the patches were resolved from, when there were some. A committer that
   * talks to an authority sends these instead of the patches: the client asks, the
   * authority decides.
   */
  readonly intents?: readonly unknown[];
}

/**
 * The only part that knows *where* an intention becomes a fact. The renderer and
 * the tools never know which committer is in use.
 *
 * `R` is the type `model.apply` returns: `ApplyResult` for a synchronous committer
 * (`localCommitter`), `Promise<ApplyResult>` for one that talks to a server.
 */
export interface MapCommitter<R extends MaybePromise<ApplyResult> = MaybePromise<ApplyResult>> {
  attach(host: CommitHost): void;
  commit(request: CommitRequest): R;
}

export interface LocalCommitterOptions {
  /**
   * Called after each successful change, in order, to save it (an API call, a file).
   * It never affects the result of `apply`: a failing save is reported to `onError`.
   */
  readonly persist?: (patches: readonly MapPatch[], revision: number) => void | Promise<void>;
  readonly onError?: (error: unknown) => void;
}

export interface LocalCommitter extends MapCommitter<ApplyResult> {
  /** Resolves once every pending `persist` call has settled. */
  flush(): Promise<void>;
}

/** Applies changes immediately, in the browser. The editor's committer. */
export function localCommitter(options: LocalCommitterOptions = {}): LocalCommitter {
  let host: CommitHost | undefined;
  let queue: Promise<void> = Promise.resolve();
  const report = options.onError ?? ((error: unknown) => console.error(error));

  return {
    attach(next) {
      if (host && host !== next) throw new Error("A committer can only be attached to one model");
      host = next;
    },
    commit(request) {
      if (!host) throw new Error("The committer is not attached to a model");
      const result = host.integrate(request.patches, {
        origin: "local",
        record: request.record,
        ...(request.coalesce !== undefined ? { coalesce: request.coalesce } : {}),
      });
      if (result.ok && options.persist) {
        const { patches, revision } = result;
        const persist = options.persist;
        queue = queue.then(async () => {
          try {
            await persist(patches, revision);
          } catch (error) {
            report(error);
          }
        });
      }
      return result;
    },
    flush: () => queue,
  };
}
