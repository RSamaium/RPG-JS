---
title: "Migrate from v4 to v5"
description: "Compatibility policy and migration plan for RPGJS v4 projects moving to v5."
---

# Migrate from v4 to v5

<Warning>
This page is a stabilization draft. The compatibility matrix will be completed
and verified against real v4 projects before the v5 stable release.
</Warning>

RPGJS v5 keeps the core v4 product model: the same gameplay can run as a
standalone RPG or an MMORPG, the server owns multiplayer gameplay state, maps
act as rooms, and players, events, hooks, database content, and GUI commands
remain the primary framework concepts.

The main migration is architectural. V5 favors explicit entries, plain module
definitions, providers, replaceable runtime adapters, and CanvasEngine game
components over compiler-controlled autoload and decorators.

## Migration Paths

### Run the v4 project structure on the v5 runtime

Use `compatibilityV4Plugin()` when the project should keep its v4 directory
layout, `rpg.toml`, flagged imports, and Tiled asset conventions. See
[V4 Compatibility](/guide/v4-compatibility) for the current setup and known
limitations.

This is the preferred first step for an existing game because it separates the
runtime upgrade from the source migration.

### Migrate incrementally to native v5 modules

After the game runs on the v5 runtime, migrate one module at a time:

1. keep server gameplay hooks and commands
2. replace decorated module configuration with `defineModule()`
3. register runtime integrations through `provideX()` providers
4. move visual components to the chosen v5 GUI or CanvasEngine integration
5. validate the module in standalone and MMORPG modes

The compatibility layer and native v5 modules may coexist during this process.

### Replace Signe types leaked by early v5 betas

Early v5 betas re-exported reactive and DI implementation types from RPGJS
packages. Replace those imports before v5 stable:

| Early beta import | Stable v5 replacement |
| --- | --- |
| `WritableSignal` or `Signal` from `@rpgjs/server` | `RpgWritableSignal` or `RpgReadableSignal` for gameplay property declarations |
| `signal`, `computed`, or `effect` from `@rpgjs/server` | Framework-managed gameplay properties, or a direct `@signe/reactive` dependency in an advanced plugin |
| `Context` from `@rpgjs/client` | `RpgContext` |
| `NodeRoomStorage*` from `@rpgjs/server/node` | the corresponding `RpgRoomStorage*` contract |
| Signe Cloudflare option types | `CreateRpgServerWorkerOptions` and `RpgServerWorkerEnv` |

Plugins that deliberately use Signe internals should import and declare their
`@signe/*` dependencies directly. See
[Advanced Signe Extension Points](/advanced/signe-extension-points).

## Compatibility Matrix

| V4 capability | V5 target | Stable-release validation |
| --- | --- | --- |
| `rpg.toml` and v4 module layout | Supported by `compatibilityV4Plugin()` | Build a real v4 starter |
| `client!`, `server!`, `rpg!`, and `mmorpg!` imports | Translated by the Vite compatibility plugin | Inspect final client and server bundles |
| Tiled maps, worlds, tilesets, and assets | Supported by `@rpgjs/tiledmap` | Run development and production builds |
| Player, map, and event hooks | Preserved or mapped | Contract tests for arguments and ordering |
| Decorated classes | Supported as a v4 compatibility path | Run representative v4 gameplay modules |
| Shared and scenario events | Preserved | Multiplayer behavior tests |
| Default and mobile GUI modules | Mapped to v5 behavior | Visual and interaction tests |
| Vue GUI | Supported through `@rpgjs/vue` | Migrate a real Vue GUI |
| Community plugins | Assessed individually | Publish supported/adaptable/unsupported status |
| Save data | Migration contract to be defined | Load representative v4 saves in v5 |
| Production MMORPG deployment | Runtime-adapter specific | Node and Cloudflare staging tests |

## Compatibility Categories

Every v4 feature must be assigned one category before v5 stable:

- **Compatible**: works without source changes
- **Translated**: the compatibility layer adapts it automatically
- **Migration required**: a documented, mechanical source change is required
- **Deprecated**: still works in v5 but native v5 code should use another API
- **Unsupported**: intentionally removed with a documented reason and alternative

Unclassified behavior is a release blocker.

## Stable v5 Promise

Once v5.0 is stable, documented v5 APIs will not be removed or behaviorally
redefined in a minor release. V4 compatibility APIs that ship in v5.0 will
remain available throughout the v5 major line unless they are explicitly
identified as experimental before that release.

The final migration guide will include tested before/after examples, plugin
status, save-data guidance, and a troubleshooting section based on migrations
of real projects.
