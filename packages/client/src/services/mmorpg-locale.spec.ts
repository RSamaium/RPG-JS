import { expect, it, vi } from "vitest";
import { Context } from "@signe/di";
import { BridgeWebsocket } from "./mmorpg";

const mock = vi.hoisted(() => ({ connectionRoom: vi.fn() }));
vi.mock("@signe/sync/client", () => ({ connectionRoom: mock.connectionRoom }));

it("negotiates locale on first connection and refreshes it without losing transfer host/token", async () => {
  const conn = new EventTarget() as EventTarget & { updateProperties: ReturnType<typeof vi.fn>; reconnect: () => void };
  const accepted = () => conn.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "connected", value: { id: "test" } }) }));
  conn.updateProperties = vi.fn();
  conn.reconnect = () => { queueMicrotask(accepted); };
  mock.connectionRoom.mockImplementation(async () => {
    setTimeout(accepted, 0);
    return { conn, on: vi.fn(), off: vi.fn(), emit: vi.fn() };
  });
  const socket = new BridgeWebsocket(new Context(), { connectionId: "test", host: "initial.example", query: { custom: "retained" } });
  let locale = "fr";
  socket.locale = () => locale;
  await socket.connection();
  expect(mock.connectionRoom.mock.calls[0][0].query).toMatchObject({ locale: "fr", custom: "retained" });
  socket.updateProperties({ room: "map-town", host: "shard.example", query: { transferToken: "token" } });
  locale = "en";
  await socket.reconnect();
  expect(conn.updateProperties).toHaveBeenLastCalledWith(expect.objectContaining({
    host: "shard.example", room: "map-town", query: expect.objectContaining({ locale: "en", transferToken: "token", custom: "retained" }),
  }));
});
