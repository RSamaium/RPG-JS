import { describe, expect, it, vi } from "vitest";
import { addDevBannerEntry, devBannerPlugin, formatRpgjsBanner } from "../src/dev-banner";

const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");

describe("RPGJS dev banner", () => {
  it("describes a standalone game whose server runs in the browser", () => {
    const banner = stripAnsi(
      formatRpgjsBanner({
        version: "5.0.0",
        mode: "rpg",
        clientEntry: "./src/standalone.ts",
        server: { kind: "browser" },
        localUrl: "http://localhost:5173/",
      }),
    );

    expect(banner).toContain("RPGJS v5.0.0  RPG ");
    expect(banner).toMatch(/Game:\s+\.\/src\/standalone\.ts/);
    expect(banner).toMatch(/Server:\s+runs in the browser \(standalone\)/);
    expect(banner).not.toContain("ws://");
  });

  it("shows the MMORPG WebSocket endpoint and enabled network simulations", () => {
    const banner = stripAnsi(
      formatRpgjsBanner({
        mode: "mmorpg",
        clientEntry: "./src/client.ts",
        server: { kind: "node", entry: "./src/server.ts" },
        localUrl: "http://localhost:5173/",
        networkSimulation: ["latency 120 ms"],
        entries: [{ label: "Maps", value: "./src/tiled → /map" }],
      }),
    );

    expect(banner).toContain(" MMORPG ");
    expect(banner).toMatch(/Client:\s+\.\/src\/client\.ts/);
    expect(banner).toMatch(/Server:\s+\.\/src\/server\.ts → ws:\/\/localhost:5173\/parties/);
    expect(banner).toMatch(/Maps:\s+\.\/src\/tiled → \/map/);
    expect(banner).toMatch(/Network:\s+simulated latency 120 ms/);
  });

  it("shows the remote target instead of a local endpoint", () => {
    const banner = stripAnsi(
      formatRpgjsBanner({
        mode: "mmorpg",
        clientEntry: "./src/client.ts",
        server: { kind: "remote", entry: "./src/server.ts", target: "http://127.0.0.1:8787", mapCount: 2 },
        localUrl: "http://localhost:5173/",
        networkSimulation: ["latency 120 ms"],
      }),
    );

    expect(banner).toMatch(/Server:\s+http:\/\/127\.0\.0\.1:8787 \(remote, publishing 2 maps\)/);
    expect(banner).not.toContain("ws://");
    expect(banner).not.toContain("Network:");
  });

  it("prints the banner after the Vite URLs with entries added by other plugins", () => {
    const output: string[] = [];
    const config = { logger: { info: (message: string) => output.push(message) } } as any;
    const originalPrintUrls = vi.fn(() => output.push("vite urls"));
    const server = {
      config,
      printUrls: originalPrintUrls,
      resolvedUrls: { local: ["http://localhost:5173/"], network: [] },
    } as any;

    const plugin = devBannerPlugin({
      rpgType: "rpg",
      clientEntry: "./src/standalone.ts",
      serverEntry: "./src/server.ts",
    }) as any;
    plugin.configureServer(server);
    addDevBannerEntry(config, { label: "Maps", value: "./src/tiled → /map" });
    server.printUrls();

    expect(originalPrintUrls).toHaveBeenCalledOnce();
    expect(output[0]).toBe("vite urls");
    expect(stripAnsi(output[1])).toMatch(/Maps:\s+\.\/src\/tiled → \/map/);
  });
});
