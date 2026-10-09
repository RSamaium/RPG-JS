import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

async function readDevVars() {
  try {
    const raw = await readFile(resolve(".dev.vars"), "utf8");
    return Object.fromEntries(raw.split(/\r?\n/).flatMap((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return [];
      const index = trimmed.indexOf("=");
      return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")]];
    }));
  }
  catch {
    return {};
  }
}

async function createPayload(mapId) {
  const file = valueAfter("--file");
  if (!args.includes("--studio")) {
    return JSON.parse(await readFile(resolve(file ?? "fixtures/studio-map-v2.json"), "utf8"));
  }

  if (!mapId) throw new Error("--studio requires --map-id");
  const projectId = valueAfter("--project-id") ?? process.env.RPGJS_STUDIO_PROJECT_ID;
  if (!projectId) throw new Error("--studio requires --project-id or RPGJS_STUDIO_PROJECT_ID");
  const { createStudioMapUpdatePayload } = await import("@rpgjs/studio/server");
  return createStudioMapUpdatePayload(mapId, {
    projectId,
    startMapId: mapId,
    runtimeMode: "online",
    apiUrl: process.env.RPGJS_STUDIO_API_URL ?? "https://rpgjs.studio/api",
    assetsUrl: process.env.RPGJS_STUDIO_ASSETS_URL ?? "https://assets.rpgjs.studio",
  });
}

async function publish(url, token, payload) {
  let lastError;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rpgjs-map-update-token": token,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) return response;
      const body = await response.text();
      if (![502, 503, 504].includes(response.status)) {
        throw new Error(`Publication failed (${response.status}): ${body}`);
      }
      lastError = new Error(`Worker not ready (${response.status}): ${body}`);
    }
    catch (error) {
      lastError = error;
      if (String(error?.message).includes("Publication failed")) throw error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw lastError ?? new Error("Unable to reach the Worker");
}

async function publishWorldUpdates(target, token, worldUpdates) {
  for (const world of Array.isArray(worldUpdates) ? worldUpdates : []) {
    if (!world?.id || !Array.isArray(world.maps)) continue;
    await Promise.all(world.maps.map(async (map) => {
      const targetMapId = String(map?.id ?? "").replace(/^map-/, "");
      if (!targetMapId) return;
      const url = `${target}/parties/main/map-${targetMapId}/world/${encodeURIComponent(String(world.id))}/update`;
      await publish(url, token, { id: world.id, maps: world.maps });
    }));
  }
}

const devVars = await readDevVars();
const token = process.env.RPGJS_MAP_UPDATE_TOKEN ?? devVars.RPGJS_MAP_UPDATE_TOKEN;
if (!token) throw new Error("Set RPGJS_MAP_UPDATE_TOKEN or copy .dev.vars.example to .dev.vars");

const target = (valueAfter("--target") ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const requestedMapId = valueAfter("--map-id");
const preliminaryPayload = await createPayload(requestedMapId);
const mapId = requestedMapId ?? preliminaryPayload.id ?? preliminaryPayload.data?._id;
if (!mapId) throw new Error("The payload must contain an id or be used with --map-id");
const url = `${target}/parties/main/map-${String(mapId).replace(/^map-/, "")}/map/update`;

await publish(url, token, { ...preliminaryPayload, id: String(mapId).replace(/^map-/, "") });
await publishWorldUpdates(target, token, preliminaryPayload.worldUpdates);
console.log(`Studio map '${mapId}' published successfully to ${target}`);
