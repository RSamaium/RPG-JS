---
title: "Infinite World Generation"
description: "How the world expands and evolves procedurally."
---

# Infinite World Generation

RPGJS v5 features a chunk-based, procedurally generated infinite world that grows as players explore.

## Chunk-Based Architecture

The world is divided into **Chunks** (default size: 32x32 tiles).

- **On-Demand Generation:** New chunks are generated only when a player approaches the edge of the currently loaded world.
- **Streaming:** Chunks are loaded from the server to the client dynamically. Distant chunks are unloaded to save memory.
- **Persistence:** Once a chunk is generated, its state (tiles, resources, history) is saved to the database.

## Heuristical Biome Selection

Unlike traditional noise-based generation, biomes in RPGJS are influenced by the **Heuristic Wave Engine**.

- **Noise Foundation:** Simplex noise determines the basic terrain (height, moisture).
- **Heuristic Overlay:**
    - High **Innovation (H6)** might spawn ruins or tech-zones.
    - High **Scarcity (H7)** transforms plains into deserts or wastelands.
    - High **Conflict (H9)** can create "warzone" biomes with dangerous terrain and higher enemy density.

## Dynamic Expansion Trigger

The system monitors player positions. When a player moves within a threshold of an ungenerated boundary, the server:
1.  Calculates the required new chunks.
2.  Applies the current $H$ vector to the generation rules.
3.  Seeds the procedural generator.
4.  Streams the data to all nearby players.

## Resource Depletion & Rebirth

Each chunk has a `resource` value.
- **Depletion:** Excessive harvesting (driving up H7) reduces the chunk's resources.
- **Rebirth:** When a civilization collapses or a region is abandoned, the **Civilization Cycle** may trigger a "rebirth," resetting the chunk with new properties influenced by its previous history (A2).
