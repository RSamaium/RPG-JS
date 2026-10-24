import { isPlainObject, isJsonValue, type JsonValue } from "../model/json";
import type { TargetRef } from "../interaction/picking";

/** Version of the messages between the Studio and a game. Both ends say theirs in the handshake. */
export const EDITOR_PROTOCOL_VERSION = 1 as const;

/** Marks the window messages of the handshake, so that the page ignores everybody else's. */
export const EDITOR_SOURCE = "rpgjs-map-builder-editor" as const;

/** The tool that is in hand. */
export type EditorTool =
  | { readonly tool: "none" }
  | { readonly tool: "brush"; readonly material: string | null; readonly radius: number }
  | { readonly tool: "place"; readonly catalogId: string };

/** What the Studio asks of the game. */
export type ControlMessage =
  | { readonly type: "modes"; readonly modes: readonly string[] }
  | ({ readonly type: "tool" } & EditorTool)
  | { readonly type: "select"; readonly targets: readonly TargetRef[] }
  | { readonly type: "pause"; readonly paused: boolean }
  | { readonly type: "camera"; readonly x: number; readonly y: number }
  /** Something only the game knows how to do: a command it registered (`copy`, `place`…). */
  | { readonly type: "command"; readonly name: string; readonly args?: JsonValue };

/** What the game tells the Studio. */
export type EditorEvent =
  | { readonly type: "map"; readonly id: string }
  | { readonly type: "selection"; readonly targets: readonly TargetRef[] }
  | {
      readonly type: "interaction";
      readonly modes: readonly string[];
      readonly tool: EditorTool;
      /** Why the last intent was refused, until another is accepted. */
      readonly rejection: { readonly reason: string; readonly message?: string } | null;
    }
  | { readonly type: "paused"; readonly paused: boolean }
  | { readonly type: "pointer"; readonly x: number; readonly y: number }
  /** A value the game keeps and the Studio shows (`tool`, `canUndo`, `layer`…). */
  | { readonly type: "state"; readonly key: string; readonly value: JsonValue }
  | { readonly type: "error"; readonly message: string };

/** Messages of the handshake, sent with `window.postMessage`. */
export type HandshakeMessage =
  | { readonly source: typeof EDITOR_SOURCE; readonly type: "hello"; readonly version: number }
  | { readonly source: typeof EDITOR_SOURCE; readonly type: "ready"; readonly version: number }
  | { readonly source: typeof EDITOR_SOURCE; readonly type: "connect"; readonly version: number };

export const LIMITS = {
  /** Targets in one selection. */
  maxTargets: 10_000,
  maxModes: 16,
  maxStringLength: 256,
} as const;

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= LIMITS.maxStringLength;
const isFinite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseTargets(raw: unknown): TargetRef[] | undefined {
  if (!Array.isArray(raw) || raw.length > LIMITS.maxTargets) return undefined;
  const out: TargetRef[] = [];
  for (const item of raw) {
    if (!isPlainObject(item) || (item.type !== "element" && item.type !== "event") || !isString(item.id)) return undefined;
    out.push({ type: item.type, id: item.id });
  }
  return out;
}

/** Reads a control message that came through the port. Anything with another shape is `undefined`. */
export function parseControl(raw: unknown): ControlMessage | undefined {
  if (!isPlainObject(raw)) return undefined;
  switch (raw.type) {
    case "modes":
      return Array.isArray(raw.modes) && raw.modes.length <= LIMITS.maxModes && raw.modes.every(isString) ? { type: "modes", modes: raw.modes as string[] } : undefined;
    case "tool":
      if (raw.tool === "none") return { type: "tool", tool: "none" };
      if (raw.tool === "brush") {
        if (!(raw.material === null || isString(raw.material)) || !isFinite(raw.radius) || raw.radius <= 0 || raw.radius > 10_000) return undefined;
        return { type: "tool", tool: "brush", material: raw.material, radius: raw.radius };
      }
      return raw.tool === "place" && isString(raw.catalogId) ? { type: "tool", tool: "place", catalogId: raw.catalogId } : undefined;
    case "select": {
      const targets = parseTargets(raw.targets);
      return targets ? { type: "select", targets } : undefined;
    }
    case "pause":
      return typeof raw.paused === "boolean" ? { type: "pause", paused: raw.paused } : undefined;
    case "camera":
      return isFinite(raw.x) && isFinite(raw.y) ? { type: "camera", x: raw.x, y: raw.y } : undefined;
    case "command":
      if (!isString(raw.name) || !/^[a-zA-Z][\w.:-]*$/.test(raw.name)) return undefined;
      if (raw.args !== undefined && !isJsonValue(raw.args)) return undefined;
      return { type: "command", name: raw.name, ...(raw.args !== undefined ? { args: raw.args as JsonValue } : {}) };
    default:
      return undefined;
  }
}

const parseTool = (raw: unknown): EditorTool | undefined => {
  const parsed = parseControl({ type: "tool", ...(isPlainObject(raw) ? raw : {}) });
  return parsed?.type === "tool" ? (({ type: _type, ...tool }) => tool as EditorTool)(parsed) : undefined;
};

/** Reads an event from the game. */
export function parseEvent(raw: unknown): EditorEvent | undefined {
  if (!isPlainObject(raw)) return undefined;
  switch (raw.type) {
    case "map":
      return isString(raw.id) ? { type: "map", id: raw.id } : undefined;
    case "selection": {
      const targets = parseTargets(raw.targets);
      return targets ? { type: "selection", targets } : undefined;
    }
    case "interaction": {
      const tool = parseTool(raw.tool);
      if (!tool || !Array.isArray(raw.modes) || !raw.modes.every(isString)) return undefined;
      const rejection = isPlainObject(raw.rejection) && typeof raw.rejection.reason === "string"
        ? { reason: raw.rejection.reason, ...(typeof raw.rejection.message === "string" ? { message: raw.rejection.message } : {}) }
        : null;
      return { type: "interaction", modes: raw.modes as string[], tool, rejection };
    }
    case "paused":
      return typeof raw.paused === "boolean" ? { type: "paused", paused: raw.paused } : undefined;
    case "pointer":
      return isFinite(raw.x) && isFinite(raw.y) ? { type: "pointer", x: raw.x, y: raw.y } : undefined;
    case "state":
      return isString(raw.key) && raw.value !== undefined && isJsonValue(raw.value) ? { type: "state", key: raw.key, value: raw.value as JsonValue } : undefined;
    case "error":
      return typeof raw.message === "string" ? { type: "error", message: raw.message.slice(0, 1000) } : undefined;
    default:
      return undefined;
  }
}

export function parseHandshake(raw: unknown): HandshakeMessage | undefined {
  if (!isPlainObject(raw) || raw.source !== EDITOR_SOURCE || !isFinite(raw.version)) return undefined;
  return raw.type === "hello" || raw.type === "ready" || raw.type === "connect" ? { source: EDITOR_SOURCE, type: raw.type, version: raw.version } : undefined;
}

/** What goes through the port. The map channel carries the authority protocol, tagged with the map. */
export type Envelope =
  | { readonly ch: "map"; readonly map: string; readonly message: unknown }
  | { readonly ch: "control"; readonly message: unknown }
  | { readonly ch: "event"; readonly message: unknown };

export function parseEnvelope(raw: unknown): Envelope | undefined {
  if (!isPlainObject(raw) || !isJsonValue(raw)) return undefined;
  if (raw.ch === "map") return isString(raw.map) ? { ch: "map", map: raw.map, message: raw.message } : undefined;
  if (raw.ch === "control" || raw.ch === "event") return { ch: raw.ch, message: raw.message };
  return undefined;
}

/** What a `MessagePort` offers, so that tests and other carriers can stand in. */
export interface PortLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  start?(): void;
  close(): void;
}

/** What a window offers to listen to messages. */
export interface WindowLike {
  addEventListener(type: "message", listener: (event: MessageEventLike) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEventLike) => void): void;
}

export interface MessageEventLike {
  readonly data: unknown;
  readonly origin: string;
  readonly source: unknown;
  readonly ports?: readonly PortLike[];
}

/** Something a message can be posted to: a frame's window, or `window.parent`. */
export interface TargetLike {
  postMessage(message: unknown, targetOrigin: string, transfer?: Transferable[]): void;
}
