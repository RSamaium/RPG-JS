import { afterEach, describe, expect, it, vi } from "vitest";
import studioServer from "../src/server";
import { configureStudioGameRuntime, resetGameDataProvider } from "../src/data-provider";

// Before it joins a map the player is in the lobby, whose database has no Studio record: `setActor` looks the class and the skills
// of the chosen actor up there (`databaseById`), so choosing a hero in the character selection failed with
// "The ID=<skill> data is not found in the database" and the player never reached the map.
const records = [
  { _id: "hero", type: "actor", name: "Kael", classId: "warrior" },
  { _id: "warrior", type: "class", name: "Warrior", skills: [{ skillId: "strike", level: 1 }] },
  { _id: "strike", type: "skill", name: "Bestial Strike", spCost: 5, power: 25 },
];

const makeLobby = () => {
  const database: Record<string, unknown> = {};
  return {
    database: () => database,
    addInDatabase: vi.fn((id: string, data: unknown) => { database[id] = data; }),
  };
};

const makePlayer = (lobby: ReturnType<typeof makeLobby>) => {
  const player: any = {
    id: crypto.randomUUID(),
    map: lobby,
    initializeDefaultStats: vi.fn(),
    showCharacterSelect: vi.fn(async () => ({ id: "hero" })),
    changeMap: vi.fn(async () => true),
    gui: vi.fn(),
    // what the real `setActor` does: the class and its skills are read from the database of the room of the player
    setActor: vi.fn((actor: any) => {
      const read = (id: string) => {
        const data = player.map.database()[id];
        if (!data) throw new Error(`The ID=${id} data is not found in the database. Add the data in the property "database"`);
        return data;
      };
      for (const { skill } of actor.class?.skillsToLearn ?? []) read(skill);
    }),
  };
  return player;
};

const acceptedContext = () => ({
  connection: { id: "c1", state: null, setState: vi.fn(), send: vi.fn(), close: vi.fn() },
  query: {},
  headers: {},
});

let fetchMock: ReturnType<typeof vi.spyOn> | undefined;

const mockStudio = () => {
  fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/api/game/project") return Response.json({
      _id: "project-a", startMapId: "first-map",
      menus: { titleScreen: { enabled: false }, characterSelect: { enabled: true, settings: { allActors: true } } },
    });
    if (path === "/api/game/database/all") return Response.json(records);
    return new Response("Unexpected request", { status: 404 });
  });
  configureStudioGameRuntime({ projectId: null, runtimeMode: "online", apiBaseUrl: "http://studio.test/api" });
};

afterEach(() => {
  fetchMock?.mockRestore();
  configureStudioGameRuntime({ projectId: null });
  resetGameDataProvider();
});

describe("the character selection in the lobby", () => {
  it("finds the class and the skills of the chosen actor: the database of the project is in the lobby", async () => {
    mockStudio();
    const hooks = (studioServer({
      resolveStartup: async () => ({ projectId: "project-a", flow: "new-game" }),
    }) as any).player;
    const lobby = makeLobby();
    const player = makePlayer(lobby);

    await hooks.onAccepted(player, acceptedContext());

    expect(player.setActor).toHaveBeenCalledOnce();
    expect(Object.keys(lobby.database()).sort()).toEqual(["hero", "strike", "warrior"]);
    expect(player.changeMap).toHaveBeenCalledWith("first-map");
  });

  it("does not need a lobby that can take a database (a player with no room)", async () => {
    mockStudio();
    const hooks = (studioServer({
      resolveStartup: async () => ({ projectId: "project-a", flow: "new-game" }),
    }) as any).player;
    const player = makePlayer(makeLobby());
    player.map = undefined;
    player.setActor.mockImplementation(() => undefined);

    await expect(hooks.onAccepted(player, acceptedContext())).resolves.toBeUndefined();
    expect(player.changeMap).toHaveBeenCalled();
  });
});
