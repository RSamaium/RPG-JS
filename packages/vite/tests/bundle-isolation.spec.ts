import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { build } from "vite";

const fixture = resolve(import.meta.dirname, "fixtures/bundle-boundary");
const outputRoot = mkdtempSync(join(tmpdir(), "rpgjs-bundle-boundary-"));

const listFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
};

const buildSide = async (side: "client" | "server"): Promise<string> => {
  const output = join(outputRoot, side);
  await build({
    configFile: false,
    root: fixture,
    build: {
      outDir: output,
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      lib: {
        entry: resolve(fixture, side, "index.ts"),
        formats: ["es"],
        fileName: "index",
      },
    },
  });
  return output;
};

const artifactText = (directory: string): string => {
  return listFiles(directory)
    .filter((file) => /\.(?:js|map)$/.test(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
};

describe("final client/server bundle isolation", () => {
  let clientOutput: string;
  let serverOutput: string;

  beforeAll(async () => {
    [clientOutput, serverOutput] = await Promise.all([
      buildSide("client"),
      buildSide("server"),
    ]);
  });

  afterAll(() => {
    rmSync(outputRoot, { recursive: true, force: true });
  });

  test("client JavaScript and sourcemaps contain no server canary or secret", () => {
    const artifact = artifactText(clientOutput);
    expect(artifact).toContain("RPGJS_CLIENT_CANARY_DOCUMENT");
    expect(artifact).toContain("RPGJS_CLIENT_DYNAMIC_CANARY");
    expect(artifact).not.toContain("RPGJS_SERVER_CANARY");
    expect(artifact).not.toContain("RPGJS_SERVER_SECRET_CANARY");
    expect(artifact).not.toContain("node:fs");
  });

  test("server JavaScript and sourcemaps contain no client component or browser canary", () => {
    const artifact = artifactText(serverOutput);
    expect(artifact).toContain("RPGJS_SERVER_CANARY");
    expect(artifact).toContain("RPGJS_SERVER_DYNAMIC_CANARY");
    expect(artifact).not.toContain("RPGJS_CLIENT_CANARY_DOCUMENT");
    expect(artifact).not.toMatch(/(?:\.ce|canvasengine|pixi\.js|@rpgjs\/client)/);
  });

  test("both built entry points and dynamic imports execute", async () => {
    const clientUrl = pathToFileURL(join(clientOutput, "index.js")).href;
    const serverUrl = pathToFileURL(join(serverOutput, "index.js")).href;
    const script = `
      const client = await import(${JSON.stringify(clientUrl)});
      const server = await import(${JSON.stringify(serverUrl)});
      console.log(JSON.stringify({
        shared: client.clientArtifact.sharedCanary,
        clientDynamic: await client.loadClientDynamic(),
        secret: server.serverArtifact.fakeServerSecret,
        serverDynamic: await server.loadServerDynamic()
      }));
    `;
    const executed = JSON.parse(execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      { encoding: "utf8" },
    ));

    expect(executed).toEqual({
      shared: "RPGJS_SHARED_CANARY",
      clientDynamic: "RPGJS_CLIENT_DYNAMIC_CANARY",
      secret: "RPGJS_SERVER_SECRET_CANARY",
      serverDynamic: "RPGJS_SERVER_DYNAMIC_CANARY",
    });
  });
});
