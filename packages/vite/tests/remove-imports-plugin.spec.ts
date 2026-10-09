import { afterEach, describe, expect, test, vi } from "vitest";
import { removeImportsPlugin } from "../src/remove-imports-plugin";

const transform = async (code: string, id = "/tmp/source.ts") => {
  const plugin = removeImportsPlugin({
    patterns: ["vue", /^@server\//],
  });
  return plugin.transform?.call({} as any, code, id) as any;
};

describe("removeImportsPlugin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("replaces default, named and namespace imports with null declarations", async () => {
    const result = await transform(`
      import Vue, { ref as vueRef, computed } from "vue";
      import * as serverApi from "@server/api";
      import { keep } from "client";

      export const state = [Vue, vueRef, computed, serverApi, keep];
    `);

    expect(result.code).toContain("const Vue = null;");
    expect(result.code).toContain("const vueRef = null;");
    expect(result.code).toContain("const computed = null;");
    expect(result.code).toContain("const serverApi = null;");
    expect(result.code).toContain('import { keep } from "client";');
    expect(result.map).toBeDefined();
  });

  test("replaces side-effect imports with a stable comment", async () => {
    const result = await transform(`
      import "vue";
      export const ready = true;
    `);

    expect(result.code).toContain("// removed import: vue");
    expect(result.code).toContain("export const ready = true;");
  });

  test("removes named and star re-exports from the opposite runtime", async () => {
    const result = await transform(`
      export { createSecretServer } from "@server/api"; export const ready = true;
      export * from "@server/hooks"; export const count = 1;
      export { keepClient } from "client";
    `);

    expect(result.code).toContain("/* removed export: @server/api */");
    expect(result.code).toContain("/* removed export: @server/hooks */");
    expect(result.code).toContain("export const ready = true;");
    expect(result.code).toContain("export const count = 1;");
    expect(result.code).toContain('export { keepClient } from "client";');
  });

  test("ignores unmatched files and parse failures", async () => {
    expect(await transform('import "vue";', "/tmp/style.css")).toBeNull();
    expect(await transform('import { broken from "vue";')).toBeNull();
  });

  test("warns once when parsing fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await transform('import { broken from "vue";');

    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain("Failed to parse");
  });
});
