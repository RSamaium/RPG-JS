import { afterEach, describe, expect, test, vi } from "vitest";
import studioServer from "../src/server";
import { configureStudioGameRuntime, resetGameDataProvider } from "../src/data-provider";

// Startup flows of a shared Studio MMORPG runtime: `direct` and `new-game` (#408) skip the title screen.

const acceptedContext = (query: Record<string, string> = {}) => ({
  connection: { id: "c1", state: null, setState: vi.fn(), send: vi.fn(), close: vi.fn() },
  query,
  headers: {},
});

const makePlayer = () => ({
  id: crypto.randomUUID(),
  initializeDefaultStats: vi.fn(),
  showCharacterSelect: vi.fn(async () => ({ id: "actor-a" })),
  setActor: vi.fn(),
  changeMap: vi.fn(async () => true),
  gui: vi.fn(),
});

let fetchMock: ReturnType<typeof vi.spyOn> | undefined;

const mockProject = () => {
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/api/game/project") return Response.json({
      _id: "project-a", startMapId: "first-map",
      menus: { titleScreen: { enabled: true }, characterSelect: { enabled: true, settings: { allActors: true } } },
    });
    if (path === "/api/game/database/all") return Response.json([{ _id: "actor-a", type: "actor", name: "Hero" }]);
    return new Response("Unexpected request", { status: 404 });
  });
  configureStudioGameRuntime({ projectId: null, runtimeMode: "online", apiBaseUrl: "http://studio.test/api" });
};

afterEach(() => {
  fetchMock?.mockRestore();
  configureStudioGameRuntime({ projectId: null });
  resetGameDataProvider();
});

describe("startup flows", () => {
  test("(a) direct skips the character selection even when the project enables it", async () => {
    mockProject();
    const hooks = (studioServer({
      resolveStartup: async () => ({ projectId: "project-a", flow: "direct", mapId: "first-map" }),
    }) as any).player;
    // direct needs a map owned by the project
    fetchMock!.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/game/project") return Response.json({
        _id: "project-a", startMapId: "first-map",
        menus: { characterSelect: { enabled: true, settings: { allActors: true } } },
      });
      if (path === "/api/game/database/all") return Response.json([{ _id: "actor-a", type: "actor", name: "Hero" }]);
      return new Response("nope", { status: 404 });
    });
    const player = makePlayer();
    await hooks.onAccepted(player, acceptedContext());
    expect(player.showCharacterSelect).not.toHaveBeenCalled();
    expect(player.changeMap).toHaveBeenCalledWith("first-map");
  });

  test("(b) title defers everything to the title GUI: nothing happens on accept", async () => {
    mockProject();
    const hooks = (studioServer({
      resolveStartup: async () => ({ projectId: "project-a", flow: "title" }),
    }) as any).player;
    const player = makePlayer();
    await hooks.onAccepted(player, acceptedContext());
    // The title flow does not auto start: the client shows the title GUI.
    expect(player.changeMap).not.toHaveBeenCalled();
    expect(player.showCharacterSelect).not.toHaveBeenCalled();
  });

  test("(c) new-game shows the character selection on accept, then the start map, with no title", async () => {
    mockProject();
    const hooks = (studioServer({
      resolveStartup: async () => ({ projectId: "project-a", flow: "new-game" }),
    }) as any).player;
    const player = makePlayer();
    await hooks.onAccepted(player, acceptedContext());
    expect(player.showCharacterSelect).toHaveBeenCalledOnce();
    expect(player.setActor).toHaveBeenCalledWith(expect.objectContaining({ id: "actor-a" }));
    expect(player.changeMap).toHaveBeenCalledWith("first-map");
    expect(player.gui).not.toHaveBeenCalledWith("rpg-title-screen");
  });
});
