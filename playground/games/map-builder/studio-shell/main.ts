import { connectEditorFrame, type EditorFrame, type EditorMap } from "@rpgjs/map-builder/embed";
import { terrainPatchHandlers } from "@rpgjs/map-builder/terrain";

interface TargetRef { readonly type: "element" | "event"; readonly id: string }

/**
 * A stand-in for the Studio, without Angular: it embeds the game (another origin), and everything it shows
 * and does goes through the editor channels. The map is a model like any other; the tools are commands.
 */
const GAME_ORIGIN = new URLSearchParams(location.search).get("game") ?? "http://localhost:5192";
const iframe = document.getElementById("game") as HTMLIFrameElement;
const toolbar = document.getElementById("toolbar")!;
const panel = document.getElementById("panel")!;
const status = document.getElementById("status")!;

iframe.src = `${GAME_ORIGIN}/?editor`;

let frame: EditorFrame | undefined;
let map: EditorMap | undefined;
let error = "";
let pointer = "";

const TOOLS = [
  { id: "select", label: "Select", run: (f: EditorFrame) => { f.setModes(["play", "edit"]); f.setTool({ tool: "none" }); } },
  { id: "till", label: "Till (dirt)", run: (f: EditorFrame) => { f.setModes(["play", "edit"]); f.setTool({ tool: "brush", material: "dirt", radius: 22 }); } },
  { id: "grass", label: "Grass", run: (f: EditorFrame) => { f.setModes(["play", "edit"]); f.setTool({ tool: "brush", material: "grass", radius: 22 }); } },
  { id: "oak", label: "Place oak", run: (f: EditorFrame) => { f.setModes(["play", "edit"]); f.setTool({ tool: "place", catalogId: "oak" }); } },
] as const;

const same = (a: TargetRef, b: TargetRef) => a.type === b.type && a.id === b.id;

function activeTool(): string {
  const tool = frame?.interaction?.tool;
  if (!tool || tool.tool === "none") return "select";
  if (tool.tool === "place") return "oak";
  return tool.material === "dirt" ? "till" : "grass";
}

function renderToolbar(): void {
  toolbar.replaceChildren();
  const add = (label: string, onClick: () => void, pressed?: boolean, disabled = false) => {
    const button = document.createElement("button");
    button.textContent = label;
    if (pressed !== undefined) button.setAttribute("aria-pressed", String(pressed));
    button.disabled = disabled;
    button.onclick = onClick;
    toolbar.append(button);
    return button;
  };
  const ready = Boolean(frame && map);
  add(frame?.paused ? "▶ Resume" : "⏸ Pause", () => (frame!.paused ? frame!.resume() : frame!.pause()), frame?.paused ?? false, !frame).id = "pause";
  toolbar.append(Object.assign(document.createElement("span"), { textContent: "│", className: "muted" }));
  for (const tool of TOOLS) add(tool.label, () => tool.run(frame!), ready && activeTool() === tool.id, !ready).id = `tool-${tool.id}`;
  toolbar.append(Object.assign(document.createElement("span"), { textContent: "│", className: "muted" }));
  add("Undo", () => void map!.model.history.undo(), false, !ready || !map!.model.history.canUndo).id = "undo";
  add("Redo", () => void map!.model.history.redo(), false, !ready || !map!.model.history.canRedo).id = "redo";
}

function renderPanel(): void {
  panel.replaceChildren();
  if (!map) {
    panel.append(Object.assign(document.createElement("p"), { textContent: "Waiting for the game…", className: "muted" }));
    return;
  }
  const state = map.model.state;
  const selection = frame!.selection;
  const title = document.createElement("div");
  title.innerHTML = `<strong id="map-id">${state.id}</strong> <span class="muted">revision <span id="revision">${map.model.revision}</span> · ${state.elements.length} elements · ${state.events.length} events</span>`;
  panel.append(title);

  const h = (text: string) => panel.append(Object.assign(document.createElement("h2"), { textContent: text }));
  h("Elements");
  const list = document.createElement("ul");
  list.id = "elements";
  for (const element of state.elements) {
    const target: TargetRef = { type: "element", id: element.id };
    const item = document.createElement("li");
    item.setAttribute("aria-selected", String(selection.some((t) => same(t, target))));
    item.dataset.id = element.id;
    item.innerHTML = `<span>${element.id}</span><span class="muted">${element.kind} · ${Math.round(element.x)}, ${Math.round(element.y)}</span>`;
    item.onclick = () => frame!.select([target]);
    list.append(item);
  }
  panel.append(list);

  const picked = selection.length === 1 && selection[0]!.type === "element" ? state.elements.find((e) => e.id === selection[0]!.id) : undefined;
  h("Properties");
  if (!picked) {
    panel.append(Object.assign(document.createElement("p"), { textContent: "Select an element, in the list or on the map.", className: "muted" }));
  } else {
    const field = (name: string, value: number | string, commit: (raw: string) => void) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.value = String(value);
      input.id = `prop-${name}`;
      input.onchange = () => commit(input.value);
      label.append(Object.assign(document.createElement("span"), { textContent: name }), input);
      panel.append(label);
    };
    field("x", Math.round(picked.x), (raw) => void map!.model.apply({ type: "element.move", id: picked.id, x: Number(raw), y: picked.y }));
    field("y", Math.round(picked.y), (raw) => void map!.model.apply({ type: "element.move", id: picked.id, x: picked.x, y: Number(raw) }));
    field("hits", String(picked.data?.hits ?? ""), (raw) => void map!.model.apply({ type: "element.data", id: picked.id, set: { hits: Number(raw) } }));
    const remove = document.createElement("button");
    remove.textContent = "Delete";
    remove.id = "delete";
    remove.onclick = () => void map!.model.apply({ type: "element.remove", id: picked.id });
    panel.append(remove);
  }

  if (error) panel.append(Object.assign(document.createElement("p"), { id: "error", textContent: error }));
  const rejection = frame!.interaction?.rejection;
  if (rejection) panel.append(Object.assign(document.createElement("p"), { id: "rejection", textContent: `Refused: ${rejection.reason}`, className: "muted" }));
}

function renderStatus(): void {
  status.textContent = frame ? `${map ? `map ${map.id}` : "joining the map…"} · ${frame.paused ? "game paused" : "game running"}${pointer ? ` · pointer ${pointer}` : ""}` : "Connecting to the game…";
}

function render(): void {
  renderToolbar();
  renderPanel();
  renderStatus();
}

render();

connectEditorFrame({ frame: iframe, origin: GAME_ORIGIN, timeoutMs: 60_000, patchHandlers: [terrainPatchHandlers], onError: (e) => { error = String(e); render(); } })
  .then((connected) => {
    frame = connected;
    (window as unknown as { __studio?: unknown }).__studio = connected;
    connected.onMap((next) => {
      map = next;
      next.model.subscribe(() => render());
      render();
    });
    connected.onSelection(render);
    connected.onInteraction(render);
    connected.onPaused(render);
    connected.onPointer((p) => { pointer = `${p.x}, ${p.y}`; renderStatus(); });
    connected.onGameError((message) => { error = message; render(); });
    render();
  })
  .catch((e) => {
    error = String(e);
    status.textContent = error;
  });
