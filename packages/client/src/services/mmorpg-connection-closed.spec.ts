import { describe, expect, it, vi } from "vitest";
import { Context } from "@signe/di";
import { BridgeWebsocket, provideMmorpg } from "./mmorpg";
import { WebSocketToken } from "./AbstractSocket";

const mock = vi.hoisted(() => ({ connectionRoom: vi.fn() }));
vi.mock("@signe/sync/client", () => ({ connectionRoom: mock.connectionRoom }));

function setup() {
  const conn = new EventTarget() as any;
  const accepted = () => conn.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "connected", value: { id: "t" } }) }));
  conn.updateProperties = vi.fn();
  conn.reconnect = () => { queueMicrotask(accepted); };
  conn.close = vi.fn();
  mock.connectionRoom.mockImplementation(async () => {
    setTimeout(accepted, 0);
    return { conn, on: vi.fn(), off: vi.fn(), emit: vi.fn() };
  });
  return conn;
}

const closeEvent = (code: number, reason = "") => {
  const event: any = new Event("close");
  event.code = code;
  event.reason = reason;
  return event;
};

const createSocket = (options: Record<string, unknown> = {}) => {
  const providers: any[] = provideMmorpg({ connectionId: "t", host: "h", ...options });
  return providers.find((p) => p.provide === WebSocketToken).useFactory(new Context()) as BridgeWebsocket;
};

describe("onConnectionClosed", () => {
  it("is called with the code and the reason after the lobby to map room change", async () => {
    const conn = setup();
    const onConnectionClosed = vi.fn();
    const socket = createSocket({ onConnectionClosed });
    await socket.connection();
    socket.updateProperties({ room: "map-1" });
    await socket.reconnect();
    conn.dispatchEvent(closeEvent(4401, "Authentication required: sign in to play"));
    expect(onConnectionClosed).toHaveBeenCalledWith({
      code: 4401,
      reason: "Authentication required: sign in to play",
      willReconnect: false,
    });
  });

  it("also reaches the handler the engine installs", async () => {
    const conn = setup();
    const socket = createSocket();
    const handler = vi.fn();
    socket.connectionClosedHandler = handler;
    await socket.connection();
    conn.dispatchEvent(closeEvent(4401));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ code: 4401 }));
  });

  it("reports willReconnect when the transport retries and the code is not an application code", async () => {
    const conn = setup();
    const onConnectionClosed = vi.fn();
    const socket = createSocket({ onConnectionClosed, socketOptions: { maxRetries: 3 } });
    await socket.connection();
    conn.dispatchEvent(closeEvent(1006));
    conn.dispatchEvent(closeEvent(4401));
    expect(onConnectionClosed.mock.calls.map(([info]) => info.willReconnect)).toEqual([true, false]);
  });

  it("ignores a clean close and the close of a room change", async () => {
    const conn = setup();
    const onConnectionClosed = vi.fn();
    const socket = createSocket({ onConnectionClosed });
    await socket.connection();
    conn.dispatchEvent(closeEvent(1000));
    conn.reconnect = () => {
      // the transport closes the old socket of the previous room: abnormal code, reason that is not a string
      conn.dispatchEvent(Object.assign(new Event("close"), { code: 1006, reason: new Event("close") }));
      queueMicrotask(() => conn.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "connected" }) })));
    };
    socket.updateProperties({ room: "map-1" });
    await socket.reconnect();
    expect(onConnectionClosed).not.toHaveBeenCalled();
  });

  it("is silent after disconnect()", async () => {
    const conn = setup();
    const onConnectionClosed = vi.fn();
    const socket = createSocket({ onConnectionClosed });
    await socket.connection();
    socket.disconnect();
    conn.dispatchEvent(closeEvent(1006));
    expect(onConnectionClosed).not.toHaveBeenCalled();
  });
});
