import { promises as fs } from 'fs';
import path from 'path';

const WORLD_DATA_DIR = path.join(process.cwd(), 'world_data');
const CHUNKS_DIR = path.join(WORLD_DATA_DIR, 'chunks');

/**
 * Ensures the chunks directory exists.
 */
async function ensureDir() {
    try {
        await fs.mkdir(CHUNKS_DIR, { recursive: true });
    } catch {
        // Directory exists or other error
    }
}

/**
 * Saves a single chunk as a JSON file.
 * Format: world_data/chunks/x_y.json
 */
export async function saveChunk(chunk: any) {
    await ensureDir();
    const filePath = path.join(CHUNKS_DIR, `${chunk.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(chunk, null, 2));
}

/**
 * Loads a single chunk from its JSON file.
 */
export async function loadChunk(id: string) {
    const filePath = path.join(CHUNKS_DIR, `${id}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * Global world metadata (optional, replacing old monolithic world.json)
 */
export async function saveWorld(worldMetadata: any) {
    await ensureDir();
    const filePath = path.join(WORLD_DATA_DIR, 'world_metadata.json');
    await fs.writeFile(filePath, JSON.stringify(worldMetadata, null, 2));
}

export async function loadWorld() {
    const filePath = path.join(WORLD_DATA_DIR, 'world_metadata.json');
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}
