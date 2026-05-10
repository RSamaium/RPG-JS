import { createRequire } from "module";
const isBrowser = typeof window !== "undefined";

let _fs: any = null;
let _path: any = null;
let _chunksDir = "";
let _metadataFile = "";

async function ensureNodeModules() {
  if (isBrowser || _fs) return;
  try {
    _fs = (await import("fs")).promises;
    _path = await import("path");
    _chunksDir = _path.join(process.cwd(), "world_data", "chunks");
    _metadataFile = _path.join(process.cwd(), "world_data", "world_metadata.json");
    try {
      const data = await _fs.readFile(_metadataFile, "utf-8");
      memoryMetadata = JSON.parse(data);
    } catch {
      // Ignored if file doesn't exist yet
    }
  } catch {
    // Not available in browser
  }
}

ensureNodeModules();

const memoryChunks = new Map<string, any>();
let memoryMetadata: any = {};

export async function saveChunk(id: string, data: any) {
  await ensureNodeModules();
  memoryChunks.set(id, data);
  if (isBrowser || !_fs) return;
  try {
    await _fs.mkdir(_chunksDir, { recursive: true });
    await _fs.writeFile(
      _path.join(_chunksDir, `${id}.json`),
      JSON.stringify(data, null, 2)
    );
  } catch {
    // Ignore
  }
}

export async function loadChunk(id: string) {
  await ensureNodeModules();
  if (memoryChunks.has(id)) return memoryChunks.get(id);
  if (isBrowser || !_fs) return null;
  try {
    const data = await _fs.readFile(
      _path.join(_chunksDir, `${id}.json`),
      "utf-8"
    );
    const parsed = JSON.parse(data);
    memoryChunks.set(id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function saveWorld(metadata: any = {}) {
  await ensureNodeModules();
  memoryMetadata = metadata;
  if (isBrowser || !_fs) return;
  try {
    const dir = _path.dirname(_metadataFile);
    _fs.mkdir(dir, { recursive: true }).then(() => {
      _fs.writeFile(_metadataFile, JSON.stringify(metadata, null, 2));
    });
  } catch {
    // Ignore
  }
}

export async function loadWorld() {
  await ensureNodeModules();
  if (isBrowser || !_fs) return memoryMetadata;
  try {
    const data = await _fs.readFile(_metadataFile, "utf-8");
    const parsed = JSON.parse(data);
    memoryMetadata = parsed;
    return parsed;
  } catch {
    return memoryMetadata;
  }
}
