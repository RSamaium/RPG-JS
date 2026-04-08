import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();
const detailNoise2D = createNoise2D();

/**
 * Advanced Heuristic World Generator
 * Uses H1-H13 to determine biome, resources, and special features.
 */
export function generateChunk(cx: number, cy: number, H: number[]) {
    const tiles = [];
    const CHUNK_SIZE = 32;
    
    // Base terrain noise
    const n = noise2D(cx * 0.1, cy * 0.1);
    const n2 = noise2D(cx * 0.05, cy * 0.05);
    
    // Heuristic Influence Factors
    const resourceInflux = H[0]; // H1
    const scarcity = H[6];       // H7
    const chaos = H[10];         // H11
    const culture = H[9];        // H10
    const conflict = H[7];       // H8

    // Biome Logic
    let biome = 'plains';
    
    // 1. Ecology & Scarcity (H1, H7)
    if (scarcity > 0.7) {
        biome = 'desert';
    } else if (resourceInflux > 0.6) {
        biome = 'forest';
    } else if (n > 0.5) {
        biome = 'forest';
    } else if (n < -0.5) {
        biome = 'swamp';
    }
    
    // 2. Altitude (Noise)
    if (n2 > 0.7) biome = 'mountains';
    
    // 3. Heuristic Overrides (Chaos, Conflict, Innovation)
    if (chaos > 0.8) biome = 'chaos_rift';
    if (conflict > 0.8 && n > 0) biome = 'battlefield';
    if (H[5] > 0.7) biome = 'ruins'; // Innovation/History remnants
    if (culture > 0.8 && n < 0) biome = 'sacred_grove';

    // Tile Generation
    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
            // Local noise for tile variation
            const localN = detailNoise2D((cx * CHUNK_SIZE + x) * 0.5, (cy * CHUNK_SIZE + y) * 0.5);
            
            let type = biome;
            // Add variety within biomes
            if (localN > 0.8) type = `${biome}_feature`; 
            
            tiles.push({ x, y, type });
        }
    }

    // Dynamic Features based on Heuristics
    const resources = (resourceInflux * 100) + (Math.random() * 20);
    const dangerLevel = (conflict * 10) + (chaos * 5);
    const stability = culture * 100;

    return {
        id: `${cx}_${cy}`,
        cx,
        cy,
        tiles,
        biome,
        metadata: {
            resources,
            dangerLevel,
            stability,
            generatedAt: Date.now(),
            heuristicSnapshot: [...H]
        }
    };
}
