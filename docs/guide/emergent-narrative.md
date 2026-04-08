---
title: "Emergent Narrative Engine"
description: "Generating quests and lore from world history."
---

# Emergent Narrative Engine

Narratives in RPGJS v5 are not scripted by developers. They are **extracted** from the real history of the world, player actions, and AI civilization behaviors.

## The A2 + A5 Synthesis

The narrative engine works by scanning the **Historical Persistence (A2)** layer and the **Continuous Integration (A5)** stream for patterns.

### Pattern Extraction
The system looks for meaningful sequences of events:
- **War Narrative:** High frequency of combat between two factions over a specific region.
- **Famine Narrative:** Rapid resource depletion (H7) followed by a drop in population.
- **Discovery Narrative:** A cluster of exploration actions (H8) leading to new chunk generation.

## Dynamic Quest Generation

Once a pattern is detected, the engine selects a **Narrative Template** and fills it with dynamic data.

- **Example Pattern:** Scarcity (H7) is high in a trading hub.
- **Generated Quest:** "The Grain Shortage" - The player is tasked with delivering resources from a neighboring fertile region.
- **Real-time Reward:** The reward isn't just gold; completing the quest shifts the heuristics ($+H4$ Stability, $+H5$ Redistribution), directly impacting the world state.

## Lore & Myths

As patterns repeat over long periods, they aggregate into **Lore Entries**.
- If a region has seen 100 years of conflict, it is recorded in the world's history as the "Ashen Plains."
- AI NPCs will "remember" these events and use them in procedurally generated dialogue, giving the world a deep sense of place and history.

## Autonomous Civilizations (Agent Clusters)

AI factions participate in the narrative engine. They have their own goals based on the $H$ vector:
- **Expansion:** Driven by high H1 and H7.
- **Trade:** Driven by high H3 and H2.
- **War:** Driven by high H9 and H11.

A faction's success or failure in these goals creates the "drama" that players interact with, ensuring that no two servers ever have the same story.
