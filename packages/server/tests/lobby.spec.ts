import { describe, expect, test, vi } from "vitest";
import { of } from "rxjs";
import { defineModule } from "@rpgjs/common";
import { ClientIo, ServerIo } from "@signe/room";
import { createServer, provideServerModules, RpgServer } from "../src";
import { LobbyRoom } from "../src/rooms/lobby";

describe("LobbyRoom", () => {
  function createLobbyHarness() {
    const lobby = new LobbyRoom({ env: { TEST: "true" } } as any);
    const hooks = {
      callHooks: vi.fn(() => of(null)),
    };
    Object.defineProperty(lobby, "hooks", { value: hooks });

    const gui = {
      emit: vi.fn(),
    };
    const player: any = {
      getGui: vi.fn(() => gui),
      removeGui: vi.fn(),
      initializeDefaultStats: vi.fn(),
    };

    return { lobby, hooks, gui, player };
  }

  test("start gui interaction closes the title gui before running onStart hooks", async () => {
    const { lobby, hooks, gui, player } = createLobbyHarness();

    await lobby.guiInteraction(player, {
      guiId: "rpg-title-screen",
      name: "select",
      data: { id: "start", index: 0 },
    });

    expect(gui.emit).toHaveBeenCalledWith("select", { id: "start", index: 0 });
    expect(player.removeGui).toHaveBeenCalledWith("rpg-title-screen", { id: "start", index: 0 });
    expect(player.initializeDefaultStats).toHaveBeenCalled();
    expect(hooks.callHooks).toHaveBeenCalledWith("server-player-onStart", player);
  });

  test("title screen load entry does not run onStart hooks", async () => {
    const { lobby, hooks, player } = createLobbyHarness();

    await lobby.guiInteraction(player, {
      guiId: "rpg-title-screen",
      name: "select",
      data: { id: "load", index: 1 },
    });

    expect(player.initializeDefaultStats).not.toHaveBeenCalled();
    expect(hooks.callHooks).not.toHaveBeenCalledWith("server-player-onStart", player);
  });

  test("title screen gui exit can start the game from onFinish-style components", async () => {
    const { lobby, hooks, player } = createLobbyHarness();

    await lobby.guiExit(player, {
      guiId: "rpg-title-screen",
      data: { id: "start", index: 0 },
    });

    expect(player.removeGui).toHaveBeenCalledWith("rpg-title-screen", { id: "start", index: 0 });
    expect(player.initializeDefaultStats).toHaveBeenCalled();
    expect(hooks.callHooks).toHaveBeenCalledWith("server-player-onStart", player);
  });

  test("client connection close runs onDisconnected", async () => {
    const onDisconnected = vi.fn();
    const serverModule = defineModule<RpgServer>({
      player: { onDisconnected },
    });
    const serverClass = createServer({
      providers: [provideServerModules([serverModule])],
    });
    const room = new ServerIo("lobby-1", { env: { TEST: "true" } });
    const server = new serverClass(room);
    await server.onStart();
    await server.subRoom.onStart();
    const client = new ClientIo(server, "player-client-id");
    const request = new Request("http://localhost", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    await server.onConnect(client.conn as any, { request } as any);
    room.clients.set(client.id, client);

    client.conn.close();
    await vi.waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce());
  });

  test("client title screen interaction reaches lobby and runs onStart", async () => {
    let onStartCalls = 0;
    const serverModule = defineModule<RpgServer>({
      player: {
        onConnected(player) {
          player.gui("rpg-title-screen").open();
        },
        onStart() {
          onStartCalls += 1;
        },
      },
    });
    const serverClass = createServer({
      providers: [provideServerModules([serverModule])],
    });
    const room = new ServerIo("lobby-1", { env: { TEST: "true" } });
    const server = new serverClass(room);
    await server.onStart();
    await server.subRoom.onStart();
    const client = new ClientIo(server, "player-client-id");
    const request = new Request("http://localhost", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    await server.onConnect(client.conn as any, { request } as any);
    room.clients.set(client.id, client);

    await client.send({
      action: "gui.interaction",
      value: {
        guiId: "rpg-title-screen",
        name: "select",
        data: { id: "start", index: 0 },
      },
    });

    expect(onStartCalls).toBe(1);
  });

  test("client title screen exit reaches lobby and runs onStart", async () => {
    let onStartCalls = 0;
    const serverModule = defineModule<RpgServer>({
      player: {
        onConnected(player) {
          player.gui("rpg-title-screen").open();
        },
        onStart() {
          onStartCalls += 1;
        },
      },
    });
    const serverClass = createServer({
      providers: [provideServerModules([serverModule])],
    });
    const room = new ServerIo("lobby-1", { env: { TEST: "true" } });
    const server = new serverClass(room);
    await server.onStart();
    await server.subRoom.onStart();
    const client = new ClientIo(server, "player-client-id");
    const request = new Request("http://localhost", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    await server.onConnect(client.conn as any, { request } as any);
    room.clients.set(client.id, client);

    await client.send({
      action: "gui.exit",
      value: {
        guiId: "rpg-title-screen",
        data: { id: "start", index: 0 },
      },
    });

    expect(onStartCalls).toBe(1);
  });
});
