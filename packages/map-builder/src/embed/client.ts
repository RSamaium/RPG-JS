import type { TargetRef } from "../interaction/picking";
import type { JsonValue } from "../model/json";
import type { MapModel } from "../model/model";
import type { PatchHandlers } from "../model/patches";
import type { ApplyResult, Unsubscribe } from "../model/result";
import type { ClientMessage, MapTransport, ServerMessage } from "../protocol";
import { joinRemoteMap, type RemoteMap } from "../remote";
import {
  EDITOR_PROTOCOL_VERSION,
  EDITOR_SOURCE,
  parseEnvelope,
  parseEvent,
  parseHandshake,
  type ControlMessage,
  type EditorEvent,
  type EditorTool,
  type MessageEventLike,
  type PortLike,
  type TargetLike,
  type WindowLike,
} from "./protocol";

export interface EditorMap {
  readonly id: string;
  /** The map as the game's authority has it. Trusted: raw patches, undo and redo are accepted. */
  readonly model: MapModel<Promise<ApplyResult>>;
}

export interface EditorInteraction {
  readonly modes: readonly string[];
  readonly tool: EditorTool;
  readonly rejection: { readonly reason: string; readonly message?: string } | null;
}

export interface ConnectEditorFrameOptions {
  /** The iframe that shows the game, or its window. */
  readonly frame: { readonly contentWindow: TargetLike | null } | TargetLike;
  /** Origin of the game, e.g. `"https://game.example.com"`. Nothing from another origin is believed. */
  readonly origin: string;
  /**
   * Where the game really runs, when it is not the window of the frame itself: a page that wraps the game in
   * another frame (a sandbox) gives the inner window, e.g. `(outer) => outer.frames[0]`. Messages are sent to it, and
   * only messages that come from it are believed.
   */
  readonly resolveWindow?: (frameWindow: TargetLike) => TargetLike | null | undefined;
  /** How long to wait for the game to answer. Defaults to 15000. */
  readonly timeoutMs?: number;
  readonly window?: WindowLike;
  /** Creates the channel. Defaults to `new MessageChannel()`. */
  readonly createChannel?: () => { port1: PortLike; port2: PortLike };
  /** Handlers of the patch types the game's features add (`terrainPatchHandlers`): the Studio's model must know them to apply what it is told. */
  readonly patchHandlers?: readonly PatchHandlers[];
  /** How long to wait for the first map, once connected. Passed to `joinRemoteMap`. */
  readonly mapTimeoutMs?: number;
  readonly onError?: (error: unknown) => void;
}

export interface EditorFrame {
  /** The map the game shows, once joined. */
  readonly map: EditorMap | undefined;
  /** Called with every map the game shows, now included if there is one. The model of a previous map stops being fed. */
  onMap(listener: (map: EditorMap) => void): Unsubscribe;
  readonly interaction: EditorInteraction | undefined;
  onInteraction(listener: (interaction: EditorInteraction) => void): Unsubscribe;
  readonly selection: readonly TargetRef[];
  onSelection(listener: (selection: readonly TargetRef[]) => void): Unsubscribe;
  readonly paused: boolean;
  onPaused(listener: (paused: boolean) => void): Unsubscribe;
  /** World position of the pointer in the game, for a status bar. */
  onPointer(listener: (point: { x: number; y: number }) => void): Unsubscribe;
  /** Problems the game reports (a tool that cannot start, a message it did not understand). */
  onGameError(listener: (message: string) => void): Unsubscribe;
  /** The last value of what the game keeps for the Studio (`tool`, `canUndo`…), by key. */
  readonly state: Readonly<Record<string, JsonValue>>;
  /** Called when the game changes a value, and with the ones it already had when a listener is added. */
  onState(key: string, listener: (value: JsonValue) => void): Unsubscribe;
  /** Asks the game to do something it registered: `frame.command("copy")`, `frame.command("place", { … })`. */
  command(name: string, args?: JsonValue): void;
  setModes(modes: readonly string[]): void;
  setTool(tool: EditorTool): void;
  select(targets: readonly TargetRef[]): void;
  pause(): void;
  resume(): void;
  camera(x: number, y: number): void;
  dispose(): void;
}

const listeners = <T>() => {
  const set = new Set<(value: T) => void>();
  return {
    add(listener: (value: T) => void): Unsubscribe {
      set.add(listener);
      return () => set.delete(listener);
    },
    emit(value: T, onError: (error: unknown) => void): void {
      for (const listener of [...set]) {
        try {
          listener(value);
        } catch (error) {
          onError(error);
        }
      }
    },
  };
};

/**
 * The Studio's end of the editor channels: finds the game in the frame, agrees on a private channel with it,
 * and gives back the map (a model that works like any other), the state of the tools, and commands.
 * Framework-neutral: wrap `onMap` and friends in Angular signals, or whatever the Studio uses.
 */
export async function connectEditorFrame(options: ConnectEditorFrameOptions): Promise<EditorFrame> {
  const win = options.window ?? (globalThis as unknown as { window?: WindowLike }).window;
  if (!win) throw new Error("connectEditorFrame needs a window");
  const report = options.onError ?? ((error: unknown) => console.error("[map-builder editor]", error));
  const target = (): TargetLike | null => {
    const frameWindow = "contentWindow" in options.frame ? options.frame.contentWindow : options.frame;
    if (!frameWindow || !options.resolveWindow) return frameWindow;
    try {
      return options.resolveWindow(frameWindow) ?? null;
    } catch {
      return null; // the inner frame is not there (yet)
    }
  };
  const makeChannel = options.createChannel ?? (() => new MessageChannel() as unknown as { port1: PortLike; port2: PortLike });

  let port: PortLike | undefined;
  let current: EditorMap | undefined;
  let interaction: EditorInteraction | undefined;
  let selection: readonly TargetRef[] = [];
  let paused = false;
  let disposed = false;
  let generation = 0;
  let mapListeners: Set<(message: ServerMessage) => void> | undefined;
  let activeId: string | undefined;

  const onMap = listeners<EditorMap>();
  const onInteraction = listeners<EditorInteraction>();
  const onSelection = listeners<readonly TargetRef[]>();
  const onPaused = listeners<boolean>();
  const onPointer = listeners<{ x: number; y: number }>();
  const onGameError = listeners<string>();
  const values = new Map<string, JsonValue>();
  const stateListeners = new Map<string, Set<(value: JsonValue) => void>>();

  const send = (envelope: unknown): void => {
    try {
      port?.postMessage(envelope);
    } catch (error) {
      report(error);
    }
  };
  const control = (message: ControlMessage): void => send({ ch: "control", message });

  let remote: RemoteMap | undefined;
  const joinMap = (id: string): void => {
    remote?.disconnect();
    remote = undefined;
    current = undefined;
    const token = ++generation;
    activeId = id;
    const mine = new Set<(message: ServerMessage) => void>();
    mapListeners = mine;
    const transport: MapTransport = {
      send: (message: ClientMessage) => send({ ch: "map", map: id, message }),
      onMessage(listener) {
        mine.add(listener);
        return () => mine.delete(listener);
      },
    };
    joinRemoteMap({
      transport,
      ...(options.mapTimeoutMs !== undefined ? { timeoutMs: options.mapTimeoutMs } : {}),
      ...(options.patchHandlers ? { model: { patchHandlers: options.patchHandlers } } : {}),
    }).then(
      (joined) => {
        if (token !== generation || disposed) return joined.disconnect();
        remote = joined;
        current = { id, model: joined.model };
        onMap.emit(current, report);
      },
      (error: unknown) => {
        if (token === generation) report(error);
      },
    );
  };

  const handleEvent = (event: EditorEvent): void => {
    switch (event.type) {
      case "map":
        return joinMap(event.id);
      case "selection":
        selection = event.targets;
        return onSelection.emit(selection, report);
      case "interaction":
        interaction = { modes: event.modes, tool: event.tool, rejection: event.rejection };
        return onInteraction.emit(interaction, report);
      case "paused":
        paused = event.paused;
        return onPaused.emit(paused, report);
      case "pointer":
        return onPointer.emit({ x: event.x, y: event.y }, report);
      case "state": {
        values.set(event.key, event.value);
        for (const listener of [...(stateListeners.get(event.key) ?? [])]) {
          try {
            listener(event.value);
          } catch (error) {
            report(error);
          }
        }
        return;
      }
      case "error":
        return onGameError.emit(event.message, report);
    }
  };

  const onPort = (event: { data: unknown }): void => {
    const envelope = parseEnvelope(event.data);
    if (!envelope) return;
    if (envelope.ch === "map") {
      // Only what belongs to the map we joined last: a late message of the previous one is dropped.
      if (envelope.map === activeId) {
        for (const listener of [...(mapListeners ?? [])]) listener(envelope.message as ServerMessage);
      }
    } else if (envelope.ch === "event") {
      const parsed = parseEvent(envelope.message);
      if (parsed) handleEvent(parsed);
    }
  };

  // Meet the game: say hello until it answers `ready`, then give it the port.
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const done = (error?: Error): void => {
      if (timer) clearInterval(timer);
      clearTimeout(deadline);
      win.removeEventListener("message", onWindow);
      if (error) reject(error);
      else resolve();
    };
    const onWindow = (event: MessageEventLike): void => {
      const frame = target();
      if (!frame || event.source !== frame || event.origin !== options.origin) return;
      const handshake = parseHandshake(event.data);
      if (handshake?.type !== "ready") return;
      if (handshake.version !== EDITOR_PROTOCOL_VERSION) {
        return done(new Error(`This game speaks editor protocol ${handshake.version}, the Studio speaks ${EDITOR_PROTOCOL_VERSION}: it was built with another version of the map builder`));
      }
      const { port1, port2 } = makeChannel();
      port = port1;
      port1.addEventListener("message", onPort);
      port1.start?.();
      frame.postMessage({ source: EDITOR_SOURCE, type: "connect", version: EDITOR_PROTOCOL_VERSION }, options.origin, [port2 as unknown as Transferable]);
      done();
    };
    const deadline = setTimeout(() => done(new Error("The game did not answer: is it running as an editor (createEditorHost), and is this its origin?")), options.timeoutMs ?? 15_000);
    win.addEventListener("message", onWindow);
    const hello = (): void => target()?.postMessage({ source: EDITOR_SOURCE, type: "hello", version: EDITOR_PROTOCOL_VERSION }, options.origin);
    hello();
    timer = setInterval(hello, 200);
  });

  return {
    get map() {
      return current;
    },
    onMap(listener) {
      const stop = onMap.add(listener);
      if (current) listener(current);
      return stop;
    },
    get interaction() {
      return interaction;
    },
    onInteraction: onInteraction.add,
    get selection() {
      return selection;
    },
    onSelection: onSelection.add,
    get paused() {
      return paused;
    },
    onPaused: onPaused.add,
    onPointer: onPointer.add,
    onGameError: onGameError.add,
    get state() {
      return Object.fromEntries(values);
    },
    onState(key, listener) {
      let set = stateListeners.get(key);
      if (!set) stateListeners.set(key, (set = new Set()));
      set.add(listener);
      if (values.has(key)) listener(values.get(key)!);
      return () => void set!.delete(listener);
    },
    command: (name, args) => control({ type: "command", name, ...(args !== undefined ? { args } : {}) }),
    setModes: (modes) => control({ type: "modes", modes }),
    setTool: (tool) => control({ type: "tool", ...tool }),
    select: (targets) => control({ type: "select", targets }),
    pause: () => control({ type: "pause", paused: true }),
    resume: () => control({ type: "pause", paused: false }),
    camera: (x, y) => control({ type: "camera", x, y }),
    dispose() {
      disposed = true;
      generation += 1;
      remote?.disconnect();
      port?.close();
      port = undefined;
    },
  };
}
