---
title: "RPGJS v5 Stabilization Roadmap"
description: "Internal milestones and release gates for moving RPGJS v5 from beta to stable."
---

# RPGJS v5 Stabilization Roadmap

This document is the source of truth for the v5 stabilization program. GitHub
issues and a `RPGJS v5.0 Stable` milestone should track execution and link back
to the relevant sections here. The public feature roadmap remains separate in
`docs/roadmap.md`.

The objective is not to finish every possible RPG feature. It is to prove that
the current framework model is coherent, compatible, deployable, and safe to
depend on for the complete v5 major line.

## Stable Release Definition

RPGJS v5 is ready for a stable release when:

- the framework philosophy and public architecture decisions are accepted
- there is one documented default path for modules, maps, events, and runtime startup
- the stable public API surface is identified and protected from accidental changes
- the v4 compatibility matrix is complete and verified with real projects
- standalone and MMORPG modes pass the same gameplay contract tests
- production MMORPG deployment is validated on Node and Cloudflare
- final client bundles contain no server code, secrets, or server-only dependencies
- final server bundles contain no client-only components or browser dependencies
- the official chat module validates networking, GUI, theming, and runtime extensibility
- `@rpgjs/ui-css` supports at least two substantially different themes without component changes
- release candidates receive only fixes and documentation changes

## Workstream A: Philosophy and Public Boundaries

### Deliverables

- accept `docs/philosophy.md`
- decide the canonical module authoring and installation APIs
- classify public APIs as stable, extension, or experimental
- decide which Signe types are public contracts and which are implementation details
- define CanvasEngine's public role without exposing Pixi implementation details unnecessarily
- publish the v5 deprecation and compatibility policy
- generate and compare public export and declaration snapshots in CI

ADR 002 establishes the accepted Signe boundary: gameplay declarations and
runtime adapters expose RPGJS-owned contracts, while direct Signe imports are
reserved for documented advanced plugins.

### Exit gate

No unresolved architecture question may require a v5 user to choose between
competing recommended patterns.

## Workstream B: V4 Continuity

### Deliverables

- complete `docs/migration/v4-to-v5.md`
- classify every documented v4 feature as compatible, translated, migration-required, deprecated, or unsupported
- validate the official v4 starter on the v5 runtime
- validate a Tiled game, Vue GUI game, MMORPG game, and plugin-based game
- define and test save-data migration
- publish hook, configuration, package, and GUI mapping tables

### Exit gate

A v4 project owner can estimate the migration before changing the project, and
the compatibility claims are backed by production builds of representative
games.

## Workstream C: Client and Server Bundle Isolation

The existing transform tests are necessary but do not prove that final Rollup
artifacts are isolated.

### Deliverables

- add a fixture module containing client-only, server-only, shared, dynamic-import, and re-export paths
- embed unique client and server canary strings, including a fake server secret
- build production client and server artifacts
- scan JavaScript and sourcemaps for forbidden canaries and imports
- execute imports from both artifacts to catch `null` replacements left on live paths
- ensure the client has no Node builtin or server-only dependency
- ensure the server has no `.ce`, DOM, or browser-only dependency
- replace path-name heuristics where explicit entry points or conditions can provide a stronger boundary

### Exit gate

CI fails whenever server code or a server canary is observable in a client
artifact, including its sourcemaps, and vice versa for client-only server code.

## Workstream D: Production MMORPG on Cloudflare

Cloudflare support belongs in a dedicated adapter so the shared server remains
runtime-agnostic.

### Target architecture

- a Worker validates and routes HTTP and WebSocket requests
- a lobby coordination unit owns initial session routing
- each map room is assigned deterministically to its own Durable Object
- WebSocket connection metadata survives hibernation
- durable gameplay state is persisted before being treated as committed

### Deliverables

- create a dedicated Cloudflare adapter or package
- add Wrangler configuration and Durable Object migrations
- provide a minimal MMORPG starter using the adapter
- test locally with the Cloudflare Workers Vitest pool
- deploy an automated staging environment on Cloudflare
- verify authentication, join, reconnect, map transfer, shared events, scenario events, chat, and save/load
- test hibernation and object re-instantiation rather than relying only on in-memory state
- run representative concurrent-player and message-frequency tests
- record latency, CPU duration, storage, WebSocket, error, and cost baselines
- document deployment, rollback, schema migration, secrets, and observability

### Exit gate

The staging MMORPG runs through an agreed observation period without critical
state loss, authorization failure, bundle leakage, or map-transfer regression.

## Workstream E: Official Chat Module

Chat should be an official removable module rather than hard-coded engine
behavior. It is the reference vertical slice for transport, authority, GUI,
i18n, themes, and platform adapters.

### Minimum stable scope

- map channel and optional global channel
- server-owned sender identity and timestamp
- payload validation and length limits
- configurable rate limiting
- hooks for moderation, commands, filtering, and persistence
- mute and block extension points
- translated labels and validation messages
- keyboard, pointer, touch, and responsive behavior
- replaceable CanvasEngine component and documented integration contract
- equivalent API in standalone and MMORPG modes

Private messages, voice chat, external moderation services, and permanent
history may remain post-v5.0 modules or extensions.

### Exit gate

The same chat module works on Node and Cloudflare, in standalone and MMORPG
modes, and can be restyled without changing chat behavior.

## Workstream F: UI CSS and Theme Contract

The package entry points must match their documented responsibilities:

- `reset.css`: reset only
- `tokens.css`: base design tokens only
- `index.css`: reset, tokens, animations, and primitives without an opinionated theme
- `theme-default.css`: default-theme overrides loaded after `index.css`
- additional theme entry points: overrides only

### Deliverables

- correct entry-point import order and remove the implicit default theme from the base entry
- distinguish semantic tokens from component-level tokens
- remove avoidable hard-coded visual values from primitives
- support global and locally scoped theme overrides
- add chat primitives to the same contract
- create a substantially different second theme, such as pixel/retro
- verify that both themes use identical component markup
- add desktop and mobile visual-regression fixtures
- test focus visibility, contrast, keyboard interaction, and reduced motion
- document how a game publishes its own theme package

### Exit gate

The default and second official themes render every supported primitive and
prebuilt GUI without component forks or copied base styles.

## Workstream G: Release Engineering and Validation

### CI gates

- frozen lockfile installation
- build and declaration generation
- unit and type-level tests
- supported Node, Bun, browser, and edge-runtime matrix
- standalone and MMORPG integration suites
- packed-package consumer tests
- documentation validation and broken-link checks
- coverage and security checks with documented thresholds
- protected `v5` branch and least-privilege publishing workflow

### Release sequence

1. Publish all current user-facing changes in the next beta, except that the
   physics package keeps its independent stable versioning policy.
2. Enter feature freeze. Only fixes, compatibility, tests, documentation, and
   release work are accepted.
3. Publish RC1 after the architecture, compatibility, bundle, Cloudflare, chat,
   and theme gates pass.
4. Validate real projects and publish RC2 with fixes only.
5. Exit Changesets prerelease mode and publish stable packages only after RC2
   upgrades require no user architecture changes.
6. Verify npm `latest`, changelogs, starters, migration documentation, and
   rollback procedures.

## GitHub Tracking Model

Create the milestone `RPGJS v5.0 Stable` and one epic issue for each workstream.
Sub-issues should describe independently verifiable outcomes rather than broad
activities. Suggested project states are:

```txt
Backlog -> Decision needed -> Ready -> In progress -> Validation -> Done
```

The Markdown roadmap owns scope and release gates. GitHub owns assignees,
discussion, scheduling, and current execution status. Avoid duplicating the
full roadmap text in issue descriptions.

## Work Deferred Until After v5.0

- additional battle systems
- new renderer families
- new map formats that do not validate an existing adapter contract
- voice chat and external chat services
- new Studio feature families
- speculative rewrites of DI, synchronization, or rendering foundations

Deferred work may proceed only when it does not delay or destabilize the
release gates above.
