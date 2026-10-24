// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { createRpgServerTransport } from "../src/node";

const SECRETS = ["bearer-SECRET-123", "transfer-SECRET-456", "pk-SECRET-789"];

class StubServer {
  constructor(public room: { id: string }) {}
}

const logged = (spies: ReturnType<typeof vi.spyOn>[]): string =>
  spies.flatMap((spy) => spy.mock.calls.flat().map((value) => (typeof value === "string" ? value : JSON.stringify(value)))).join("\n");

describe("Node transport logs", () => {
  afterEach(() => vi.restoreAllMocks());

  test("never write the values of the WebSocket query, whatever happens next", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => undefined));
    const transport = createRpgServerTransport(StubServer as never, { initializeMaps: false });
    const ws = { close: vi.fn(), send: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };

    await transport.acceptWebSocket(ws as never, {
      url: `/parties/main/lobby-1?token=${SECRETS[0]}&transferToken=${SECRETS[1]}&_pk=${SECRETS[2]}&id=public-id`,
      headers: { host: "localhost:3000" },
    });

    const output = logged(spies);
    expect(output).toContain("Room: lobby-1");
    for (const secret of SECRETS) expect(output).not.toContain(secret);
  });

  test("still tell which parameters a request carried, to debug a connection", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const transport = createRpgServerTransport(StubServer as never, { initializeMaps: false });
    await transport.acceptWebSocket({ close: vi.fn() } as never, { url: "/parties/main/lobby-1?token=x&id=y&token=z", headers: { host: "localhost" } });
    const line = log.mock.calls.map((call) => String(call[0])).find((text) => text.startsWith("Room:"));
    expect(line).toBe("Room: lobby-1, Query parameters: id, token");
  });

  test("a request without a query says so", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const transport = createRpgServerTransport(StubServer as never, { initializeMaps: false });
    await transport.acceptWebSocket({ close: vi.fn() } as never, { url: "/parties/main/lobby-1", headers: { host: "localhost" } });
    expect(log.mock.calls.map((call) => String(call[0]))).toContain("Room: lobby-1, Query parameters: (none)");
  });
});
