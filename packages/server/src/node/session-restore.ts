import type { RpgRoomStorage } from "./types";

/**
 * Where `@signe/room` keeps the session of each connection of a room: `session:<private id>`.
 * A session says which player (`publicId`) the connection plays, and whether it is connected.
 */
const SESSION_PREFIX = "session:";

interface StoredSession {
  publicId?: string;
  connected?: boolean;
  disconnectedAt?: number;
  [key: string]: unknown;
}

/** What `reconcileRestoredRoom` did, for the logs and for tests. */
export interface RestoredRoomReport {
  /** Private ids of the sessions that were still marked connected and started their reconnect window now. */
  readonly sessionsDisconnected: readonly string[];
  /** Public ids of the players that had no session at all and were discarded. */
  readonly playersDiscarded: readonly string[];
}

export interface ReconcileRestoredRoomOptions {
  /** Storage of the room being restored. */
  readonly storage: RpgRoomStorage;
  /**
   * The players the room restored, by public id: the object the room itself removes players from when a
   * session expires. Omit it for a room that has no players.
   */
  readonly players?: Record<string, unknown>;
  /** Clock, for tests. */
  readonly now?: () => number;
}

/**
 * Brings the sessions and the players of a room that was just restored from its storage in line with the
 * fact that, in a Node.js process that has just started, **nobody is connected**.
 *
 * Without this, the players of the connections that were open when the process stopped (a deploy, a
 * crash, a restart) are restored forever: their session is still marked connected, so it never gets a
 * `disconnectedAt`, so the garbage collector of sessions never finds it expired, and the player is never
 * removed. Each restart adds more of them, each with a physics body that is sent to every client, and the
 * tick of the map gets slower and slower.
 *
 * - A session still marked connected is marked disconnected as of now. It then follows the usual rule: the
 *   player can reconnect within the reconnect window and is the same player; after it, the session and the
 *   player are removed.
 * - A player with no session at all can never come back: it is discarded before it takes part in the physics
 *   or in the first synchronization of the room.
 *
 * Call it once, right after the room started and before any connection is accepted. A room whose connections
 * survive a restart (a hibernated Durable Object) must not call it.
 *
 * @param options - Storage and players of the restored room.
 * @returns What was changed.
 */
export async function reconcileRestoredRoom(options: ReconcileRestoredRoomOptions): Promise<RestoredRoomReport> {
  const now = (options.now ?? Date.now)();
  const sessions = await options.storage.list<StoredSession>({ prefix: SESSION_PREFIX });

  const updates: Record<string, StoredSession> = {};
  const sessionsDisconnected: string[] = [];
  const publicIds = new Set<string>();

  for (const [key, session] of sessions) {
    if (!session || typeof session !== "object") continue;
    if (typeof session.publicId === "string") publicIds.add(session.publicId);

    const stillConnected = session.connected !== false;
    // A disconnected session without a date would never expire either.
    if (stillConnected || typeof session.disconnectedAt !== "number") {
      updates[key] = { ...session, connected: false, disconnectedAt: now };
      sessionsDisconnected.push(key.slice(SESSION_PREFIX.length));
    }
  }

  if (Object.keys(updates).length > 0) await options.storage.put(updates);

  const playersDiscarded: string[] = [];
  if (options.players) {
    for (const publicId of Object.keys(options.players)) {
      if (publicIds.has(publicId)) continue;
      delete options.players[publicId];
      playersDiscarded.push(publicId);
    }
  }

  return { sessionsDisconnected, playersDiscarded };
}
