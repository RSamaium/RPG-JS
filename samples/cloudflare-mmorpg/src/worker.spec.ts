import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const mapPayload = {
  id: "demo",
  width: 800,
  height: 640,
  events: [],
  parsedMap: {
    width: 25,
    height: 20,
    tilewidth: 32,
    tileheight: 32,
    layers: [
      {
        id: 1,
        name: "ground",
        type: "tilelayer",
        data: new Array(25 * 20).fill(0),
      },
    ],
    tilesets: [],
  },
};

describe("Cloudflare MMORPG map administration", () => {
  it("rejects an untrusted map update", async () => {
    const response = await SELF.fetch("https://example.test/parties/main/map-demo/map/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mapPayload),
    });
    expect(response.status).toBe(401);
  });

  it("accepts a trusted map update", async () => {
    const response = await SELF.fetch("https://example.test/parties/main/map-demo/map/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rpgjs-map-update-token": "test-map-update-token",
      },
      body: JSON.stringify(mapPayload),
    });
    expect(response.ok).toBe(true);
  });

  it("connects a player and sends the initial authoritative map stream", async () => {
    const publishResponse = await SELF.fetch("https://example.test/parties/main/map-demo/map/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rpgjs-map-update-token": "test-map-update-token",
      },
      body: JSON.stringify(mapPayload),
    });
    expect(publishResponse.ok).toBe(true);

    const response = await SELF.fetch(
      "https://example.test/parties/main/map-demo?id=map-stream-session",
      { headers: { upgrade: "websocket" } },
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    const packets: any[] = [];
    const initialPackets = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(
        `Timed out waiting for initial packets: ${JSON.stringify(packets)}`,
      )), 2_000);
      socket.addEventListener("message", (event) => {
        packets.push(JSON.parse(String(event.data)));
        if (packets.some((packet) => packet.type === "connected")
          && packets.some((packet) => packet.type === "map:stream")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    socket.accept();

    await initialPackets;

    expect(packets.find((packet) => packet.type === "map:stream")?.value).toMatchObject({
      mapId: "demo",
      manifest: {
        mapId: "demo",
        protocol: 1,
      },
      removed: [],
    });

    const resentStream = new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out waiting for the requested map stream")), 2_000);
      const onMessage = (event: MessageEvent) => {
        const packet = JSON.parse(String(event.data));
        if (packet.type !== "map:stream") return;
        clearTimeout(timeout);
        socket.removeEventListener("message", onMessage);
        resolve(packet);
      };
      socket.addEventListener("message", onMessage);
    });
    socket.send(JSON.stringify({
      action: "map.stream.request",
      value: { mapId: "demo" },
    }));
    await expect(resentStream).resolves.toMatchObject({
      type: "map:stream",
      value: {
        mapId: "demo",
        manifest: { mapId: "demo" },
      },
    });
    socket.close(1000, "test complete");
  });
});
