import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { resolvableFromRoot, rpgjs } from "../src/rpgjs-plugin";

vi.mock("../src/server-plugin", () => ({
  serverPlugin: () => ({ name: "rpgjs:server" }),
}));

const roots = mkdtempSync(join(tmpdir(), "rpgjs-plugin-"));

/** An application folder, with `@signe/reactive` in its `node_modules` or in the one of its parent. */
function createApp(name: string, reactive: "own" | "parent" | "none"): string {
  const app = join(roots, name, "app");
  mkdirSync(app, { recursive: true });
  if (reactive !== "none") {
    const folder = join(reactive === "own" ? app : join(roots, name), "node_modules/@signe/reactive");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "package.json"), "{}");
  }
  return app;
}

afterAll(() => {
  rmSync(roots, { recursive: true, force: true });
});

describe("rpgjs plugin", () => {
  it("excludes RPGJS and CanvasEngine runtimes from Vite dependency optimization", () => {
    const plugins = rpgjs({ server: {} });
    const runtimePlugin = plugins.find((plugin: any) => plugin.name === "rpgjs:runtime-dedupe") as any;
    const config = runtimePlugin.config({ root: createApp("strict", "none") });

    expect(config.resolve.dedupe).toEqual([
      "@canvasengine/presets",
      "canvasengine",
      "pixi.js",
    ]);
    expect(config.optimizeDeps.exclude).toEqual([
      "@canvasengine/presets",
      "canvasengine",
      "pixi.js",
      "@rpgjs/client",
      "@rpgjs/common",
      "@rpgjs/server",
      "@rpgjs/tiledmap/client",
      "@rpgjs/tiledmap/server",
    ]);
    expect(config.optimizeDeps.include).toContain("pixi.js > eventemitter3");
  });

  it("dedupes the reactive runtime when the application can resolve it from its root", () => {
    const plugins = rpgjs({ server: {} });
    const runtimePlugin = plugins.find((plugin: any) => plugin.name === "rpgjs:runtime-dedupe") as any;

    expect(runtimePlugin.config({ root: createApp("direct", "own") }).resolve.dedupe).toContain("@signe/reactive");
    expect(runtimePlugin.config({ root: createApp("hoisted", "parent") }).resolve.dedupe).toContain("@signe/reactive");
    // Vite resolves a deduped package from the root only: leave it to the normal resolution when the root cannot
    expect(runtimePlugin.config({ root: createApp("isolated", "none") }).resolve.dedupe).not.toContain("@signe/reactive");
  });

  it("finds the packages that the root or one of its parents installs", () => {
    const app = createApp("lookup", "parent");
    expect(resolvableFromRoot(app, ["@signe/reactive", "not-installed-anywhere"])).toEqual(["@signe/reactive"]);
  });
});
