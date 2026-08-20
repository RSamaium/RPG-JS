// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import { Context } from "@signe/di";
import { WebSocketToken } from "./AbstractSocket";
import { provideMmorpg } from "./mmorpg";
import { provideRpg } from "./standalone";
import { normalizeStandaloneMessage } from "./standalone-message";

describe("standalone websocket bridge", () => {
  test("dispatches mock room object broadcasts to named listeners", () => {
    const onSpawn = vi.fn();
    const object = normalizeStandaloneMessage({
      type: "projectile:spawnBatch",
      value: {
        projectiles: [{ id: "p1", type: "bolt" }],
      },
    });

    if (object.type === "projectile:spawnBatch") {
      onSpawn(object.value);
    }

    expect(onSpawn).toHaveBeenCalledWith({
      projectiles: [{ id: "p1", type: "bolt" }],
    });
  });

  test("still accepts browser-style string messages", () => {
    expect(normalizeStandaloneMessage({
      data: JSON.stringify({
        type: "projectile:spawnBatch",
        value: { projectiles: [] },
      }),
    })).toEqual({
      type: "projectile:spawnBatch",
      value: { projectiles: [] },
    });
  });

  test("marks standalone and MMORPG websocket providers with their runtime mode", () => {
    class Server {}
    const context = new Context();
    const standaloneProvider = provideRpg(Server).find(
      (provider: any) => provider.provide === WebSocketToken,
    ) as any;
    const mmorpgProvider = provideMmorpg({ connectionId: "test-client" }).find(
      (provider: any) => provider.provide === WebSocketToken,
    ) as any;

    expect(standaloneProvider.useFactory(context).mode).toBe("standalone");
    expect(mmorpgProvider.useFactory(context).mode).toBe("mmorpg");
  });

  test("uses the configured initial MMORPG lobby", () => {
    const context = new Context();
    const mmorpgProvider = provideMmorpg({
      connectionId: "test-client",
      room: "lobby-project-1",
    }).find((provider: any) => provider.provide === WebSocketToken) as any;

    expect(mmorpgProvider.useFactory(context).getCurrentRoom()).toBe("lobby-project-1");
  });

  test("reconnects standalone rooms with updated room and query", async () => {
    const connects: Array<{ roomId: string; url: string; sessionId: string }> = [];
    class Server {
      subRoom = {
        onStart: vi.fn(),
      };

      constructor(public room: any) {}

      async onStart() {}

      async onConnect(conn: any, ctx: any) {
        connects.push({
          roomId: this.room.id,
          url: ctx.request.url,
          sessionId: conn.sessionId,
        });
      }
    }

    const context = new Context();
    const standaloneProvider = provideRpg(Server).find(
      (provider: any) => provider.provide === WebSocketToken,
    ) as any;
    const socket = standaloneProvider.useFactory(context);

    await socket.connection();
    socket.updateProperties({
      room: "map-center-map",
      query: { transferToken: "token-1" },
    });
    await socket.reconnect();

    expect(connects).toEqual([
      expect.objectContaining({
        roomId: "lobby-1",
        sessionId: "player-client-id",
      }),
      expect.objectContaining({
        roomId: "map-center-map",
        sessionId: "player-client-id",
      }),
    ]);
    expect(connects[1].url).toContain("transferToken=token-1");
    expect(socket.getServer().room.id).toBe("map-center-map");
  });
});
