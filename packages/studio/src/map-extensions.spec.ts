import { afterEach, describe, expect, it, vi } from "vitest";
import { registerStudioMapExtension, runStudioMapExtensions, type StudioMapExtensionContext } from "./map-extensions";

const context = (mapId = "map-1"): StudioMapExtensionContext => ({
  engine: {} as never,
  mapId,
  size: [960, 720],
  elements: { alwaysLow: [], low: [{ id: "a", x: 1, y: 2 }], high: [] },
  resolveElement: () => null,
  addElementTileset: async () => undefined,
  tilesetImage: () => undefined,
  resolveAsset: (name: string) => name,
  normalizeMorphology: () => [],
  readData: () => undefined,
  updateData: () => undefined,
  rebuildElementCollisions: () => undefined,
  updateParams: () => undefined,
  resolveAudio: async () => "",
});

describe("studio map extensions", () => {
  const removers: Array<() => void> = [];
  afterEach(() => {
    removers.splice(0).forEach((remove) => remove());
    vi.restoreAllMocks();
  });
  const add = (extension: Parameters<typeof registerStudioMapExtension>[0]) => {
    const remove = registerStudioMapExtension(extension);
    removers.push(remove);
    return remove;
  };

  it("runs every extension with the map that was loaded", () => {
    const seen: string[] = [];
    add((ctx) => void seen.push(`a:${ctx.mapId}`));
    add((ctx) => void seen.push(`b:${ctx.size.join("x")}`));
    runStudioMapExtensions(context("forest"));
    expect(seen).toEqual(["a:forest", "b:960x720"]);
  });

  it("undoes what an extension set up before it runs for the next map, and when it is removed", () => {
    const events: string[] = [];
    const remove = add((ctx) => {
      events.push(`start:${ctx.mapId}`);
      return () => void events.push(`stop:${ctx.mapId}`);
    });
    runStudioMapExtensions(context("one"));
    runStudioMapExtensions(context("two"));
    remove();
    runStudioMapExtensions(context("three"));
    expect(events).toEqual(["start:one", "stop:one", "start:two", "stop:two"]);
  });

  it("does nothing without extensions, and an extension that throws stops neither the others nor the game", () => {
    runStudioMapExtensions(context());
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ran = vi.fn();
    add(() => { throw new Error("broken"); });
    add(ran);
    expect(() => runStudioMapExtensions(context())).not.toThrow();
    expect(ran).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  it("registers an extension once, even if it is given twice", () => {
    const ran = vi.fn();
    add(ran);
    add(ran);
    runStudioMapExtensions(context());
    expect(ran).toHaveBeenCalledOnce();
  });
});
