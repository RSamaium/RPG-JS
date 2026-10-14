import { createModule, defineModule } from "@rpgjs/common";
import type { RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { defineCatalog } from "../../src/interaction/catalog";
import { defineAssets } from "../../src/model/assets";
import { defineMap, el, event } from "../../src/model/define-map";
import type { ClientMessage, ServerMessage } from "../../src/protocol";
import { MAP_BUILDER_CHANNEL, unwrap, wrap } from "../../src/rpgjs/shared";
import { provideMapBuilder, type MapBuilderServerOptions } from "../../src/server";

export const assets = defineAssets({
  tree: { src: "/tree.png", size: [64, 96], hitbox: [16, 70, 32, 20] },
  house: { src: "/house.png", size: [128, 128], hitbox: [0, 64, 128, 64] },
  chest: { src: "/chest.png", size: [16, 16] },
  wood: { src: "/wood.png", size: [16, 16] },
});

export const catalog = defineCatalog([
  { id: "oak", sprite: "tree" },
  { id: "cabin", sprite: "house" },
]);

export const forest = (id = "map1") =>
  defineMap(assets, {
    id,
    size: [1024, 768],
    elements: [el("tree", { id: "t1", x: 128, y: 96 }), el("house", { id: "home", x: 640, y: 320 })],
    events: [event("pickup", { id: "chest-1", x: 300, y: 300, graphic: "chest" })],
  });

export interface Joined {
  readonly client: Awaited<ReturnType<TestingFixture["createClient"]>>;
  readonly player: Awaited<ReturnType<Awaited<ReturnType<TestingFixture["createClient"]>>["waitForMapChange"]>>;
  /** Every message the server sent this client for the map builder. */
  readonly inbox: Array<{ map: string; message: ServerMessage }>;
  of<T extends ServerMessage["type"]>(type: T): Array<Extract<ServerMessage, { type: T }>>;
  /** Sends a message to the server, as the map the player is on. */
  send(message: ClientMessage, map?: string): Promise<void>;
  raw(payload: unknown): Promise<void>;
}

export async function start(options: Partial<MapBuilderServerOptions> = {}, game: RpgServer = defineModule<RpgServer>({}), maps: string[] = ["map1"]) {
  const world = createModule("Game", [
    {
      server: defineModule<RpgServer>({
        maps: maps.map((id) => ({ id, file: "" })),
        player: {
          async onConnected(player) {
            await player.changeMap("map1", { x: 100, y: 100 });
          },
        },
        ...game,
      }),
    },
  ]);
  const fixture = await testing([
    ...provideMapBuilder({ assets, maps: Object.fromEntries(maps.map((id) => [id, forest(id)])), ...options }),
    ...world,
  ]);

  const join = async (): Promise<Joined> => {
    const client = await fixture.createClient();
    const inbox: Joined["inbox"] = [];
    client.client.socket.on(MAP_BUILDER_CHANNEL, (raw: unknown) => {
      const envelope = unwrap(raw);
      if (envelope) inbox.push({ map: envelope.map, message: envelope.message as ServerMessage });
    });
    const player = await client.waitForMapChange("map1");
    await fixture.wait(10);
    const joined: Joined = {
      client,
      player,
      inbox,
      of: (type) => inbox.filter((entry) => entry.message.type === type).map((entry) => entry.message) as never,
      async send(message, map = "map1") {
        client.client.socket.emit(MAP_BUILDER_CHANNEL, wrap(map, message));
        await fixture.wait(10);
      },
      async raw(payload) {
        client.client.socket.emit(MAP_BUILDER_CHANNEL, payload);
        await fixture.wait(10);
      },
    };
    return joined;
  };
  return { fixture, join };
}

/**
 * A second player. The test harness only ever creates one client, so the other player is a session
 * plugged straight into the authority: it hears everything the authority says, as a real one would.
 */
export function observer(authority: { connect(session: { id: string; actor: unknown; send(message: ServerMessage): void }): { receive(raw: unknown): void; disconnect(): void } }, actor: unknown = { id: "bob" }) {
  const inbox: ServerMessage[] = [];
  const connection = authority.connect({ id: "bob", actor, send: (message) => void inbox.push(JSON.parse(JSON.stringify(message))) });
  return {
    inbox,
    connection,
    of: <T extends ServerMessage["type"]>(type: T) => inbox.filter((message) => message.type === type) as Array<Extract<ServerMessage, { type: T }>>,
  };
}
