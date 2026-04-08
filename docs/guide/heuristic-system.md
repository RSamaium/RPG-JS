---
title: "Heuristic Wave Engine"
description: "Understanding the 13 dimensions of the world state."
---

# Heuristic Wave Engine

The **Heuristic Wave Engine** is the "brain" of the world. It tracks the global state across 13 dimensions (H1–H13) and determines how the world evolves, how prices shift, and how AI factions behave.

## The H-Vector (13 Dimensions)

The world state at any moment $t$ is represented by a vector $H$.

| Index | Name | Role |
|---|---|---|
| **H1** | Resource Influx | Rate of raw material entry into the system. |
| **H2** | Economy / Demand | Global appetite for goods and services. |
| **H3** | Market Velocity | Frequency of trade and transactions. |
| **H4** | Stability | Resilience of markets and factions. |
| **H5** | Redistribution | Movement of wealth between entities. |
| **H6** | Innovation | Technological progress and discovery. |
| **H7** | Scarcity | Pressure on resources; counter-weight to H1. |
| **H8** | Exploration | Discovery of new world regions. |
| **H9** | Conflict | High-intensity combat and destruction. |
| **H10** | Culture | Pattern reinforcement of social behaviors. |
| **H11** | Politics | Concentration and use of faction power. |
| **H12** | History | Long-term pattern storage. |
| **H13** | Mystery | Hidden variables and rare event triggers. |

## The Influence Matrix (M)

The engine calculates the next state $H(t+1)$ using an influence matrix $M$ and an input vector $E$ (derived from player actions):

$$H(t+1) = M \cdot H(t) + E(t)$$

This means a spike in **Conflict (H9)** doesn't just increase war—it might also decrease **Stability (H4)** and eventually drive up **Scarcity (H7)**.

## Mapping Actions to Heuristics

Every player action is mapped to an $E$ vector. For example:

- **Harvesting:** $[+H1, +H7]$ (More resources, but more scarcity pressure).
- **Trading:** $[+H2, +H3]$ (Higher demand and velocity).
- **Combat:** $[+H9, -H4]$ (Increased conflict, decreased stability).
- **Discovery:** $[+H6, +H8]$ (Innovation and exploration).

## Reactive World Ecology

The world's biomes and resource densities react directly to these values. If **Scarcity (H7)** becomes too high relative to **Resource Influx (H1)**, fertile forests may procedurally transition into wastelands or ruins.
