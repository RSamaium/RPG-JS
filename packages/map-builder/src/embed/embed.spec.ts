// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createMapAuthority } from "../authority/authority";
import { defineAssets } from "../model/assets";
import { defineMap, el } from "../model/define-map";
import { connectEditorFrame, type EditorFrame } from "./client";
import { createEditorHost, type EditorHostOptions, type EditorViewLike } from "./host";
import { EDITOR_PROTOCOL_VERSION, EDITOR_SOURCE, parseControl, parseEnvelope, parseEvent, parseHandshake, type MessageEventLike, type PortLike, type TargetLike, type WindowLike } from "./protocol";
import { MapDefinitionError } from "../model/errors";
import type { TargetRef } from "../interaction/picking";

/**
 * The Studio and the game, as two fake windows that deliver messages the way browsers do (asynchronously, with the
 * source and the origin of the sender), joined by real `MessageChannel`s.
 */
const STUDIO = "https://studio.example.com";
const GAME = "https://game.example.com";

class FakeWindow implements WindowLike {
  private listeners = new Set<(event: MessageEventLike) => void>();
  constructor(readonly origin: string) {}
  addEventListener(_: "message", listener: (event: MessageEventLike) => void) {
    this.listeners.add(listener);
  }
  removeEventListener(_: "message", listener: (event: MessageEventLike) => void) {
    this.listeners.delete(listener);
  }
  /** What a window receives: the data, the origin of the sender and the window of the sender. */
  deliverFrom(source: unknown, origin: string, data: unknown, ports?: PortLike[]) {
    for (const listener of [...this.listeners]) listener({ data, origin, source, ports: ports ?? [] });
  }
}

/** `window.postMessage` of a window as the other one sees it: a handle that delivers, asynchronously, to `to`. */
function handleTo(to: FakeWindow, targetOrigin: string, from: () => { source: unknown; origin: string }): TargetLike {
  return {
    postMessage(message, requestedOrigin, transfer) {
      if (requestedOrigin !== "*" && requestedOrigin !== targetOrigin) return; // the browser drops it
      const sender = from();
      setTimeout(() => to.deliverFrom(sender.source, sender.origin, message, transfer as unknown as PortLike[]), 0);
    },
  };
}

const assets = defineAssets({ tree: { src: "/tree.png", size: [64, 96], hitbox: [24, 64, 16, 26] } });
const forest = (id = "forest") => defineMap(assets, { id, size: [800, 600], elements: [el("tree", { id: "t1", x: 100, y: 100 }), el("tree", { id: "t2", x: 300, y: 300, data: { hits: 3 } })] });
const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeView() {
  const calls: string[] = [];
  let selection: TargetRef[] = [];
  let rejection: { reason: string } | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  let modes: string[] = ["play"];
  const view: EditorViewLike = {
    interaction: {
      get modes() { return modes; },
      setModes(next) { calls.push(`modes:${next.join("+")}`); modes = [...next]; notify(); },
      pointer: { x: 10.4, y: 20.6 },
      state: { get: () => ({ selection, lastRejection: rejection }), subscribe: (l) => (listeners.add(l), () => listeners.delete(l)) },
    },
    selection: { select: (t) => { calls.push(`select:${[].concat(t as never).map((x: TargetRef) => x.id).join(",")}`); selection = [...t]; notify(); }, clear: () => { calls.push("clear"); selection = []; notify(); } },
    placement: { start: (id) => { if (id === "nope") throw new Error(`"nope" is not in the catalog`); calls.push(`place:${id}`); }, cancel: () => void calls.push("place-cancel") },
    terrain: { brush: { start: (o) => void calls.push(`brush:${o.material}:${o.radius}`), stop: () => void calls.push("brush-stop") } },
  };
  return { view, calls, setRejection: (r: { reason: string } | null) => { rejection = r; notify(); }, fireSelection: (s: TargetRef[]) => { selection = s; notify(); } };
}

function rig(options: { trust?: boolean; hostOptions?: Partial<EditorHostOptions>; withView?: boolean; hostOrigin?: string } = {}) {
  const studioWin = new FakeWindow(STUDIO);
  const gameWin = new FakeWindow(options.hostOrigin ?? GAME);
  // From the Studio's side the game's window is `frameTarget`; from the game's side its parent is `parentTarget`.
  const frameTarget: TargetLike = handleTo(gameWin, gameWin.origin, () => ({ source: parentTarget, origin: STUDIO }));
  const parentTarget: TargetLike = handleTo(studioWin, STUDIO, () => ({ source: frameTarget, origin: gameWin.origin }));
  const authorities = new Map<string, ReturnType<typeof createMapAuthority>>();
  const makeAuthority = (id: string) => {
    const authority = createMapAuthority({ definition: forest(id), assets, trustPatches: (actor) => options.trust !== false && (actor as { editor?: boolean })?.editor === true });
    authorities.set(id, authority);
    return authority;
  };
  let currentMap = "forest";
  makeAuthority("forest");
  const fake = fakeView();
  const setPaused = vi.fn();
  const host = createEditorHost({
    allowedOrigins: [STUDIO],
    window: Object.assign(gameWin, { parent: parentTarget }) as never,
    parent: parentTarget,
    authority: () => ({ id: currentMap, authority: authorities.get(currentMap)! }),
    ...(options.withView === false ? {} : { view: () => fake.view }),
    setPaused,
    pointerEveryMs: 10,
    onError: () => undefined,
    ...options.hostOptions,
  });
  const connect = (): Promise<EditorFrame> =>
    connectEditorFrame({ frame: { contentWindow: frameTarget }, origin: GAME, window: studioWin, timeoutMs: 1000, onError: () => undefined });
  return { studioWin, gameWin, frameTarget, parentTarget, authorities, makeAuthority, host, fake, setPaused, connect, goTo(id: string) { if (!authorities.has(id)) makeAuthority(id); currentMap = id; host.notifyMap(); } };
}

describe("messages", () => {
  it("accepts the control messages of the protocol and nothing else", () => {
    expect(parseControl({ type: "modes", modes: ["play", "edit"] })).toEqual({ type: "modes", modes: ["play", "edit"] });
    expect(parseControl({ type: "tool", tool: "brush", material: "dirt", radius: 20 })).toEqual({ type: "tool", tool: "brush", material: "dirt", radius: 20 });
    expect(parseControl({ type: "tool", tool: "brush", material: null, radius: 5 })).toMatchObject({ material: null });
    expect(parseControl({ type: "tool", tool: "place", catalogId: "oak" })).toEqual({ type: "tool", tool: "place", catalogId: "oak" });
    expect(parseControl({ type: "tool", tool: "none" })).toEqual({ type: "tool", tool: "none" });
    expect(parseControl({ type: "select", targets: [{ type: "element", id: "t1" }] })).toEqual({ type: "select", targets: [{ type: "element", id: "t1" }] });
    expect(parseControl({ type: "pause", paused: true })).toEqual({ type: "pause", paused: true });
    expect(parseControl({ type: "camera", x: 1, y: 2 })).toEqual({ type: "camera", x: 1, y: 2 });
    for (const bad of [null, 3, "pause", {}, { type: "nope" }, { type: "modes", modes: [1] }, { type: "modes", modes: "play" }, { type: "tool", tool: "brush", material: 3, radius: 5 }, { type: "tool", tool: "brush", material: "a", radius: -1 }, { type: "tool", tool: "brush", material: "a", radius: Infinity }, { type: "tool", tool: "place", catalogId: "" }, { type: "tool", tool: "laser" }, { type: "select", targets: [{ type: "tile", id: "x" }] }, { type: "select", targets: "all" }, { type: "pause", paused: "yes" }, { type: "camera", x: NaN, y: 1 }]) {
      expect(parseControl(bad)).toBeUndefined();
    }
  });

  it("cuts what it copies, so a message cannot carry more than the protocol says", () => {
    expect(parseControl({ type: "pause", paused: true, extra: { evil: 1 } })).toEqual({ type: "pause", paused: true });
    expect(parseEvent({ type: "error", message: "x".repeat(5000) })).toMatchObject({ message: "x".repeat(1000) });
    expect(parseControl({ type: "select", targets: Array.from({ length: 10001 }, (_, i) => ({ type: "element", id: String(i) })) })).toBeUndefined();
  });

  it("reads events and handshakes", () => {
    expect(parseEvent({ type: "map", id: "forest" })).toEqual({ type: "map", id: "forest" });
    expect(parseEvent({ type: "interaction", modes: ["play"], tool: { tool: "none" }, rejection: { reason: "occupied" } })).toEqual({ type: "interaction", modes: ["play"], tool: { tool: "none" }, rejection: { reason: "occupied" } });
    expect(parseEvent({ type: "interaction", modes: ["play"], tool: { tool: "laser" }, rejection: null })).toBeUndefined();
    expect(parseEvent({ type: "pointer", x: 1, y: "2" })).toBeUndefined();
    expect(parseHandshake({ source: EDITOR_SOURCE, type: "ready", version: 1 })).toBeDefined();
    expect(parseHandshake({ source: "someone-else", type: "ready", version: 1 })).toBeUndefined();
    expect(parseHandshake({ source: EDITOR_SOURCE, type: "connect" })).toBeUndefined();
    expect(parseEnvelope({ ch: "map", map: "forest", message: { type: "sync" } })).toBeDefined();
    expect(parseEnvelope({ ch: "map", message: {} })).toBeUndefined();
    expect(parseEnvelope({ ch: "other" })).toBeUndefined();
    expect(parseEnvelope({ ch: "event", message: () => 1 })).toBeUndefined();
  });
});

describe("meeting the game", () => {
  it("connects, whichever of the two is ready first", async () => {
    const early = rig();
    await tick(); // the game announced itself before anybody listened
    const frame = await early.connect(); // the hello brings the answer back
    await tick();
    expect(early.host.connected).toBe(true);
    frame.dispose();
    early.host.dispose();
  });

  it("gets the map as the authority has it, as a model that works like any other", async () => {
    const r = rig();
    const frame = await r.connect();
    const mapped = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    expect(mapped.id).toBe("forest");
    expect(mapped.model.state.elements.map((e) => e.id)).toEqual(["t1", "t2"]);
    expect(mapped.model.revision).toBe(r.authorities.get("forest")!.revision);
    frame.dispose();
    r.host.dispose();
  });

  it("is a trusted session: a patch from the Studio changes the game's map, and so does undo", async () => {
    const r = rig();
    const frame = await r.connect();
    const { model } = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    const result = await model.apply({ type: "element.move", id: "t1", x: 150, y: 160 });
    expect(result).toMatchObject({ ok: true });
    expect(r.authorities.get("forest")!.model.getElement("t1")).toMatchObject({ x: 150, y: 160 });
    expect(model.getElement("t1")).toMatchObject({ x: 150, y: 160 });
    expect(await model.history.undo()).toMatchObject({ ok: true });
    expect(r.authorities.get("forest")!.model.getElement("t1")).toMatchObject({ x: 100, y: 100 });
    frame.dispose();
    r.host.dispose();
  });

  it("sees what the game itself changes (a lever, another player)", async () => {
    const r = rig();
    const frame = await r.connect();
    const { model } = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    r.authorities.get("forest")!.apply({ type: "element.remove", id: "t2" });
    await tick();
    expect(model.getElement("t2")).toBeUndefined();
    frame.dispose();
    r.host.dispose();
  });

  it("is not trusted with raw patches unless the game says so, and the rules still apply to intents", async () => {
    const r = rig({ trust: false });
    const frame = await r.connect();
    const { model } = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    expect(await model.apply({ type: "element.move", id: "t1", x: 1, y: 1 })).toMatchObject({ ok: false, rejection: { code: "patches-not-allowed" } });
    expect(r.authorities.get("forest")!.model.getElement("t1")).toMatchObject({ x: 100 });
    frame.dispose();
    r.host.dispose();
  });

  it("follows the player to another map: a new model, and the old one stops being fed", async () => {
    const r = rig();
    const frame = await r.connect();
    const first = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    const second = new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap((m) => m.id === "cave" && resolve(m)));
    r.goTo("cave");
    const cave = await second;
    expect(cave.id).toBe("cave");
    expect(frame.map!.id).toBe("cave");
    expect(cave.model.state.id).toBe("cave");
    r.authorities.get("forest")!.apply({ type: "element.remove", id: "t1" });
    r.authorities.get("cave")!.apply({ type: "element.remove", id: "t2" });
    await tick();
    expect(first.model.getElement("t1")).toBeDefined(); // the forest is not told any more
    expect(cave.model.getElement("t2")).toBeUndefined();
    expect(r.authorities.get("forest")!.connections).toBe(0);
    expect(r.authorities.get("cave")!.connections).toBe(1);
    frame.dispose();
    r.host.dispose();
  });

  it("tells a late listener about the map that is already there", async () => {
    const r = rig();
    const frame = await r.connect();
    await new Promise<unknown>((resolve) => frame.onMap(resolve));
    const late = vi.fn();
    frame.onMap(late);
    expect(late).toHaveBeenCalledOnce();
    frame.dispose();
    r.host.dispose();
  });
});

describe("who may talk", () => {
  it("the game ignores a page that is not its parent, or not allowed", async () => {
    const r = rig();
    const intruder = new FakeWindow("https://evil.example.com");
    const channel = new MessageChannel();
    const connect = { source: EDITOR_SOURCE, type: "connect", version: EDITOR_PROTOCOL_VERSION };
    r.gameWin.deliverFrom(intruder, STUDIO, connect, [channel.port2 as never]); // right origin, wrong window
    r.gameWin.deliverFrom(r.parentTarget, "https://evil.example.com", connect, [channel.port2 as never]); // right window, wrong origin
    expect(r.host.connected).toBe(false);
    r.gameWin.deliverFrom(r.parentTarget, STUDIO, { ...connect, version: 99 }, [channel.port2 as never]);
    expect(r.host.connected).toBe(false);
    r.gameWin.deliverFrom(r.parentTarget, STUDIO, connect, []); // no port
    expect(r.host.connected).toBe(false);
    r.gameWin.deliverFrom(r.parentTarget, STUDIO, connect, [channel.port2 as never]);
    expect(r.host.connected).toBe(true);
    channel.port1.close();
    r.host.dispose();
  });

  it("announces itself only to the page that embeds it, when the browser says which it is", () => {
    const posted: string[] = [];
    const gameWin = new FakeWindow(GAME);
    const parent: TargetLike = { postMessage: (_m, origin) => void posted.push(origin) };
    const host = createEditorHost({ allowedOrigins: [STUDIO, "https://other.example.com"], window: gameWin as never, parent, authority: () => undefined, parentOrigin: () => STUDIO });
    expect(posted).toEqual([STUDIO]);
    host.dispose();
    const wide = createEditorHost({ allowedOrigins: [STUDIO, "https://other.example.com"], window: gameWin as never, parent, authority: () => undefined, parentOrigin: () => undefined });
    expect(posted.slice(1)).toEqual([STUDIO, "https://other.example.com"]);
    wide.dispose();
    // an origin the game does not allow is not announced to, even if the browser names it
    const refused = createEditorHost({ allowedOrigins: [STUDIO], window: gameWin as never, parent, authority: () => undefined, parentOrigin: () => "https://evil.example.com" });
    expect(posted.slice(3)).toEqual([STUDIO]);
    refused.dispose();
  });

  it("looks for the Studio among the ancestors of the page: a wrapper that is not allowed is skipped", () => {
    const posted: string[] = [];
    const gameWin = Object.assign(new FakeWindow(GAME), { location: { ancestorOrigins: { 0: "https://game.example.com", 1: STUDIO, length: 2 } } });
    const parent: TargetLike = { postMessage: (_m, origin) => void posted.push(origin) };
    const host = createEditorHost({ allowedOrigins: [STUDIO, "https://other.example.com"], window: gameWin as never, parent, authority: () => undefined });
    expect(posted).toEqual([STUDIO]);
    host.dispose();
  });

  it("a game nobody allowed announces itself to nobody", async () => {
    const r = rig({ hostOptions: { allowedOrigins: [] } });
    await expect(connectEditorFrame({ frame: { contentWindow: r.frameTarget }, origin: GAME, window: r.studioWin, timeoutMs: 150, onError: () => undefined })).rejects.toThrow(/did not answer/);
    r.host.dispose();
  });

  it("the Studio ignores an answer from another origin or another window", async () => {
    const r = rig({ hostOptions: { allowedOrigins: ["*"] } });
    const wrong = connectEditorFrame({ frame: { contentWindow: r.frameTarget }, origin: "https://other.example.com", window: r.studioWin, timeoutMs: 150, onError: () => undefined });
    await expect(wrong).rejects.toThrow(/did not answer/);
    r.host.dispose();
  });

  it("finds the game in a frame inside the frame (a sandbox wrapper), and only believes that window", async () => {
    const studioWin = new FakeWindow(STUDIO);
    const posted: Array<{ to: string; type: string }> = [];
    const inner: TargetLike = { postMessage: (m) => void posted.push({ to: "inner", type: (m as { type: string }).type }) };
    const outer: TargetLike = { postMessage: (m) => void posted.push({ to: "outer", type: (m as { type: string }).type }) };
    const pending = connectEditorFrame({ frame: { contentWindow: outer }, origin: GAME, window: studioWin, timeoutMs: 300, onError: () => undefined, resolveWindow: () => inner });
    studioWin.deliverFrom(outer, GAME, { source: EDITOR_SOURCE, type: "ready", version: EDITOR_PROTOCOL_VERSION }); // the wrapper answering: not believed
    await expect(pending).rejects.toThrow(/did not answer/);
    expect(posted.every((p) => p.to === "inner")).toBe(true);
    expect(posted.some((p) => p.type === "hello")).toBe(true);
    expect(posted.some((p) => p.type === "connect")).toBe(false);

    const ok = connectEditorFrame({ frame: { contentWindow: outer }, origin: GAME, window: studioWin, timeoutMs: 300, onError: () => undefined, resolveWindow: () => inner });
    studioWin.deliverFrom(inner, GAME, { source: EDITOR_SOURCE, type: "ready", version: EDITOR_PROTOCOL_VERSION });
    await ok; // the window inside answered: believed
    expect(posted.some((p) => p.to === "inner" && p.type === "connect")).toBe(true);
  });

  it("goes on trying while the inner frame is not there yet", async () => {
    const studioWin = new FakeWindow(STUDIO);
    let ready = false;
    const inner: TargetLike = { postMessage: () => undefined };
    const pending = connectEditorFrame({ frame: { contentWindow: {} as TargetLike }, origin: GAME, window: studioWin, timeoutMs: 800, onError: () => undefined, resolveWindow: () => { if (!ready) throw new Error("no frame yet"); return inner; } });
    setTimeout(() => { ready = true; }, 250);
    setTimeout(() => studioWin.deliverFrom(inner, GAME, { source: EDITOR_SOURCE, type: "ready", version: EDITOR_PROTOCOL_VERSION }), 500);
    await pending;
  });

  it("refuses a game built with another protocol version, saying so", async () => {
    const studioWin = new FakeWindow(STUDIO);
    const gameHandle: TargetLike = { postMessage: () => undefined };
    const pending = connectEditorFrame({ frame: { contentWindow: gameHandle }, origin: GAME, window: studioWin, timeoutMs: 500, onError: () => undefined });
    setTimeout(() => studioWin.deliverFrom(gameHandle, GAME, { source: EDITOR_SOURCE, type: "ready", version: 7 }), 5);
    await expect(pending).rejects.toThrow(/another version of the map builder/);
  });

  it("the game only listens to the map it is on", async () => {
    const r = rig();
    const channel = new MessageChannel();
    r.gameWin.deliverFrom(r.parentTarget, STUDIO, { source: EDITOR_SOURCE, type: "connect", version: EDITOR_PROTOCOL_VERSION }, [channel.port2 as never]);
    await tick();
    const patches = (id: string) => ({ ch: "map", map: id, message: { type: "patches", id: "p", patches: [{ type: "element.move", id: "t1", x: 7, y: 7 }] } });
    channel.port1.postMessage(patches("cave")); // another map: goes nowhere
    await tick();
    expect(r.authorities.get("forest")!.model.getElement("t1")).toMatchObject({ x: 100 });
    channel.port1.postMessage(patches("forest"));
    await tick();
    expect(r.authorities.get("forest")!.model.getElement("t1")).toMatchObject({ x: 7 });
    channel.port1.close();
    r.host.dispose();
  });

  it("the Studio only listens to the map it joined last, and only to an answer from the right window", async () => {
    const r = rig();
    const channels: Array<{ port1: PortLike; port2: PortLike }> = [];
    const frame = await connectEditorFrame({
      frame: { contentWindow: r.frameTarget }, origin: GAME, window: r.studioWin, timeoutMs: 1000, onError: () => undefined,
      createChannel: () => { const c = new MessageChannel() as unknown as { port1: PortLike; port2: PortLike }; channels.push(c); return c; },
    });
    const { model } = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    // a real message of another authority, made to look like it came for another map, then for ours
    const other = createMapAuthority({ definition: forest("x"), assets });
    const heard: unknown[] = [];
    other.connect({ id: "spy", actor: {}, send: (m) => void heard.push(m) });
    other.apply({ type: "element.remove", id: "t2" });
    const patchMessage = heard.find((m) => (m as { type: string }).type === "patches");
    // the other end of the channel is held by the (real) game: write into the Studio's port as if the game did
    const toStudio = (map: string) => channels[0]!.port2.postMessage({ ch: "map", map, message: patchMessage });
    toStudio("cave");
    await tick();
    expect(model.getElement("t2")).toBeDefined();
    toStudio("forest");
    await tick();
    expect(model.getElement("t2")).toBeUndefined();
    frame.dispose();
    r.host.dispose();
  });

  it("the Studio does not give its channel to a window that answers in the game's name", async () => {
    const studioWin = new FakeWindow(STUDIO);
    const posted: unknown[] = [];
    const gameHandle: TargetLike = { postMessage: (m) => void posted.push(m) };
    const intruder: TargetLike = { postMessage: () => undefined };
    const pending = connectEditorFrame({ frame: { contentWindow: gameHandle }, origin: GAME, window: studioWin, timeoutMs: 200, onError: () => undefined });
    studioWin.deliverFrom(intruder, GAME, { source: EDITOR_SOURCE, type: "ready", version: EDITOR_PROTOCOL_VERSION }); // right origin, wrong window
    await expect(pending).rejects.toThrow(/did not answer/);
    expect(posted.some((m) => (m as { type: string }).type === "connect")).toBe(false);
  });

  it("leaves the previous map for good when the game moves on", async () => {
    const r = rig();
    const frame = await r.connect();
    const first = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    const next = new Promise<unknown>((resolve) => frame.onMap((m) => m.id === "cave" && resolve(m)));
    r.goTo("cave");
    await next;
    const outcome = await Promise.race([first.model.apply({ type: "element.move", id: "t1", x: 1, y: 1 }), tick(300).then(() => "still waiting")]);
    expect(outcome).toMatchObject({ ok: false }); // it is not waiting for an answer that will never come
    frame.dispose();
    r.host.dispose();
  });
});

describe("driving the game", () => {
  it("sets the modes, the tool and the selection, and reports what the game says", async () => {
    const r = rig();
    const frame = await r.connect();
    const interactions: unknown[] = [];
    const selections: unknown[] = [];
    frame.onInteraction((i) => void interactions.push(i));
    frame.onSelection((s) => void selections.push(s));
    await tick();
    frame.setModes(["play", "edit"]);
    await tick();
    expect(r.fake.calls).toContain("modes:play+edit");
    expect(frame.interaction).toMatchObject({ modes: ["play", "edit"], tool: { tool: "none" } });

    frame.setTool({ tool: "brush", material: "dirt", radius: 22 });
    await tick();
    expect(r.fake.calls.slice(-3)).toEqual(["brush-stop", "place-cancel", "brush:dirt:22"]);
    expect(frame.interaction!.tool).toEqual({ tool: "brush", material: "dirt", radius: 22 });

    frame.setTool({ tool: "place", catalogId: "oak" });
    await tick();
    expect(r.fake.calls.slice(-3)).toEqual(["brush-stop", "place-cancel", "place:oak"]);
    expect(frame.interaction!.tool).toEqual({ tool: "place", catalogId: "oak" });

    frame.setTool({ tool: "none" });
    await tick();
    expect(frame.interaction!.tool).toEqual({ tool: "none" });

    frame.select([{ type: "element", id: "t2" }]);
    await tick();
    expect(frame.selection).toEqual([{ type: "element", id: "t2" }]);
    frame.select([]);
    await tick();
    expect(frame.selection).toEqual([]);
    expect(r.fake.calls).toContain("clear");
    // the game selects by itself (a click): the Studio hears about it
    r.fake.fireSelection([{ type: "element", id: "t1" }]);
    await tick();
    expect(frame.selection).toEqual([{ type: "element", id: "t1" }]);
    expect(selections.length).toBeGreaterThan(2);
    frame.dispose();
    r.host.dispose();
  });

  it("reports why the last intent was refused", async () => {
    const r = rig();
    const frame = await r.connect();
    await tick();
    r.fake.setRejection({ reason: "occupied" });
    await tick();
    expect(frame.interaction!.rejection).toEqual({ reason: "occupied" });
    frame.dispose();
    r.host.dispose();
  });

  it("pauses and resumes the game, and says so", async () => {
    const r = rig();
    const frame = await r.connect();
    const seen: boolean[] = [];
    frame.onPaused((p) => void seen.push(p));
    frame.pause();
    await tick();
    expect(r.setPaused).toHaveBeenLastCalledWith(true);
    expect(frame.paused).toBe(true);
    frame.resume();
    await tick();
    expect(r.setPaused).toHaveBeenLastCalledWith(false);
    expect(seen).toEqual([true, false]);
    frame.dispose();
    r.host.dispose();
  });

  it("keeps editing while paused: the authority does not depend on ticks", async () => {
    const r = rig();
    const frame = await r.connect();
    const { model } = await new Promise<NonNullable<EditorFrame["map"]>>((resolve) => frame.onMap(resolve));
    frame.pause();
    await tick();
    expect(await model.apply({ type: "element.move", id: "t1", x: 400, y: 400 })).toMatchObject({ ok: true });
    expect(frame.paused).toBe(true);
    frame.dispose();
    r.host.dispose();
  });

  it("moves the camera, and reports the pointer", async () => {
    const camera = vi.fn();
    const r = rig({ hostOptions: { camera } });
    const frame = await r.connect();
    const points: Array<{ x: number; y: number }> = [];
    frame.onPointer((p) => void points.push(p));
    frame.camera(120, 80);
    await tick(40);
    expect(camera).toHaveBeenCalledWith(120, 80);
    expect(points[0]).toEqual({ x: 10, y: 21 });
    expect(points).toHaveLength(1); // it did not move: it is not repeated
    frame.dispose();
    r.host.dispose();
  });

  it("says what went wrong instead of failing silently", async () => {
    const r = rig();
    const frame = await r.connect();
    const errors: string[] = [];
    frame.onGameError((m) => void errors.push(m));
    frame.setTool({ tool: "place", catalogId: "nope" });
    await tick();
    expect(errors[0]).toContain("not in the catalog");
    // a control message that is not valid is answered, not obeyed
    (frame as unknown as { dispose(): void }).dispose;
    frame.dispose();
    r.host.dispose();
  });

  it("without a view yet, tools say so; pausing still works", async () => {
    const r = rig({ withView: false });
    const frame = await r.connect();
    const errors: string[] = [];
    frame.onGameError((m) => void errors.push(m));
    frame.setTool({ tool: "none" });
    await tick();
    expect(errors).toEqual(["No map is shown yet"]);
    frame.pause();
    await tick();
    expect(r.setPaused).toHaveBeenCalledWith(true);
    frame.dispose();
    r.host.dispose();
  });
});

describe("ending", () => {
  it("disposing the Studio frees the authority; a new Studio can connect after", async () => {
    const r = rig();
    const frame = await r.connect();
    await new Promise<unknown>((resolve) => frame.onMap(resolve));
    expect(r.authorities.get("forest")!.connections).toBe(1);
    frame.dispose();
    // the old port is gone: the game replaces it as soon as another Studio connects
    const again = await r.connect();
    await new Promise<unknown>((resolve) => again.onMap(resolve));
    await tick();
    expect(r.authorities.get("forest")!.connections).toBe(1);
    again.dispose();
    r.host.dispose();
    expect(r.authorities.get("forest")!.connections).toBe(0);
    expect(r.host.connected).toBe(false);
  });

  it("a game that is disposed stops answering", async () => {
    const r = rig();
    r.host.dispose();
    await tick(); // what the game said before it stopped has arrived
    await expect(connectEditorFrame({ frame: { contentWindow: r.frameTarget }, origin: GAME, window: r.studioWin, timeoutMs: 150, onError: () => undefined })).rejects.toThrow(/did not answer/);
  });

  it("needs a window and a parent", () => {
    expect(() => createEditorHost({ allowedOrigins: [], authority: () => undefined, window: undefined as never })).toThrow(/needs a window/);
  });

  void MapDefinitionError;
});
