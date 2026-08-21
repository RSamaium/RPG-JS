# Contributing to RPGJS

RPGJS is a TypeScript framework for building both standalone RPGs and networked
MMORPGs in the browser. Contributions should preserve that dual purpose: a
feature should feel natural in a full client-side RPG, and it should also fit a
client/server game where the server owns gameplay state.

## Project Principles

- Keep the engine RPG-focused. Prefer APIs that help with maps, players, events,
  GUI, synchronization, movement, combat, save/load, and modular game features.
- Design features to be plugin-ready. New systems should expose hooks, extension
  points, or composable layers so packages and modules can extend them without
  replacing core behavior.
- Avoid single-project shortcuts in core packages. A feature should be reusable
  by games, samples, Studio, and external modules.
- Keep standalone RPG and MMORPG modes aligned. If a feature works in full
  client mode, define how it behaves when the client is connected to an
  authoritative server.
- Prefer explicit ownership. Gameplay state belongs on the server when
  multiplayer correctness matters; the client should render, predict, and react.
- Keep APIs small and composable. Prefer focused methods, hooks, providers, and
  components over large configuration objects that cannot be extended cleanly.

## Framework DX and Conceptual Ownership

RPGJS is a framework, so developer experience must be designed around a small,
coherent vocabulary rather than exposing every internal abstraction. For each
capability, provide one obvious, documented path that developers can recognize
in autocomplete, examples, and both client and server APIs.

- Extend an established concept before introducing a parallel manager, service,
  method family, configuration shape, or naming convention. New behavior should
  normally appear as an option or extension of the canonical API.
- Avoid duplicate concepts that leave users asking which API to use. If overlap
  is unavoidable for backward compatibility, identify the canonical API,
  preserve the legacy path as an alias or adapter, and document the migration.
- Be opinionated about ownership, defaults, precedence, and fallbacks. Choose the
  behavior that fits most RPGJS projects and keep lower-level flexibility behind
  advanced hooks instead of making every internal choice part of the public API.
- Keep related vocabulary consistent across decorators, engine methods, module
  configuration, Studio schemas, server commands, documentation, and examples.
- Treat public surface area as a long-term maintenance cost. Do not export an
  internal class or method merely because another RPGJS package needs it; prefer
  a private adapter, provider, hook, or narrowly scoped integration point.

Before approving a public API, verify that a new RPGJS user can answer “which
method should I use?” without comparing two equivalent concepts.

## API and Documentation Rules

- When adding or changing a client-side or server-side API, update the
  documentation in the same contribution.
- Document how the API is used, which runtime owns the data, and whether it works
  in standalone RPG mode, MMORPG mode, or both.
- Include examples for the public shape of the API. Use existing docs style and
  terminology.
- Keep backward compatibility where practical. If a legacy path remains, document
  the preferred new path.
- Add complete JSDoc to every new or modified public API. Document parameters,
  option fields, return values, runtime ownership, and at least one usage example,
  using the RPGJS extractor tags (`@title`, `@method` or `@prop`, `@param`,
  `@returns`, and `@memberof`) where the generated API reference requires them.
- Give every public framework API precise TypeScript types. Avoid `any` in public
  parameters, options, and return values; use discriminated unions, overloads,
  or generics when the result depends on the provided options. Verify that the
  generated `.d.ts` files preserve the intended inference and add type-level
  tests (for example with `expectTypeOf`) for important public contracts.
- Regenerate and review the affected committed API pages with `pnpm
  docs:player-api`, `pnpm docs:map-api`, or `pnpm docs:client-api` whenever
  their source JSDoc changes.
- Route every player-visible label, message, validation error, and notification
  through the RPGJS i18n service. Do not hard-code user-facing text in
  components or services. Modules should provide default translation keys and
  allow game-level messages to override them; explicit per-call labels may be
  supported when the public API requires them.

## Plugin-Ready Design

Before adding a new feature, check whether it should provide one of these
extension points:

- hooks for lifecycle or behavior customization
- providers for replaceable services
- registries for components or resolvers
- composable CanvasEngine components with children
- named layers or slots when several modules need to contribute UI or visuals
- server-authoritative commands when state must be synchronized

If a feature can be extended only by replacing a whole core component, it is
probably not plugin-ready enough. Prefer a default implementation that can be
wrapped, composed, or extended by modules.

New engine features should be designed as modules whenever they can stand on
their own. This includes plugin features, new battle systems, new map rendering
engines, optional gameplay systems, and other replaceable behavior. Prefer
`defineModule` on the server side so the feature can be installed, configured,
tested, and removed without coupling it to the application shell.

## UI and Components

Game UI components should be built with CanvasEngine by default. This keeps the
runtime consistent with the rendering stack and makes components composable
inside RPGJS scenes and modules.

Vue components belong in `@rpgjs/vue` only when they are low-level RPG building
blocks or part of the base RPG experience, such as a dialog box. Do not add
feature-specific Vue components to the shared Vue package.

If a UI belongs to a distinct system, create or extend a dedicated module that
owns its components and integration points. Examples include a custom battle UI,
inventory system, quest tracker, or specialized editor/runtime feature. The
module should expose the necessary hooks, services, and documentation instead of
placing system-specific UI in a shared base package.

## Client, Server, RPG, and MMORPG Behavior

For every gameplay or rendering improvement, decide and document:

- what runs only on the client
- what is controlled by the server
- what is synchronized over the network
- what works in standalone RPG mode
- what works in MMORPG mode
- what happens when the feature is unavailable on one side

Client-only visual features are acceptable, but they should not create gameplay
authority. Server-driven features should use serializable data and avoid sending
client-only implementation details across the network.

Server-side features must stay database-agnostic and server-agnostic. Do not
couple engine packages to a specific database, ORM, HTTP framework, monitoring
system, hosted server, payment provider, analytics provider, or external API.
If a feature needs integration with an external system such as Stripe, Grafana,
or a hosted API, prefer publishing an integration tutorial in the documentation
instead of adding the dependency to the engine.

RPGJS must remain a Node.js project while staying compatible with Bun and edge
runtimes. When adding support for a runtime or server target beyond Node.js,
study the structure in `packages/server/src/` and add a dedicated package or
adapter instead of hard-coding the runtime into shared engine code.

The only exception to the external-service rule is Studio mode, because RPGJS
Studio is an official RPGJS package and may need official Studio-specific
integration points.

For server/client synchronization, prefer `@signe/room` and `@signe/sync`.
These packages provide a stateful model and an architecture built around room
state transitions. Read their READMEs before changing synchronization behavior.

## Code Guidelines

- Follow the existing package structure and naming conventions.
- Prefer existing dependency injection, module, hook, and service patterns before
  introducing new architecture.
- Design public APIs with a comfortable developer experience that follows the
  existing RPGJS style.
- Keep changes scoped. Avoid unrelated refactors in feature commits.
- Add focused unit tests with Vitest when changing shared behavior,
  synchronization, physics, gameplay state, or public APIs.
- Ship documentation with every new feature, especially when it adds a new
  module, client API, server API, synchronization behavior, or runtime adapter.
- Update samples only when they clarify the new API or protect an important
  integration path.
- Before merging changes that can affect package consumers, validate them
  against the matching branch of
  [`rpgjs/starter`](https://github.com/rpgjs/starter) in a temporary directory.
  Build and pack the affected local packages, install those artifacts in the
  starter, run its production build, and start the game on a fixed local port.
  Open it in a browser and check the rendered game, console errors, failed
  network requests, and at least one basic interaction. Review a screenshot and
  report any warning that also occurs with the currently published packages so
  pre-existing starter issues are not mistaken for regressions.

## External Package Notes

If you use one of these packages directly, read its README first:

- `@signe/room`: https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/room/readme.md
- `@signe/reactive`: https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/reactive/readme.md
- `@signe/sync`: https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/sync/readme.md
- `@signe/di`: https://raw.githubusercontent.com/RSamaium/signe/refs/heads/master/packages/di/readme.md

If you create or modify CanvasEngine components (`*.ce`), use the CanvasEngine
documentation table of contents:

https://canvasengine.net/llms.txt
