---
title: "Are Logic Engine"
description: "The core principles of emergent gameplay in RPGJS v5."
---

# Are Logic Engine

The **Are Logic Engine** is the foundational architecture of RPGJS v5, moving the framework from a traditional event-driven RPG system to a self-consistent, emergent MMORPG environment. It is governed by five core axioms (A1–A5).

## A1: Relational Graph Engine

In Are Logic, entities do not exist in isolation. Every player, item, and faction is a node in a massive, weighted dynamic graph.

- **Nodes:** Represent entities (id, type, state, history).
- **Edges:** Represent relationships (source, target, type, weight).
- **Value Propagation:** The "value" or influence of an entity is the sum of its relational weights.

```ts
// Conceptual Graph Logic
const value = relations(entityId).reduce((sum, edge) => sum + edge.weight, 0);
```

## A2: Historical Recurrence

The world state is not just the "current" values; it is a function of weighted historical data.

- **Axiom:** Every state is influenced by past occurrences.
- **Model:** Exponential decay + reinforcement.
- **Effect:** Long-standing civilizations or repeated player behaviors create "deep" historical grooves that are harder to shift than fleeting events.

## A3: Emergent Interaction Matrix

Instead of complex branching logic, Are Logic uses a system-wide interaction matrix to generate outcomes.

- **Variable Matrix:** An NxN matrix of system variables (Resources, Players, Markets, Conflict).
- **Non-linear Outcomes:** Small shifts in one variable (e.g., a localized resource shortage) can propagate through the matrix to create large-scale effects (e.g., a global price spike or a faction war).

## A4: Watchdog Constraint Solver

To prevent system divergence (e.g., infinite wealth loops or negative resources), the **Watchdog** acts as a hard constraint validator.

- **Conservation of Value:** Value cannot be created from nothing; it must be transformed.
- **State Consistency:** All updates are checked against axiomatic rules before being committed.
- **Correction:** If a state becomes invalid, the Watchdog normalizes it based on historical means (A2).

## A5: Continuous Integration Stream

Every action in the game world is ingested as an event vector (E).

- **Real-time Ingestion:** Actions like harvesting, trading, or combat are normalized and fed into the Heuristic Wave Engine.
- **Global Impact:** Player behavior is the primary driver of the world's evolution. There is no distinction between "player actions" and "world updates"—they are part of the same continuous stream.
