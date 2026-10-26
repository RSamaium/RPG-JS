import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

describe("the entries of @rpgjs/script", () => {
  it("each one loads from its source, without the engine for the core and the parser", async () => {
    for (const entry of ["../src/index", "../src/core/index", "../src/parse", "../src/server/index", "../src/testing/index"]) {
      await expect(import(entry)).resolves.toBeDefined();
    }
  });

  it("are the ones the package exports, and each is built into dist", () => {
    expect(Object.keys(pkg.exports)).toEqual([".", "./server", "./core", "./parse", "./testing"]);
    expect(pkg.exports["./core"].import).toBe("./dist/core/index.js");
    expect(pkg.exports["./parse"].import).toBe("./dist/parse.js");
  });
});
