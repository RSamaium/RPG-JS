import type { Plugin } from "vite";

export function flagTransform(options: { side?: "client" | "server"; mode?: string; type?: "rpg" | "mmorpg" } = {}): Plugin {
  function getImportSide(importer?: string): "client" | "server" {
    if (importer?.includes("?server") || importer?.includes("server-entry")) return "server";
    if (importer?.includes("?client") || importer?.includes("client-entry") || importer?.includes("standalone-entry")) return "client";
    return options.side ?? "client";
  }

  function hasFlag(id: string, flag: string) {
    return id.endsWith(`?${flag}`) || id.includes(`?${flag}&`);
  }

  function getSideFromId(id: string): "client" | "server" {
    const side = id.match(/[?&]side=(client|server)/)?.[1];
    return side === "server" ? "server" : "client";
  }

  return {
    name: "rpgjs-v4-flag-transform",
    async resolveId(this: any, source: string, importer?: string, resolveOptions?: any) {
      const flags = ["client!", "server!", "rpg!", "mmorpg!", "production!", "development!"];
      for (const flag of flags) {
        if (!source.startsWith(flag)) continue;
        const id = source.slice(flag.length);
        const resolution = await this.resolve(id, importer, {
          skipSelf: true,
          ...resolveOptions,
        });
        if (!resolution) return null;
        const importSide = getImportSide(importer);
        return {
          ...resolution,
          id: `${resolution.id}?${flag.slice(0, -1)}&side=${importSide}`,
        };
      }
      return null;
    },
    transform(code, id) {
      const { mode = "development", type = "mmorpg" } = options;
      const side = getSideFromId(id);

      if (mode === "test") return { code, map: null };

      if (hasFlag(id, side === "client" ? "server" : "client") && type !== "rpg") {
        return { code: "export default null;", map: null };
      }

      if (
        (hasFlag(id, "production") && mode !== "production") ||
        (hasFlag(id, "development") && mode !== "development") ||
        (hasFlag(id, "rpg") && type !== "rpg") ||
        (hasFlag(id, "mmorpg") && type !== "mmorpg")
      ) {
        return { code: "export default null;", map: null };
      }

      return { code, map: null };
    },
  };
}
