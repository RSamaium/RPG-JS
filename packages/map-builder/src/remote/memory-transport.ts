import type { AuthoritySession, MapAuthority } from "../authority/authority";
import type { ClientMessage, MapTransport, ServerMessage } from "../protocol";

export interface MemoryConnectionOptions {
  /** Who is acting for this connection. Handed to the pipelines. */
  readonly actor?: unknown;
  readonly id?: string;
  /** `"microtask"` (default) delivers like a network would, after the current code; `"sync"` at once. */
  readonly delivery?: "microtask" | "sync";
}

export interface MemoryConnection {
  readonly transport: MapTransport;
  readonly session: AuthoritySession;
  disconnect(): void;
}

let sessionCounter = 0;

/**
 * Connects a client to an authority in the same process, with no network: for tests, for
 * a demo, for a single-player game that still wants the rules of the authority.
 */
export function connectInMemory(authority: MapAuthority, options: MemoryConnectionOptions = {}): MemoryConnection {
  const listeners = new Set<(message: ServerMessage) => void>();
  const deliver = options.delivery ?? "microtask";
  const later = (run: () => void): void => (deliver === "sync" ? run() : queueMicrotask(run));
  let open = true;

  const session: AuthoritySession = {
    id: options.id ?? `memory-${(sessionCounter += 1)}`,
    actor: options.actor,
    send(message) {
      // Through JSON, as a network would: nothing is shared between the two sides.
      const copy = JSON.parse(JSON.stringify(message)) as ServerMessage;
      later(() => {
        if (open) for (const listener of [...listeners]) listener(copy);
      });
    },
  };

  const connection = authority.connect(session);
  return {
    session,
    transport: {
      send(message: ClientMessage) {
        if (!open) return;
        const copy = JSON.parse(JSON.stringify(message)) as unknown;
        later(() => {
          if (open) connection.receive(copy);
        });
      },
      onMessage(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    disconnect() {
      open = false;
      connection.disconnect();
      listeners.clear();
    },
  };
}
