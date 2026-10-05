import type { AuthorityConnection, AuthoritySession } from "../authority/authority";
import type { TargetRef } from "../interaction/picking";
import type { ServerMessage } from "../protocol";
import {
  EDITOR_PROTOCOL_VERSION,
  EDITOR_SOURCE,
  parseControl,
  parseEnvelope,
  parseHandshake,
  type ControlMessage,
  type EditorEvent,
  type EditorTool,
  type MessageEventLike,
  type PortLike,
  type TargetLike,
  type WindowLike,
} from "./protocol";

/** The part of a map's authority the editor host needs. A `MapAuthority` fits. */
export interface EditorAuthorityLike {
  connect(session: AuthoritySession): AuthorityConnection;
}

/** The part of a map view the editor host drives. A `MapView` with the editing features fits. */
export interface EditorViewLike {
  readonly interaction: {
    readonly modes: readonly string[];
    setModes(modes: readonly string[]): void;
    readonly pointer: { readonly x: number; readonly y: number } | null;
    readonly state: {
      get(): { readonly selection: readonly TargetRef[]; readonly lastRejection: { readonly reason: string; readonly message?: string } | null };
      subscribe(listener: () => void): () => void;
    };
  };
  readonly selection?: { select(targets: readonly TargetRef[]): void; clear(): void };
  readonly placement?: { start(id: string): void; cancel(): void };
  readonly terrain?: { readonly brush?: { start(options: { material: string | null; radius: number }): void; stop(): void } };
}

export interface EditorHostOptions {
  /**
   * Origins that may embed this game as an editor, e.g. `["https://studio.rpgjs.dev"]`. `"*"` lets any page do it:
   * for development only. An empty list lets nobody.
   */
  readonly allowedOrigins: readonly string[];
  /** The authority of the map the player is on. Read each time the map changes (`notifyMap`). */
  readonly authority: () => { readonly id: string; readonly authority: EditorAuthorityLike } | undefined;
  /** The view of that map, when there is one. */
  readonly view?: () => EditorViewLike | undefined;
  /** Pauses or resumes the game (server loop and client display). */
  readonly setPaused?: (paused: boolean) => void;
  /** Moves the camera to a world position. */
  readonly camera?: (x: number, y: number) => void;
  /** Who the Studio acts as in the pipelines. The authority must trust it for raw patches (`trustPatches`). Defaults to `{ editor: true }`. */
  readonly actor?: unknown;
  readonly window?: WindowLike & { readonly parent?: TargetLike; readonly location?: { readonly ancestorOrigins?: { readonly [index: number]: string | undefined; readonly length?: number } } };
  /**
   * Origin of the page that embeds the game, when the browser says (`location.ancestorOrigins`). Announcing only
   * to it keeps the console clean; without it the game announces to every allowed origin.
   */
  readonly parentOrigin?: () => string | undefined;
  /**
   * The window the Studio is in, when it is not the direct parent: a game that runs in a sandbox frame inside a
   * wrapper page talks to the top window. Defaults to the parent.
   */
  readonly parent?: TargetLike;
  /** How often the pointer position is reported, in milliseconds. Defaults to 100. 0 turns it off. */
  readonly pointerEveryMs?: number;
  readonly onError?: (error: unknown) => void;
}

export interface EditorHost {
  /** Whether a Studio is connected. */
  readonly connected: boolean;
  /** The player is on another map, or the view of this one now exists: bind to them. */
  notifyMap(): void;
  dispose(): void;
}

const DEFAULT_ACTOR = Object.freeze({ editor: true });

/**
 * The game's end of the editor channels. It lets a Studio that is allowed to (origin checked) join the authority of
 * the map the player is on as a trusted session, drive the tools of the view, and pause the game.
 * Create it only when the game runs as an editor (`?editor`, or in a build the Studio makes): a player never has one.
 */
export function createEditorHost(options: EditorHostOptions): EditorHost {
  const win = options.window ?? (globalThis as unknown as { window?: EditorHostOptions["window"] }).window;
  const parent = options.parent ?? win?.parent;
  if (!win || !parent) throw new Error("createEditorHost needs a window and a parent to talk to");
  const report = options.onError ?? ((error: unknown) => console.error("[map-builder editor]", error));
  const allowed = (origin: string): boolean => options.allowedOrigins.includes("*") || options.allowedOrigins.includes(origin);

  let port: PortLike | undefined;
  let connection: AuthorityConnection | undefined;
  let mapId: string | undefined;
  let stopView: (() => void) | undefined;
  let paused = false;
  let tool: EditorTool = { tool: "none" };
  let pointerTimer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;

  const post = (message: unknown): void => {
    try {
      port?.postMessage(message);
    } catch (error) {
      report(error);
    }
  };
  const emit = (event: EditorEvent): void => post({ ch: "event", message: event });

  const announce = (): void => {
    const known = (options.parentOrigin ?? (() => {
      // The first ancestor that is allowed: the wrapper page of a sandbox is not, the Studio above it is.
      const ancestors = win.location?.ancestorOrigins;
      for (let i = 0; ancestors && i < (ancestors.length ?? 0); i += 1) {
        const origin = ancestors[i];
        if (origin && allowed(origin)) return origin;
      }
      return undefined;
    }))();
    const targets = known && allowed(known) ? [known] : [...options.allowedOrigins];
    for (const origin of targets) {
      try {
        parent.postMessage({ source: EDITOR_SOURCE, type: "ready", version: EDITOR_PROTOCOL_VERSION }, origin);
      } catch (error) {
        report(error);
      }
    }
  };

  const view = (): EditorViewLike | undefined => options.view?.();

  const interactionEvent = (v: EditorViewLike): EditorEvent => {
    const rejection = v.interaction.state.get().lastRejection;
    return { type: "interaction", modes: [...v.interaction.modes], tool, rejection: rejection ? { reason: rejection.reason, ...(rejection.message ? { message: rejection.message } : {}) } : null };
  };

  const unbind = (): void => {
    stopView?.();
    stopView = undefined;
    connection?.disconnect();
    connection = undefined;
    mapId = undefined;
  };

  /** Joins the authority of the map the player is on, and follows its view. */
  const bind = (): void => {
    unbind();
    if (!port) return;
    const found = options.authority();
    if (!found) return;
    mapId = found.id;
    const id = found.id;
    // Said first, so that the Studio is ready for the snapshot the authority sends as soon as it is connected.
    emit({ type: "map", id });
    connection = found.authority.connect({
      id: "studio",
      actor: options.actor ?? DEFAULT_ACTOR,
      send: (message) => post({ ch: "map", map: id, message: message as ServerMessage }),
    });
    const v = view();
    if (!v) return;
    let lastSelection = "";
    const push = (): void => {
      const selection = v.interaction.state.get().selection;
      const key = selection.map((target) => `${target.type}:${target.id}`).join("|");
      if (key !== lastSelection) {
        lastSelection = key;
        emit({ type: "selection", targets: selection.map((target) => ({ type: target.type, id: target.id })) });
      }
      emit(interactionEvent(v));
    };
    const stop = v.interaction.state.subscribe(push);
    stopView = stop;
    push();
  };

  const control = (message: ControlMessage): void => {
    const v = view();
    switch (message.type) {
      case "pause":
        paused = message.paused;
        options.setPaused?.(paused);
        emit({ type: "paused", paused });
        return;
      case "camera":
        options.camera?.(message.x, message.y);
        return;
      default:
        break;
    }
    if (!v) return emit({ type: "error", message: "No map is shown yet" });
    try {
      if (message.type === "modes") {
        v.interaction.setModes(message.modes);
      } else if (message.type === "select") {
        if (!v.selection) return emit({ type: "error", message: "This game has no selection" });
        if (message.targets.length === 0) v.selection.clear();
        else v.selection.select(message.targets);
      } else if (message.type === "tool") {
        // One tool at a time: whatever was in hand is put away.
        v.terrain?.brush?.stop();
        v.placement?.cancel();
        if (message.tool === "brush") {
          if (!v.terrain?.brush) return emit({ type: "error", message: "This map has no terrain to paint" });
          v.terrain.brush.start({ material: message.material, radius: message.radius });
        } else if (message.tool === "place") {
          if (!v.placement) return emit({ type: "error", message: "This game has nothing to place" });
          v.placement.start(message.catalogId);
        }
        const { type: _type, ...next } = message;
        tool = next as EditorTool;
      }
      emit(interactionEvent(v));
    } catch (error) {
      emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };

  const onPort = (event: { data: unknown }): void => {
    const envelope = parseEnvelope(event.data);
    if (!envelope) return;
    if (envelope.ch === "map") {
      if (envelope.map === mapId) connection?.receive(envelope.message);
    } else if (envelope.ch === "control") {
      const parsed = parseControl(envelope.message);
      if (parsed) control(parsed);
      else emit({ type: "error", message: "Unknown or invalid control message" });
    }
  };

  const connect = (next: PortLike): void => {
    unbind();
    port?.close();
    port = next;
    port.addEventListener("message", onPort);
    port.start?.();
    bind();
    if (pointerTimer) clearInterval(pointerTimer);
    if ((options.pointerEveryMs ?? 100) > 0) {
      let last = "";
      pointerTimer = setInterval(() => {
        const pointer = view()?.interaction.pointer;
        if (!pointer) return;
        const key = `${Math.round(pointer.x)},${Math.round(pointer.y)}`;
        if (key === last) return;
        last = key;
        emit({ type: "pointer", x: Math.round(pointer.x), y: Math.round(pointer.y) });
      }, options.pointerEveryMs ?? 100);
    }
  };

  const onWindow = (event: MessageEventLike): void => {
    if (disposed) return;
    // Only the page that embeds us, and only if it is allowed to.
    if (event.source !== parent || !allowed(event.origin)) return;
    const handshake = parseHandshake(event.data);
    if (!handshake) return;
    if (handshake.type === "hello") return announce();
    if (handshake.type !== "connect") return;
    if (handshake.version !== EDITOR_PROTOCOL_VERSION) {
      report(new Error(`The Studio speaks editor protocol ${handshake.version}, this game speaks ${EDITOR_PROTOCOL_VERSION}`));
      return;
    }
    const given = event.ports?.[0];
    if (given) connect(given);
  };

  win.addEventListener("message", onWindow);
  announce();

  return {
    get connected() {
      return port !== undefined;
    },
    notifyMap: () => {
      if (port && !disposed) bind();
    },
    dispose() {
      disposed = true;
      win.removeEventListener("message", onWindow);
      if (pointerTimer) clearInterval(pointerTimer);
      unbind();
      port?.close();
      port = undefined;
    },
  };
}
