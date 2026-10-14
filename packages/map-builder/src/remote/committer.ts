import type { CommitHost, CommitRequest, MapCommitter } from "../model/committer";
import type { ApplyResult } from "../model/result";
import { parseServerMessage, type ClientMessage, type MapTransport, type ServerMessage } from "../protocol";

export interface RemoteCommitterOptions {
  readonly transport: MapTransport;
  /** How long to wait for the authority before giving up on a request. Defaults to 10000. */
  readonly timeoutMs?: number;
  readonly onError?: (error: unknown) => void;
  /** Replaces `setTimeout`, so tests control time. Returns the function that cancels it. */
  readonly schedule?: (run: () => void, delayMs: number) => () => void;
}

export interface RemoteEffect {
  readonly target: Extract<ServerMessage, { type: "effect" }>["target"];
  readonly name: string;
  readonly params?: Readonly<Record<string, unknown>> | undefined;
}

export interface RemoteCommitter extends MapCommitter<Promise<ApplyResult>> {
  /** Called when the authority shows an effect (a shake, a blink) to everybody. */
  onEffect(listener: (effect: RemoteEffect) => void): () => void;
  /**
   * The map the authority sends first. Messages that arrive while the model does not exist
   * yet are kept, and replayed once it is attached.
   */
  nextSnapshot(timeoutMs?: number): Promise<Extract<ServerMessage, { type: "snapshot" }>>;
  /** Stops listening. Requests still waiting end with the code `disconnected`. */
  disconnect(): void;
}

interface Pending {
  readonly record: boolean;
  readonly coalesce: string | undefined;
  readonly settle: (result: ApplyResult) => void;
  readonly cancelTimeout: () => void;
}

const failure = (code: string, message: string, patchIndex?: number): ApplyResult => ({
  ok: false,
  rejection: { code, message, ...(patchIndex !== undefined ? { patchIndex } : {}) },
});

let requestCounter = 0;
const newRequestId = (): string => {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `r${Date.now().toString(36)}-${(requestCounter += 1).toString(36)}`;
};

/**
 * A committer that does not decide anything: it asks the authority and waits. The change
 * becomes true when the authority says so, for everybody at once, in the same order.
 *
 * - Intents are sent as they are. Patches are only sent when there are no intents (an undo),
 *   and the authority refuses them unless it trusts this client.
 * - Changes come back as `patches` messages. Those that answer a request of ours are
 *   recorded in the history; the others, made by someone else, are not.
 * - A hole in the revisions, or a change that does not fit, makes it ask to catch up.
 */
export function remoteCommitter(options: RemoteCommitterOptions): RemoteCommitter {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const reportError = options.onError ?? ((error: unknown) => console.error(error));
  const schedule =
    options.schedule ??
    ((run: () => void, delayMs: number) => {
      const handle = setTimeout(run, delayMs);
      return () => clearTimeout(handle);
    });

  let host: CommitHost | undefined;
  let disconnected = false;
  let waitingForSync = false;
  let cancelSyncTimeout: (() => void) | undefined;
  const queue: ServerMessage[] = [];
  let snapshotWaiter: ((message: Extract<ServerMessage, { type: "snapshot" }>) => void) | undefined;
  const pending = new Map<string, Pending>();
  const effectListeners = new Set<(effect: RemoteEffect) => void>();

  const send = (message: ClientMessage): boolean => {
    try {
      options.transport.send(message);
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  };

  const syncDone = (): void => {
    waitingForSync = false;
    cancelSyncTimeout?.();
    cancelSyncTimeout = undefined;
  };

  /** Asks the authority to catch us up. Asks again after a while if nothing came back. */
  const requestSync = (full = false): void => {
    if (waitingForSync || disconnected) return;
    waitingForSync = true;
    send(full || !host ? { type: "sync" } : { type: "sync", since: host.revision });
    cancelSyncTimeout = schedule(() => {
      waitingForSync = false;
      cancelSyncTimeout = undefined;
    }, timeoutMs);
  };

  const settle = (id: string, result: ApplyResult): void => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    request.cancelTimeout();
    request.settle(result);
  };

  const handle = (message: ServerMessage): void => {
    if (disconnected) return;
    switch (message.type) {
      case "effect":
        for (const listener of [...effectListeners]) {
          try {
            listener({ target: message.target, name: message.name, params: message.params });
          } catch (error) {
            reportError(error);
          }
        }
        return;
      case "rejected":
        settle(message.id, failure(message.reason, message.message, message.patchIndex));
        return;
      case "synced":
        syncDone();
        return;
      case "snapshot":
        if (!host) {
          if (snapshotWaiter) {
            const waiter = snapshotWaiter;
            snapshotWaiter = undefined;
            waiter(message);
          } else queue.push(message);
          return;
        }
        syncDone();
        // The same revision is the same map: no need to rebuild everything for a repeated snapshot.
        if (message.revision !== host.revision) host.reset(message.definition, message.revision);
        return;
      case "patches": {
        if (!host) {
          queue.push(message);
          return;
        }
        // The authority applied one of our requests: it is done even if we cannot integrate it here
        // (we caught up past it, or we are catching up), so the caller must not wait for a timeout.
        const answered = (): void => {
          if (message.requestId !== undefined) settle(message.requestId, { ok: true, revision: message.revision, patches: message.patches, inverse: [] });
        };
        // Already known: a repeat, or a change we got while catching up.
        if (message.revision <= host.revision) return answered();
        if (message.revision !== host.revision + 1) {
          answered();
          return requestSync();
        }

        const mine = message.requestId !== undefined ? pending.get(message.requestId) : undefined;
        const result = host.integrate(message.patches, {
          origin: mine ? "local" : "remote",
          revision: message.revision,
          ...(mine ? { record: mine.record, ...(mine.coalesce !== undefined ? { coalesce: mine.coalesce } : {}) } : {}),
        });
        if (message.requestId !== undefined) settle(message.requestId, result);
        // A change that does not fit means we drifted: start again from the map.
        if (!result.ok) requestSync(true);
        else syncDone();
        return;
      }
    }
  };

  // Listening starts now, not when the model exists: nothing the authority says may be lost.
  // Whatever comes from the wire is checked first: a client never acts on garbage.
  const stop = options.transport.onMessage((raw) => {
    const message = parseServerMessage(raw);
    if (message) handle(message);
  });

  return {
    attach(next) {
      if (host && host !== next) throw new Error("A committer can only be attached to one model");
      host = next;
      // What arrived before the model existed, in order.
      for (const message of queue.splice(0)) handle(message);
    },
    nextSnapshot(waitMs = timeoutMs) {
      return new Promise((resolve, reject) => {
        const index = queue.findIndex((message) => message.type === "snapshot");
        if (index >= 0) return resolve(queue.splice(index, 1)[0] as never);
        const cancel = schedule(() => {
          snapshotWaiter = undefined;
          reject(new Error("The authority did not send the map"));
        }, waitMs);
        snapshotWaiter = (message) => {
          cancel();
          resolve(message);
        };
      });
    },
    commit(request: CommitRequest) {
      if (disconnected) return Promise.resolve(failure("disconnected", "The connection to the authority is closed"));
      const id = newRequestId();
      const message: ClientMessage =
        request.intents && request.intents.length > 0
          ? { type: "intent", id, intents: request.intents as never }
          : { type: "patches", id, patches: request.patches };

      return new Promise<ApplyResult>((resolve) => {
        const cancelTimeout = schedule(() => {
          if (pending.delete(id)) resolve(failure("timeout", "The authority did not answer"));
        }, timeoutMs);
        pending.set(id, { record: request.record, coalesce: request.coalesce, settle: resolve, cancelTimeout });
        if (!send(message)) settle(id, failure("transport-error", "The message could not be sent"));
      });
    },
    onEffect(listener) {
      effectListeners.add(listener);
      return () => effectListeners.delete(listener);
    },
    disconnect() {
      if (disconnected) return;
      disconnected = true;
      stop();
      syncDone();
      for (const id of [...pending.keys()]) settle(id, failure("disconnected", "The connection to the authority is closed"));
      effectListeners.clear();
    },
  };
}
