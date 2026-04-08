# Instructions for AI Agents (Jules/Cursor)

This repository contains the **RPG JS v5** framework, which has been upgraded with the **Are Logic Engine** for emergent, heuristical gameplay. When working with this codebase, you must adhere to the following axioms and systems.

## 🌟 The 5 Axioms (A1–A5)

The core of the engine is governed by five foundational principles:

1.  **A1 - Relational Integrity:** Every entity (player, NPC, item) exists in a weighted graph. When adding new features, ensure they create or modify relational edges rather than just isolated properties.
2.  **A2 - Historical Persistence:** State is a function of history. Use the persistence layer to log significant events. Future states should be influenced by these historical weights.
3.  **A3 - Emergent Complexity:** Prefer systems where complex behavior emerges from simple, interacting rules (matrices) rather than complex, hardcoded logic trees.
4.  **A4 - Watchdog Enforcement:** All state transitions MUST be validated by the Watchdog. If a proposed change violates axiomatic constraints (e.g., negative value, broken relations), it must be rejected or normalized.
5.  **A5 - Continuous Ingestion:** Every interaction (player or AI) must generate an event vector (E) that feeds into the Heuristic Wave Engine.

## 🧠 Heuristic Wave Engine (H1–H13)

The world state is represented by a 13-dimensional heuristic vector (H). When implementing actions, map them to shifts in these dimensions:

| Index | Dimension | Influence Example |
|---|---|---|
| H0 | Resource Influx | Harvesting increases H0, but raises Scarcity (H7). |
| H2 | Economy/Demand | Trading increases H2. |
| H3 | Market Velocity | High trade frequency accelerates H3. |
| H6 | Innovation | Discovery and crafting increase H6. |
| H7 | Scarcity | Over-harvesting or destruction increases H7. |
| H9 | Conflict | Combat and war drive H9. |
| H11 | Political Power | Governance and faction actions drive H11. |

**Influence Matrix (M):** The propagation of these heuristics is defined by a 13x13 matrix. Do not modify the matrix without a system-wide stability analysis.

## ♾️ World Generation & Chunks

The world is infinite and chunk-based.
- **Chunk Size:** 32x32 tiles.
- **Generation:** Noise-based but influenced by heuristics. High H7 (Scarcity) should trigger 'wasteland' biome generation.
- **Streaming:** Implement on-demand loading and aggressive unloading of distant chunks to maintain performance.

## 🏛️ Autonomous Civilizations

Factions are not static. They are "Agent Clusters" that use the same Heuristic Engine to decide on actions (trade, war, expansion). When creating NPCs, ensure they belong to a faction and contribute to its H-vector shifts.

## 📜 Documentation & API

When adding new APIs:
1.  Update the relevant documentation in `docs/guide/`.
2.  Ensure the API follows the reactive pattern (signals and side effects).
3.  Register any new server modules via `provideServerModules`.

## 🧪 Testing

Always write unit tests for heuristic shifts and Watchdog constraints. Use `vitest` for all logic verification.
