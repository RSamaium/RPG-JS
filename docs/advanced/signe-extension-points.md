---
title: "Advanced Signe Extension Points"
description: "Understand when direct Signe APIs are appropriate in an RPGJS plugin."
---

# Advanced Signe Extension Points

RPGJS uses Signe internally for dependency injection, reactivity,
synchronization, and room coordination. Normal gameplay modules should use
RPGJS-owned contracts such as `RpgWritableSignal`, `RpgProvider`,
`RpgContext`, and the Node or Cloudflare adapters.

Direct Signe usage is intended only for advanced plugins that need capabilities
not represented by the stable RPGJS surface, such as defining a custom room
protocol or working with Signe-specific signal observables.

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
