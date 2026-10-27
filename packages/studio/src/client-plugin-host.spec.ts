import { describe, expect, it } from "vitest";
import { studioPluginHost } from "./client-plugin-host";

describe("studioPluginHost", () => {
  it("gives a plugin the runtime of CanvasEngine and the client API of RPGJS, injection included", () => {
    const host = studioPluginHost() as { canvasengine: Record<string, unknown>; rpgjs: Record<string, unknown> };

    expect(typeof host.canvasengine.h).toBe("function");
    for (const name of ["defineModule", "hoverPopover", "selectable", "draggable", "dragToTile", "inject", "RpgClientEngine", "RpgGui"]) {
      expect(host.rpgjs[name], name).toBeDefined();
    }
  });
});
