import { generateChunk } from './world.generator';
import { saveChunk, loadChunk } from '../persistence/world.store';
import { H } from '../arelogic/heuristic.engine';

// A memory cache for recently accessed chunks (for performance)
const chunkCache = new Map<string, any>();

/**
 * Retrieves a chunk from the store or generates it on-the-fly.
 * This is the heart of the infinite world system.
 */
export async function getChunk(x: number, y: number) {
    const id = `${x}_${y}`;
    
    // 1. Check in-memory cache
    if (chunkCache.has(id)) {
        return chunkCache.get(id);
    }
    
    // 2. Try loading from file (persistence)
    let chunk = await loadChunk(id);
    
    // 3. Generate if not found (infinite world expansion)
    if (!chunk) {
        chunk = generateChunk(x, y, H);
        await saveChunk(chunk);
    }
    
    // Update cache and return
    chunkCache.set(id, chunk);
    
    // Keep cache size manageable (e.g., 100 chunks)
    if (chunkCache.size > 100) {
        const firstKey = chunkCache.keys().next().value;
        if (firstKey !== undefined) {
            chunkCache.delete(firstKey);
        }
    }
    
    return chunk;
}
