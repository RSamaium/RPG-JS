---
title: "Creating Modules in RPGJS"
description: "Guide for Creating Modules in RPGJS in RPGJS."
---

# Creating Modules in RPGJS

This guide explains the canonical RPGJS module pattern. `defineModule()` authors
runtime behavior and `provideServerModules()` or `provideClientModules()` installs it.

## Module Structure

A module that runs on both sides consists of two explicit files:

- `server.ts` - Server-side logic and hooks
- `client.ts` - Client-side logic and hooks

Code used by both runtimes can live in a separate `shared.ts` file.

## Bundle ownership

The entry point that imports a module determines which bundle contains it. The
file name makes ownership clear, but it does not override an explicit import.

| Module file | MMORPG browser bundle | MMORPG server bundle | Standalone browser bundle |
| --- | --- | --- | --- |
| `client.ts` | Included | Excluded | Included |
| `server.ts` | Excluded | Included | Included |
| `shared.ts` | Included when imported | Included when imported | Included when imported |

In MMORPG mode, install `server.ts` only from the server bootstrap and
`client.ts` only from the client configuration. The browser build then excludes
the server module and its imports.

<Warning>
Standalone mode runs the RPGJS server in the browser. Its bundle therefore
contains both client and server modules. Never place credentials, private keys,
service tokens, or other secrets in a game compiled for standalone mode.
</Warning>

Follow these boundaries when structuring a module:

- do not import `server.ts` from `client.ts`
- do not import an `index.ts` that eagerly imports both runtimes from browser code
- keep `shared.ts` limited to types, serializable data, constants, and logic safe
  to expose to a browser
- keep authoritative validation for movement, combat, inventory, and saves on
  the server, even when the implementation is absent from the client bundle

Reusable packages should expose separate `/client` and `/server` entry points
instead of asking applications to import a combined runtime entry.

## Step 1: Define Server-Side Module

Create a `server.ts` file using `defineModule` to define server-side behavior:

```typescript
import { RpgPlayer, defineModule, type RpgServer } from "@rpgjs/server";

export default defineModule<RpgServer>({
    player: {},
})
```

## Step 2: Define Client-Side Module

Create a `client.ts` file using `defineModule` for client-side logic:

```typescript
import { defineModule, type RpgClient } from "@rpgjs/client";

export default defineModule<RpgClient>({
    // Client-side hooks and logic
    // Add your client-side event handlers here
})
```

## Step 3: Install Each Runtime Module

Install the server definition in `server.ts`:

```typescript
import { createServer, provideServerModules } from "@rpgjs/server";
import battleServer from "./modules/battle/server";

export default createServer({
  providers: [provideServerModules([battleServer])]
});
```

Install the client definition in the shared client configuration:

```typescript
import { provideClientModules } from "@rpgjs/client";
import battleClient from "./modules/battle/client";

export default {
  providers: [provideClientModules([battleClient])]
};
```

Standalone and MMORPG clients use this same client configuration. In MMORPG
mode, the server definition is built separately and remains authoritative for
gameplay state. In standalone mode, that definition executes in the browser.

Reusable packages should expose a `provideFeature(options)` function from
explicit `/server` and `/client` entry points. Direct DI composition with
`createModule()` remains available for advanced integrations, but is not needed
for ordinary gameplay modules.
