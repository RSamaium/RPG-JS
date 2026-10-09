---
title: "Framework Philosophy"
description: "The durable product and architecture principles that guide RPGJS v5."
---

# Framework Philosophy

RPGJS is an RPG framework first. Its public model should be understood through
players, maps, events, worlds, gameplay data, GUI, save/load, and multiplayer
rooms rather than through its dependency injection, rendering, or transport
implementation.

This document defines the principles that RPGJS v5 intends to keep stable. It
is a product contract for framework contributors and users, not a description
of every current implementation detail.

## One Game, Two Runtime Modes

The same gameplay model must work in both modes:

- standalone RPG, where the gameplay server runs with the client
- MMORPG, where the client connects to an authoritative remote server

A feature is not complete until its behavior and ownership are defined in both
modes. Standalone mode may remove the network boundary, but it must not require
a different gameplay architecture.

## Server-Authoritative Gameplay

The server owns gameplay state whenever multiplayer correctness matters. This
includes player progression, inventory, combat results, map state, shared
events, save data, and validation of client actions.

The client renders, predicts, gathers input, and reacts to synchronized state.
Client prediction must remain reconcilable with the authoritative result. A
visual component must not silently become the owner of gameplay state.

## Stable RPG Vocabulary

The most durable RPGJS APIs are its gameplay concepts:

- players and their commands
- maps and worlds
- shared and scenario events
- database entries such as items, skills, classes, and states
- hooks for gameplay lifecycles
- GUI commands such as dialogs and choices
- save/load and synchronization contracts

Infrastructure may evolve behind these concepts. A user should not need to
rewrite gameplay because the renderer, transport, reactive engine, or hosting
adapter changes.

## Maps Are Coordination Boundaries

A map is the natural unit of world loading, event ownership, and multiplayer
coordination. In MMORPG mode it normally corresponds to a synchronized room.
Runtime adapters may distribute or host rooms differently, but must preserve
documented map and player lifecycle behavior.

## Modules Are the Extension Unit

Features that can stand on their own should be modules. A module should be
installable, configurable, testable, and removable without changing the
application shell or replacing an entire core subsystem.

RPGJS should expose small extension points through hooks, providers,
registries, resolvers, components, or named slots. The normal module authoring
path must remain simpler than the dependency injection system that implements
it.

## Official Defaults, Replaceable Infrastructure

RPGJS provides official defaults without coupling gameplay to one deployment:

- CanvasEngine is the default rendering and game-component environment.
- Tiled is the default map authoring workflow.
- Signe provides the current reactive synchronization and room foundations.
- Node.js is the baseline server runtime.

Storage, transport, hosting, map loading, and player-visible GUI remain
replaceable through documented contracts. Platform-specific integrations such
as Cloudflare belong in dedicated adapters rather than shared engine code.

## A Simple Default Path

Explicit configuration is preferable to compiler magic, but explicit must not
mean repetitive. A new user should have one recommended way to:

- start an RPG or MMORPG
- create and install a module
- declare a map and event
- register database content
- display a GUI
- add synchronized player state

Advanced providers and runtime adapters are escape hatches. They must not be
required knowledge for the basic RPG workflow.

## Compatibility and Deprecation

RPGJS v5 follows these compatibility rules:

- documented stable APIs remain compatible throughout the v5 major line
- a removal requires a documented deprecation before the next major version
- compatibility aliases must delegate to the same behavior as the preferred API
- experimental APIs must be explicitly identified
- changes to public third-party types are treated as RPGJS compatibility changes
- save formats and multiplayer lifecycle behavior receive the same care as TypeScript signatures

The v4 compatibility layer preserves the v4 project model where practical and
must document what is supported, translated, deprecated, or intentionally not
supported. Compatibility is verified with real projects, not only isolated
compiler fixtures.

## Stability Standard

Stable does not mean that RPGJS stops evolving. It means that users can depend
on the concepts and public contracts learned in v5.0 while the implementation
continues to improve.

A new feature belongs in v5 only when it strengthens these principles without
introducing a competing architecture.
