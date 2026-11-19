import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addDeclarationExtensions, fixDeclarationSpecifiers, declarationSpecifierProblems } from "../src/esm-declarations";

/** A file system made of the declarations a build emitted, under /dist. */
const emitted = (...files: string[]) => {
  const set = new Set(files.map((file) => `/dist/${file}`));
  return (path: string) => set.has(path);
};

describe("addDeclarationExtensions", () => {
  const exists = emitted(
    "index.d.ts",
    "core/math/Vector2.d.ts",
    "core/math/utils.d.ts",
    "core/types/index.d.ts",
    "rooms/map.server.d.ts",
    "model/patches.d.ts",
  );

  it("names the file of every relative import, re-export and import type", () => {
    const { content, unresolved } = addDeclarationExtensions(
      [
        "export { Vector2 } from './core/math/Vector2';",
        "export * from \"./core/math/utils\";",
        "export type { Kind } from './core/types';",
        "import { MapRoom } from './rooms/map.server';",
        "export declare const room: import('./rooms/map.server').MapRoom;",
      ].join("\n"),
      "/dist/index.d.ts",
      exists,
    );
    expect(content).toBe(
      [
        "export { Vector2 } from './core/math/Vector2.js';",
        "export * from \"./core/math/utils.js\";",
        "export type { Kind } from './core/types/index.js';",
        "import { MapRoom } from './rooms/map.server.js';",
        "export declare const room: import('./rooms/map.server.js').MapRoom;",
      ].join("\n"),
    );
    expect(unresolved).toEqual([]);
  });

  it("resolves parent paths and module augmentations", () => {
    const { content } = addDeclarationExtensions(
      "import { Vector2 } from '../math/Vector2';\ndeclare module '../../model/patches' { interface Patch { x: number } }\nexport {};",
      "/dist/core/types/index.d.ts",
      exists,
    );
    expect(content).toBe(
      "import { Vector2 } from '../math/Vector2.js';\ndeclare module '../../model/patches.js' { interface Patch { x: number } }\nexport {};",
    );
  });

  it("leaves packages, specifiers that already name a file, and comments", () => {
    const source = [
      "/** import Badge from './components/badge.ce' and './core/math/Vector2' */",
      "import { signal } from 'canvasengine';",
      "import type { Data } from './data.json';",
      "export { Vector2 } from './core/math/Vector2.js';",
    ].join("\n");
    expect(addDeclarationExtensions(source, "/dist/index.d.ts", exists)).toEqual({ content: source, unresolved: [] });
  });

  it("leaves the imports of files typed by an ambient module, such as CanvasEngine components", () => {
    const source = "import Box from './box.ce';\nexport { Box };";
    expect(addDeclarationExtensions(source, "/dist/index.d.ts", exists)).toEqual({ content: source, unresolved: [] });
  });

  it("reports a relative import that resolves to no emitted declaration, and leaves it", () => {
    const source = "export { Missing } from './missing';";
    expect(addDeclarationExtensions(source, "/dist/index.d.ts", exists)).toEqual({ content: source, unresolved: ["./missing"] });
  });
});

describe("fixDeclarationSpecifiers", () => {
  it("rewrites the emitted declarations on disk, once all of them are written", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpgjs-dts-"));
    try {
      await mkdir(join(dir, "math"));
      const index = join(dir, "index.d.ts");
      const vector = join(dir, "math", "Vector2.d.ts");
      await writeFile(index, "export * from './math/Vector2';\n");
      await writeFile(vector, "export declare class Vector2 {}\n");
      await writeFile(join(dir, "index.js"), "export * from './math/Vector2.js';\n");

      await fixDeclarationSpecifiers(new Map([[index, ""], [vector, ""], [join(dir, "index.d.ts.map"), ""]]));

      expect(await readFile(index, "utf8")).toBe("export * from './math/Vector2.js';\n");
      expect(await readFile(vector, "utf8")).toBe("export declare class Vector2 {}\n");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("declarationSpecifierProblems", () => {
  const exists = emitted("index.d.ts", "math/Vector2.d.ts", "data.json");

  it("accepts imports that name an emitted declaration, packages, JSON and assets", () => {
    const source = [
      "export * from './math/Vector2.js';",
      "import { signal } from 'canvasengine';",
      "import type data from './data.json';",
      "import Box from './box.ce';",
    ].join("\n");
    expect(declarationSpecifierProblems(source, "/dist/index.d.ts", exists)).toEqual([]);
  });

  it("tells an import that does not name its file from one that points to no declaration", () => {
    const source = "export * from './math/Vector2';\nexport * from './missing.js';\nexport type { T } from './types';";
    expect(declarationSpecifierProblems(source, "/dist/index.d.ts", exists)).toEqual([
      { specifier: "./math/Vector2", reason: "extensionless" },
      { specifier: "./missing.js", reason: "missing" },
      { specifier: "./types", reason: "missing" },
    ]);
  });
});
