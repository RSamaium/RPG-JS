---
title: "Advanced Signe Extension Points"
description: "Understand when direct Signe APIs are appropriate in an RPGJS plugin."
---

# Advanced Signe Extension Points

RPGJS uses Signe internally for dependency injection, reactivity,
synchronization, and room coordination. Normal gameplay modules should use
RPGJS-owned contracts such as `RpgWritableSignal`, `RpgProvider`,
`RpgContext`, and the Node or Cloudflare adapters.

## Prefer the stable RPGJS surface

Import stable provider and signal contracts from `@rpgjs/common`. This keeps
game code independent of the internal Signe version:

```ts
import type {
  RpgContext,
  RpgFactoryProvider,
  RpgWritableSignal,
} from "@rpgjs/common"

interface MatchmakingService {
  queue: RpgWritableSignal<string[]>
}

export const matchmakingProvider = {
  provide: "matchmaking",
  async useFactory(context: RpgContext): Promise<MatchmakingService> {
    return context.get<Promise<MatchmakingService>>("matchmaking-bootstrap")
  },
} satisfies RpgFactoryProvider<MatchmakingService>
```

Provider factories may be asynchronous. Object providers must specify exactly
one of `useValue`, `useClass`, `useFactory`, or `useExisting`.

Use the gameplay synchronization APIs described in
[Synchronization](/guide/synchronization) before reaching for low-level
signals. See [Migrate from v4 to v5](/migration/v4-to-v5) when replacing types
re-exported by an early v5 beta.

## When direct Signe usage is appropriate

Use Signe directly only when an advanced plugin needs behavior absent from the
stable RPGJS surface, such as:

- defining a custom room protocol;
- consuming Signe-specific signal observables;
- implementing reusable infrastructure whose public boundary stays
  independent of Signe.

```ts
import { signal } from "@signe/reactive";
import { sync } from "@signe/sync";

class PluginState {
  @sync() value = signal(0);
}
```

When a plugin imports `@signe/*` directly:

- declare every imported Signe package in the plugin's own dependencies;
- pin a compatible version instead of relying on RPGJS transitive dependencies;
- keep Signe-specific values behind the plugin boundary;
- expose RPGJS-owned or plugin-owned structural types to game code.

Direct Signe APIs follow Signe's compatibility lifecycle. They are not part of
the stable RPGJS gameplay compatibility promise. A Signe type intentionally
exposed by a future stable RPGJS API would instead be documented and versioned
as an RPGJS public contract.
