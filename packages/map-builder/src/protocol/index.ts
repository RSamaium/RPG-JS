import type { MapDefinition } from "../model/definition";
import { isJsonValue, isPlainObject } from "../model/json";
import type { MapPatch } from "../model/patches";
import type { MapIntent } from "../interaction/intents";

/**
 * Messages between a map client and the authority of that map. They are plain JSON, so
 * any transport carries them: a WebSocket, an RPGJS socket event, a Worker message.
 *
 * The client asks (`intent`), the authority decides and tells everybody (`patches`).
 * A client never sends patches unless the authority trusts it.
 */
export const MAP_BUILDER_EVENT = "map-builder";

export type ClientMessage =
  /** Join, or catch up. `since` is the last revision the client has. */
  | { readonly type: "sync"; readonly since?: number }
  /** Ask for something to happen. `id` comes back in the answer. */
  | { readonly type: "intent"; readonly id: string; readonly intents: readonly MapIntent[] }
  /** Ask for patches to be applied as they are. Only for clients the authority trusts (an editor, an undo). */
  | { readonly type: "patches"; readonly id: string; readonly patches: readonly MapPatch[] };

export type ServerMessage =
  /** The whole map, at a revision: to join, or when the client is too far behind. */
  | { readonly type: "snapshot"; readonly revision: number; readonly definition: MapDefinition }
  /** A change that became true. `requestId` is set for the client that asked for it. */
  | {
      readonly type: "patches";
      readonly revision: number;
      readonly patches: readonly MapPatch[];
      readonly requestId?: string;
      /** Who made the change, when the authority knows and wants to say. */
      readonly author?: string;
    }
  /** The authority said no, and why. */
  | { readonly type: "rejected"; readonly id: string; readonly reason: string; readonly message: string; readonly patchIndex?: number }
  /** The client is up to date: nothing to send. */
  | { readonly type: "synced"; readonly revision: number }
  /** A short visual effect: it is shown, not kept. */
  | { readonly type: "effect"; readonly target: EffectTargetMessage; readonly name: string; readonly params?: Readonly<Record<string, unknown>> };

export type EffectTargetMessage = string | { readonly type: "element" | "event"; readonly id: string };

/** What an authority refuses to read, to keep a client from making it work too hard. */
export const PROTOCOL_LIMITS = {
  /** Intents in one request. */
  maxIntents: 64,
  /** Patches in one trusted request. */
  maxPatches: 256,
  /** Length of a request id. */
  maxIdLength: 64,
} as const;

const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= PROTOCOL_LIMITS.maxIdLength;

const isObjectWithType = (value: unknown): boolean => isPlainObject(value) && typeof value.type === "string" && isJsonValue(value);

/**
 * Reads a message that came from the network. Anything that does not have exactly
 * the expected shape is `undefined`: never trust a client, nor assume a message is one.
 */
export function parseClientMessage(raw: unknown): ClientMessage | undefined {
  if (!isPlainObject(raw) || typeof raw.type !== "string") return undefined;
  switch (raw.type) {
    case "sync":
      if (raw.since !== undefined && !(Number.isInteger(raw.since) && (raw.since as number) >= 0)) return undefined;
      return raw.since === undefined ? { type: "sync" } : { type: "sync", since: raw.since as number };
    case "intent":
      if (!isId(raw.id) || !Array.isArray(raw.intents)) return undefined;
      if (raw.intents.length === 0 || raw.intents.length > PROTOCOL_LIMITS.maxIntents) return undefined;
      if (!raw.intents.every(isObjectWithType)) return undefined;
      return { type: "intent", id: raw.id, intents: raw.intents as MapIntent[] };
    case "patches":
      if (!isId(raw.id) || !Array.isArray(raw.patches)) return undefined;
      if (raw.patches.length === 0 || raw.patches.length > PROTOCOL_LIMITS.maxPatches) return undefined;
      if (!raw.patches.every(isObjectWithType)) return undefined;
      return { type: "patches", id: raw.id, patches: raw.patches as MapPatch[] };
    default:
      return undefined;
  }
}

/** Reads a message the authority sent. A client must not crash on garbage either. */
export function parseServerMessage(raw: unknown): ServerMessage | undefined {
  if (!isPlainObject(raw) || typeof raw.type !== "string") return undefined;
  const revision = raw.revision;
  const hasRevision = Number.isInteger(revision) && (revision as number) >= 0;
  switch (raw.type) {
    case "snapshot":
      return hasRevision && isPlainObject(raw.definition) && isJsonValue(raw.definition)
        ? { type: "snapshot", revision: revision as number, definition: raw.definition as unknown as MapDefinition }
        : undefined;
    case "patches":
      if (!hasRevision || !Array.isArray(raw.patches) || !raw.patches.every(isObjectWithType)) return undefined;
      if (raw.requestId !== undefined && typeof raw.requestId !== "string") return undefined;
      if (raw.author !== undefined && typeof raw.author !== "string") return undefined;
      return {
        type: "patches",
        revision: revision as number,
        patches: raw.patches as MapPatch[],
        ...(raw.requestId !== undefined ? { requestId: raw.requestId as string } : {}),
        ...(raw.author !== undefined ? { author: raw.author as string } : {}),
      };
    case "rejected":
      return typeof raw.id === "string" && typeof raw.reason === "string" && typeof raw.message === "string"
        ? {
            type: "rejected",
            id: raw.id,
            reason: raw.reason,
            message: raw.message,
            ...(Number.isInteger(raw.patchIndex) ? { patchIndex: raw.patchIndex as number } : {}),
          }
        : undefined;
    case "synced":
      return hasRevision ? { type: "synced", revision: revision as number } : undefined;
    case "effect": {
      const target = raw.target;
      const validTarget =
        typeof target === "string" ||
        (isPlainObject(target) && (target.type === "element" || target.type === "event") && typeof target.id === "string");
      if (!validTarget || typeof raw.name !== "string") return undefined;
      if (raw.params !== undefined && !(isPlainObject(raw.params) && isJsonValue(raw.params))) return undefined;
      return {
        type: "effect",
        target: target as EffectTargetMessage,
        name: raw.name,
        ...(raw.params !== undefined ? { params: raw.params as Record<string, unknown> } : {}),
      };
    }
    default:
      return undefined;
  }
}

/** A way to carry messages, whatever the framework: both ends of a connection implement it. */
export interface MapTransport {
  send(message: ClientMessage): void;
  /** Called for every message from the authority. Returns the function that stops listening. */
  onMessage(listener: (message: ServerMessage) => void): () => void;
}
