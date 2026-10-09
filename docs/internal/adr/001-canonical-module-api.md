# ADR 001: Canonical Module API

- Status: Accepted
- Target: RPGJS v5 stable

## Context

RPGJS currently exposes decorated modules, `defineModule()`, `createModule()`,
client/server module providers, and feature-specific `provideX()` functions.
These mechanisms are compatible internally but present several competing paths
to users.

## Decision

- `defineModule()` is the canonical authoring API for gameplay modules.
- `provideX()` functions are the canonical installation and configuration API.
- `createServer()` and `startGame()` remain the application bootstrap APIs.
- `@RpgModule` remains supported throughout v5 as the v4 compatibility path.
- `createModule()` is documented as an advanced composition/DI tool rather than
  the first module concept taught to game authors.

The canonical module contract is runtime-specific:

- server definitions use `defineModule<RpgServer>()` and are installed with
  `provideServerModules()`
- client definitions use `defineModule<RpgClient>()` and are installed with
  `provideClientModules()`
- configurable framework features expose the same `provideFeature(options)`
  name from explicit `/server` and `/client` package entry points

Client and server files remain separate. A runtime entry point must not expose
or retain the implementation of the other runtime. Existing root exports may
remain as compatibility aliases during v5, but guides and starters use explicit
runtime entry points.

Feature providers may use `createModule()` internally while compatibility is
required, but this is not part of the normal gameplay-module authoring flow.

### Runtime ownership for map providers

A map format is integrated as two runtime-specific adapters:

- the server adapter reads the complete source map, builds authoritative physics,
  events and private configuration, then compiles client-safe render/physics chunks
- the client adapter renders only the chunks disclosed by the server and installs
  their collision geometry for local movement prediction

In standalone RPG mode, a client adapter may load the complete source directly.
In MMORPG mode, source maps and gameplay metadata stay on the server. The browser
must not fetch TMX, Studio documents, custom source maps, event definitions or
server properties. The manifest contains only renderer bootstrap metadata; chunk
packets contain the visible render delta and the corresponding prediction hitboxes.

This boundary is provider-independent. Tiled is the built-in implementation, while
Studio and custom formats implement the same server compiler and client state
adapter. Node.js and Cloudflare Durable Objects host the same server module; the
transport does not change map ownership.

Dynamic entities follow the same interest window. The authoritative room owns NPCs,
players, events and projectiles, sends a full snapshot when one enters interest, and
sends a removal when it leaves. Collision and projectile impact decisions remain
server-authoritative even though disclosed static geometry is available to client
prediction.

## Consequences

- guides, starters, and package READMEs need one consistent default pattern
- compatibility adapters must preserve decorated modules without changing hook behavior
- new modules must not introduce another installation convention
- DI remains available without becoming required knowledge for basic gameplay
- package entry points, rather than filename-only transforms, own the final
  client/server bundle boundary
- map providers cannot require the client to download their authoritative source
- room hosting adapters cannot change synchronization or gameplay ownership

## Validation

- one starter module covers maps, events, database, client components, and configuration
- the same module works in standalone and MMORPG modes
- a v4 decorated module and native v5 module can coexist
- packed `/client` and `/server` entry points contain no opposite-runtime code
- an MMORPG client build and its public asset directory contain no source map file
- crossing a chunk boundary adds/removes render data, prediction hitboxes and
  dynamic entities without changing authoritative server results
