import { loadChunk } from "../persistence/world.store";

export async function handleChunkListRequest(): Promise<string[]> {
  try {
    const isBrowser = typeof window !== "undefined";
    if (isBrowser) return [];
    const fs = await import("fs");
    const path = await import("path");
    const chunksDir = path.join(process.cwd(), "world_data", "chunks");
    await fs.promises.mkdir(chunksDir, { recursive: true });
    const files = await fs.promises.readdir(chunksDir);
    return files
      .filter((file: string) => file.endsWith(".json"))
      .map((file: string) => file.replace(".json", ""));
  } catch {
    return [];
  }
}

export async function handleChunkGetRequest(
  chunkId: string
): Promise<any | null> {
  try {
    return await loadChunk(chunkId);
  } catch {
    return null;
  }
}
