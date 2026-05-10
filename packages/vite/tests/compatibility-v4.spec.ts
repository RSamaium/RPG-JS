import { describe, expect, it } from "vitest";
import path from "path";
import { flagTransform } from "../src/compatibility-v4/flag-transform";
import { createClientConfigLoad, createModulesLoad, createTiledMapEntries, createWorldMapEntries, loadClientFiles, loadServerFiles } from "../src/compatibility-v4";
import { loadConfigFileSync } from "../src/compatibility-v4/load-config-file";

const fixtureRoot = path.resolve(__dirname, "fixtures/v4-game");

describe("compatibilityV4Plugin", () => {
  it("loads and normalizes a v4 rpg.toml", () => {
    const config = loadConfigFileSync("development", fixtureRoot);

    expect(config.modules).toEqual(["./src/modules/main"]);
    expect(config.startMap).toBe("map");
    expect(config.compilerOptions?.build?.outputDir).toBe("dist");
  });

  it("generates a v5 server from a v4 module layout", () => {
    const config = loadConfigFileSync("development", fixtureRoot);
    const code = loadServerFiles("./src/modules/main", { modulesCreated: [], type: "rpg", serveMode: true, config, tiledMapBasePath: "map" }, config, fixtureRoot);

    expect(code).toContain("createServer");
    expect(code).toContain("provideServerModules");
    expect(code).toContain("provideTiledMap()");
    expect(code).toContain("player.setGraphic('hero')");
    expect(code).toContain("player.setHitbox(32, 32)");
    expect(code).toContain("await player.changeMap('map')");
    expect(code).toContain("events:");
    expect(code).toContain("database:");
    expect(code).toContain("worldMaps:");
  });

  it("generates a v5 client from a v4 module layout", () => {
    const config = loadConfigFileSync("development", fixtureRoot);
    const code = loadClientFiles("./src/modules/main", { type: "rpg", serveMode: true, config }, config, fixtureRoot);

    expect(code).toContain("spritesheets:");
    expect(code).toContain("sprite,");
    expect(code).toContain("engine,");
    expect(code).toContain("sceneMap:");
    expect(code).toContain("gui:");
    expect(code).toContain("sounds:");
    expect(code).toContain("prototype.width = 32");
    expect(code).toContain("prototype.height = 32");
  });

  it("generates a client config with Tiled as the default map loader", () => {
    const config = loadConfigFileSync("development", fixtureRoot);
    const code = createClientConfigLoad(config);

    expect(code).toContain("from '@rpgjs/tiledmap/client'");
    expect(code).toContain("provideTiledMap({ basePath: 'map' })");
    expect(code).toContain("provideClientModules(modules)");
  });

  it("autoloads Tiled maps from v4 map roots with public paths", () => {
    const config = loadConfigFileSync("development", fixtureRoot);
    const code = createTiledMapEntries("./src/modules/main", { type: "rpg", serveMode: true, config, tiledMapBasePath: "map" }, fixtureRoot);

    expect(code).toContain("{ id: 'world-map', file: '/map/world-map.tmx' }");
    expect(code).not.toContain("{ id: 'map'");
  });

  it("normalizes Tiled world files for the v5 world map manager", () => {
    const code = createWorldMapEntries("./src/modules/main", fixtureRoot);

    expect(code).toContain('"id":"world"');
    expect(code).toContain('"id":"world-map"');
    expect(code).toContain('"worldX":64');
    expect(code).toContain('"worldY":-160');
  });

  it("maps RPGJS v4 starter legacy modules to virtual v5 modules", () => {
    const code = createModulesLoad(["./main", "@rpgjs/mobile-gui", "@rpgjs/default-gui", "@rpgjs/gamepad"]);

    expect(code).toContain("virtual:rpgjs-v4-legacy-mobile-gui");
    expect(code).toContain("virtual:rpgjs-v4-legacy-default-gui");
    expect(code).toContain("virtual:rpgjs-v4-legacy-gamepad");
  });

  it("removes flagged imports for the opposite side", async () => {
    const plugin = flagTransform({ side: "client", type: "mmorpg", mode: "development" });
    const result = await plugin.transform?.call({} as any, "export default 1", "/tmp/mod.ts?server");

    expect(result).toEqual({ code: "export default null;", map: null });
  });

  it("keeps server flagged imports when the import chain is server-side", async () => {
    const plugin = flagTransform({ side: "client", type: "mmorpg", mode: "development" });
    const result = await plugin.transform?.call({} as any, "export default 1", "/tmp/mod.ts?server&side=server");

    expect(result).toEqual({ code: "export default 1", map: null });
  });
});
